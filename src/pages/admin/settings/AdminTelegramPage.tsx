import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, Bot, Plus, Send, Webhook, X, RefreshCw } from 'lucide-react';
import { useAdminSettings } from '@/hooks/useAdminSettings';

// Supabase project the website reads (e.g. "gppdjfjvceciejnyzxem").
const SITE_PROJECT_REF = (() => {
  try {
    return new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0];
  } catch {
    return '';
  }
})();

type WebhookCheck =
  | { status: 'idle' | 'checking' | 'no_token' }
  | { status: 'error'; message: string }
  | { status: 'done'; url: string; botRef: string; lastError?: string; pending: number };

export default function AdminTelegramPage() {
  const qc = useQueryClient();
  const { isLoading, mergedSettings, form, updateSetting, handleSave, setField, toast } = useAdminSettings();
  const [newChatId, setNewChatId] = useState('');
  const [testingSend, setTestingSend] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);

  const [webhookCheck, setWebhookCheck] = useState<WebhookCheck>({ status: 'idle' });
  const botToken = (mergedSettings.telegram_bot_token || '').trim();

  // Ask Telegram where it delivers this bot's messages. If that URL belongs to
  // another Supabase project, the bot reads a different database than the site.
  const checkWebhook = useCallback(async () => {
    if (!botToken) { setWebhookCheck({ status: 'no_token' }); return; }
    setWebhookCheck({ status: 'checking' });
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const data: {
        ok: boolean;
        description?: string;
        result?: { url?: string; last_error_message?: string; pending_update_count?: number };
      } = await res.json();
      if (!data?.ok) {
        setWebhookCheck({ status: 'error', message: data?.description || 'Telegram رفض التوكن' });
        return;
      }
      const url: string = data.result?.url || '';
      let botRef = '';
      try { botRef = url ? new URL(url).hostname.split('.')[0] : ''; } catch { botRef = ''; }
      setWebhookCheck({
        status: 'done',
        url,
        botRef,
        lastError: data.result?.last_error_message,
        pending: data.result?.pending_update_count || 0,
      });
    } catch (e) {
      setWebhookCheck({ status: 'error', message: e instanceof Error ? e.message : 'تعذر الاتصال بتلغرام' });
    }
  }, [botToken]);

  useEffect(() => {
    if (!isLoading) checkWebhook();
  }, [isLoading, checkWebhook]);

  const chatIds = (mergedSettings.telegram_chat_id || '').split(',').map(id => id.trim()).filter(Boolean);

  const addChatId = () => {
    const id = newChatId.trim();
    if (!id) return;
    if (chatIds.includes(id)) { setNewChatId(''); return; }
    const updated = [...chatIds, id].join(',');
    setField('telegram_chat_id', updated);
    setNewChatId('');
  };

  const removeChatId = (id: string) => {
    const updated = chatIds.filter(c => c !== id).join(',');
    setField('telegram_chat_id', updated);
  };

  const saveFormFirst = async () => {
    if (Object.keys(form).length > 0) {
      const entries = Object.entries(form).map(([key, value]) => ({ key, value }));
      for (const entry of entries) {
        const { data } = await supabase.from('settings').update({ value: entry.value }).eq('key', entry.key).select();
        if (!data || data.length === 0) {
          await supabase.from('settings').insert({ key: entry.key, value: entry.value });
        }
      }
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
    }
  };

  const reasonLabel = (r?: string) => {
    switch (r) {
      case 'disabled': return 'البوت غير مفعّل — قم بتفعيله أولاً وحفظ الإعدادات';
      case 'no_config': return 'التوكن أو Chat ID غير مُعدّ. أضف Bot Token ومعرّف واحد على الأقل ثم احفظ';
      case 'orders_disabled': return 'إشعارات الطلبات معطّلة';
      case 'unknown_type': return 'نوع الطلب غير معروف';
      case 'Unauthorized': return 'يجب تسجيل الدخول كمسؤول';
      case 'Forbidden': return 'صلاحيات المسؤول مطلوبة';
      default: return r || 'خطأ غير معروف';
    }
  };

  const handleTestNotification = async () => {
    setTestingSend(true);
    try {
      await saveFormFirst();
      const res = await supabase.functions.invoke('telegram-notify', { body: { type: 'test' } });
      const data: any = res.data;
      if (res.error) {
        toast({ title: 'فشل الاتصال بتلغرام', description: res.error.message || 'تحقق من التوكن والإعدادات', variant: 'destructive' });
      } else if (data?.ok) {
        // Also check telegram API results (e.g. wrong chat_id returns 400)
        const failed = Array.isArray(data.results) ? data.results.filter((r: any) => r && r.ok === false) : [];
        if (failed.length > 0) {
          toast({ title: 'فشل الإرسال', description: failed[0]?.description || 'تحقق من Chat ID والتوكن', variant: 'destructive' });
        } else {
          toast({ title: 'تم إرسال الرسالة التجريبية ✅' });
        }
      } else {
        toast({ title: 'فشل الإرسال', description: reasonLabel(data?.reason || data?.error), variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'خطأ في الإرسال', description: e?.message || 'حاول مجددًا', variant: 'destructive' });
    } finally {
      setTestingSend(false);
    }
  };

  // Point Telegram straight at this site's telegram-bot function, so the bot
  // always reads the same Supabase project as the website.
  const handleSetWebhook = async () => {
    if (!botToken) {
      toast({ title: 'فشل ربط الويب هوك', description: 'أضف Bot Token أولاً', variant: 'destructive' });
      return;
    }
    setSettingWebhook(true);
    try {
      await saveFormFirst();
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data: { ok: boolean; description?: string } = await res.json();
      if (data?.ok) {
        toast({ title: 'تم ربط الويب هوك بنجاح ✅' });
      } else {
        toast({ title: 'فشل ربط الويب هوك', description: data?.description || 'تحقق من التوكن', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'خطأ في ربط الويب هوك', description: e instanceof Error ? e.message : 'حاول مجددًا', variant: 'destructive' });
    } finally {
      setSettingWebhook(false);
      checkWebhook();
    }
  };


  if (isLoading) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="font-cairo font-bold text-xl">بوت تلغرام</h2>
        </div>
        <p className="font-cairo text-sm text-muted-foreground">إدارة المتجر عبر تلغرام واستقبال إشعارات الطلبات الجديدة</p>
        <div className="flex items-center gap-2">
          <Switch checked={mergedSettings.telegram_enabled === 'true'} onCheckedChange={v => setField('telegram_enabled', String(v))} />
          <Label className="font-cairo">تفعيل بوت تلغرام</Label>
        </div>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="font-cairo text-sm text-muted-foreground p-0 h-auto">
              🔑 إعدادات التوكن (اضغط للعرض)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Label className="font-cairo text-sm">Bot Token (من @BotFather)</Label>
            <Input type="password" value={mergedSettings.telegram_bot_token || ''} onChange={e => setField('telegram_bot_token', e.target.value)} className="font-roboto mt-1" dir="ltr" placeholder="123456:ABC-DEF..." />
          </CollapsibleContent>
        </Collapsible>
        <div className="space-y-2">
          <Label className="font-cairo">معرّفات المسؤولين (Chat IDs)</Label>
          <div className="flex flex-wrap gap-2">
            {chatIds.map(id => (
              <Badge key={id} variant="secondary" className="font-roboto gap-1 px-3 py-1">
                {id}
                <button onClick={() => removeChatId(id)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newChatId} onChange={e => setNewChatId(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChatId()} placeholder="أضف Chat ID" className="font-roboto" dir="ltr" />
            <Button variant="outline" size="icon" onClick={addChatId}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={mergedSettings.telegram_notify_orders !== 'false'} onCheckedChange={v => setField('telegram_notify_orders', String(v))} />
          <Label className="font-cairo">إشعار عند طلب جديد</Label>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" onClick={handleTestNotification} disabled={testingSend} className="font-cairo gap-2">
            <Send className="w-4 h-4" />
            {testingSend ? 'جاري الإرسال...' : 'إرسال رسالة تجريبية'}
          </Button>
          <Button variant="outline" onClick={handleSetWebhook} disabled={settingWebhook} className="font-cairo gap-2">
            <Webhook className="w-4 h-4" />
            {settingWebhook ? 'جاري الربط...' : 'ربط الويب هوك'}
          </Button>
        </div>
        <WebhookStatus check={webhookCheck} onRefresh={checkWebhook} />
      </div>

      <Button onClick={handleSave} disabled={updateSetting.isPending || Object.keys(form).length === 0} className="font-cairo font-semibold gap-2">
        <Save className="w-4 h-4" />
        {updateSetting.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </Button>
    </div>
  );
}

function WebhookStatus({ check, onRefresh }: { check: WebhookCheck; onRefresh: () => void }) {
  let tone = 'border-muted bg-muted/40';
  let body: ReactNode = null;

  if (check.status === 'checking' || check.status === 'idle') {
    body = <p>جاري التحقق من قاعدة بيانات البوت...</p>;
  } else if (check.status === 'no_token') {
    body = <p>أضف Bot Token واحفظ الإعدادات للتحقق من قاعدة بيانات البوت.</p>;
  } else if (check.status === 'error') {
    tone = 'border-destructive/50 bg-destructive/10';
    body = <p>تعذر التحقق: <span dir="ltr">{check.message}</span></p>;
  } else if (check.status === 'done' && !check.url) {
    tone = 'border-destructive/50 bg-destructive/10';
    body = <p>❌ البوت غير مربوط بأي خادم. اضغط <b>ربط الويب هوك</b>.</p>;
  } else if (check.status === 'done' && check.botRef !== SITE_PROJECT_REF) {
    tone = 'border-destructive/50 bg-destructive/10';
    body = (
      <>
        <p>❌ البوت يقرأ قاعدة بيانات مختلفة عن الموقع، لذلك الطلبات غير متطابقة.</p>
        <p>قاعدة بيانات الموقع: <b dir="ltr">{SITE_PROJECT_REF}</b></p>
        <p>قاعدة بيانات البوت: <b dir="ltr">{check.botRef || check.url}</b></p>
        <p>الحل: اضغط <b>ربط الويب هوك</b> أعلاه.</p>
      </>
    );
  } else if (check.status === 'done' && check.lastError) {
    tone = 'border-amber-500/50 bg-amber-500/10';
    body = (
      <>
        <p>⚠️ البوت مربوط بنفس قاعدة بيانات الموقع (<b dir="ltr">{SITE_PROJECT_REF}</b>) لكن تلغرام أبلغ عن خطأ:</p>
        <p dir="ltr" className="font-roboto">{check.lastError}</p>
        <p>إذا كان الخطأ 401 أو 404 فيجب نشر دالة telegram-bot في Supabase (راجع docs/telegram-deploy.md).</p>
      </>
    );
  } else {
    tone = 'border-green-600/40 bg-green-600/10';
    body = <p>✅ البوت والموقع يستخدمان نفس قاعدة البيانات (<b dir="ltr">{SITE_PROJECT_REF}</b>).</p>;
  }

  return (
    <div className={`border rounded-md p-3 font-cairo text-sm space-y-1 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">قاعدة بيانات البوت</span>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={check.status === 'checking'} className="h-7 gap-1 font-cairo">
          <RefreshCw className="w-3 h-3" /> تحقق
        </Button>
      </div>
      {body}
    </div>
  );
}
