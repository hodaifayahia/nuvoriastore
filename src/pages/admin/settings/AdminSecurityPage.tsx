import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Shield, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminUserManagement from '@/components/admin/AdminUserManagement';


export default function AdminSecurityPage() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [guestLimit, setGuestLimit] = useState<number>(2);
  const [loadingLimit, setLoadingLimit] = useState(true);
  const [savingLimit, setSavingLimit] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'guest_order_limit').maybeSingle();
      const n = parseInt((data as any)?.value ?? '', 10);
      if (!isNaN(n) && n > 0) setGuestLimit(n);
      setLoadingLimit(false);
    })();
  }, []);

  const saveGuestLimit = async () => {
    if (!Number.isInteger(guestLimit) || guestLimit < 1 || guestLimit > 20) {
      toast({ title: 'الرجاء إدخال رقم بين 1 و 20', variant: 'destructive' });
      return;
    }
    setSavingLimit(true);
    const { error } = await supabase.from('settings').upsert(
      { key: 'guest_order_limit', value: String(guestLimit) },
      { onConflict: 'key' }
    );
    setSavingLimit(false);
    if (error) toast({ title: 'فشل الحفظ', description: error.message, variant: 'destructive' });
    else toast({ title: 'تم الحفظ ✅' });
  };


  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="font-cairo font-bold text-xl">تغيير كلمة المرور</h2>
        </div>
        <div>
          <Label className="font-cairo">كلمة المرور الحالية</Label>
          <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="font-roboto mt-1" dir="ltr" />
        </div>
        <div>
          <Label className="font-cairo">كلمة المرور الجديدة</Label>
          <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="font-roboto mt-1" dir="ltr" />
        </div>
        <div>
          <Label className="font-cairo">تأكيد كلمة المرور الجديدة</Label>
          <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="font-roboto mt-1" dir="ltr" />
        </div>
        <Button
          disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
          className="font-cairo font-semibold gap-2"
          onClick={async () => {
            if (newPassword !== confirmPassword) {
              toast({ title: 'كلمة المرور الجديدة غير متطابقة', variant: 'destructive' });
              return;
            }
            if (newPassword.length < 6) {
              toast({ title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
              return;
            }
            setChangingPassword(true);
            const { data: { user } } = await supabase.auth.getUser();
            const { error: signInErr } = await supabase.auth.signInWithPassword({
              email: user?.email || '',
              password: currentPassword,
            });
            if (signInErr) {
              toast({ title: 'كلمة المرور الحالية غير صحيحة', variant: 'destructive' });
              setChangingPassword(false);
              return;
            }
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            setChangingPassword(false);
            if (error) {
              toast({ title: 'فشل تغيير كلمة المرور', description: error.message, variant: 'destructive' });
            } else {
              toast({ title: 'تم تغيير كلمة المرور بنجاح ✅' });
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }
          }}
        >
          <Shield className="w-4 h-4" />
          {changingPassword ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
        </Button>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-cairo font-bold text-xl">حد طلبات الزوار (بدون تسجيل)</h2>
        </div>
        <p className="text-sm text-muted-foreground font-cairo">
          الحد الأقصى لعدد الطلبات المسموح بها لنفس رقم الهاتف قبل مطالبة الزائر بإنشاء حساب.
        </p>
        <div className="flex items-end gap-3">
          <div className="w-40">
            <Label className="font-cairo">عدد الطلبات المسموح بها</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={guestLimit}
              onChange={e => setGuestLimit(parseInt(e.target.value, 10) || 0)}
              disabled={loadingLimit}
              className="mt-1"
              dir="ltr"
            />
          </div>
          <Button onClick={saveGuestLimit} disabled={savingLimit || loadingLimit} className="font-cairo font-semibold">
            {savingLimit ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </div>

      <AdminUserManagement toast={toast} />
    </div>
  );
}

