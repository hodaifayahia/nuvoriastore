import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Truck, Plus, Pencil, Trash2, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryCompany {
  id: string;
  name: string;
  api_key: string | null;
  api_url: string | null;
  is_active: boolean;
  is_builtin: boolean;
  logo_url: string | null;
  created_at: string;
}

export default function AdminDeliveryPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editCompany, setEditCompany] = useState<DeliveryCompany | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', api_key: '', api_url: '' });

  const { data: companies, isLoading } = useQuery({
    queryKey: ['delivery-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_companies' as any)
        .select('*')
        .order('is_builtin', { ascending: false })
        .order('name');
      if (error) throw error;
      const rows = (data || []) as any[];
      const ids = rows.map(r => r.id);
      let credMap: Record<string, string | null> = {};
      if (ids.length) {
        const { data: creds } = await supabase
          .from('delivery_company_credentials' as any)
          .select('delivery_company_id, api_key')
          .in('delivery_company_id', ids);
        (creds || []).forEach((c: any) => { credMap[c.delivery_company_id] = c.api_key; });
      }
      return rows.map(r => ({ ...r, api_key: credMap[r.id] ?? null })) as DeliveryCompany[];
    },
  });

  const saveCredential = async (companyId: string, apiKey: string) => {
    if (apiKey && apiKey.trim().length > 0) {
      const { error } = await (supabase.from('delivery_company_credentials' as any) as any)
        .upsert({ delivery_company_id: companyId, api_key: apiKey.trim() }, { onConflict: 'delivery_company_id' });
      if (error) throw error;
    } else {
      await (supabase.from('delivery_company_credentials' as any) as any)
        .delete().eq('delivery_company_id', companyId);
    }
  };

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from('delivery_companies' as any) as any).update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-companies'] });
      toast.success(t('common.savedSuccess'));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addCompany = useMutation({
    mutationFn: async (data: { name: string; api_key: string; api_url: string }) => {
      const { data: inserted, error } = await (supabase.from('delivery_companies' as any) as any).insert({
        name: data.name,
        api_url: data.api_url || null,
        is_builtin: false,
      }).select('id').single();
      if (error) throw error;
      if (data.api_key) await saveCredential(inserted.id, data.api_key);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-companies'] });
      setShowAdd(false);
      setForm({ name: '', api_key: '', api_url: '' });
      toast.success(t('delivery.companyAdded'));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCompany = useMutation({
    mutationFn: async (data: { id: string; name: string; api_key: string; api_url: string }) => {
      const { error } = await (supabase.from('delivery_companies' as any) as any)
        .update({ name: data.name, api_url: data.api_url || null })
        .eq('id', data.id);
      if (error) throw error;
      await saveCredential(data.id, data.api_key);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-companies'] });
      setEditCompany(null);
      toast.success(t('common.savedSuccess'));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('delivery_companies' as any) as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-companies'] });
      toast.success(t('common.deletedSuccess'));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAdd = () => {
    if (!form.name.trim()) { toast.error(t('common.required')); return; }
    addCompany.mutate(form);
  };

  const handleUpdate = () => {
    if (!editCompany) return;
    updateCompany.mutate({
      id: editCompany.id,
      name: editCompany.name,
      api_key: editCompany.api_key || '',
      api_url: editCompany.api_url || '',
    });
  };

  if (isLoading) return <p className="p-4 font-cairo">{t('common.loading')}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-cairo font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            {t('delivery.title')}
          </h1>
          <p className="text-sm text-muted-foreground font-cairo mt-1">{t('delivery.description')}</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="font-cairo gap-2">
          <Plus className="w-4 h-4" /> {t('delivery.addCompany')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies?.map(c => (
          <Card key={c.id} className={`transition-opacity ${!c.is_active ? 'opacity-50' : ''}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-cairo font-bold text-base">{c.name}</h3>
                  {c.is_builtin && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-cairo">
                      {t('delivery.builtin')}
                    </span>
                  )}
                </div>
                <Switch
                  checked={c.is_active}
                  onCheckedChange={(v) => toggleActive.mutate({ id: c.id, is_active: v })}
                />
              </div>

              <div className="space-y-1.5 text-xs font-cairo text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  {c.api_key ? (
                    <><Wifi className="w-3.5 h-3.5 text-green-500" /> {t('delivery.connected')}</>
                  ) : (
                    <><WifiOff className="w-3.5 h-3.5 text-muted-foreground" /> {t('delivery.notConnected')}</>
                  )}
                </div>
                {c.api_url && <p className="truncate">{c.api_url}</p>}
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="font-cairo gap-1 text-xs"
                  onClick={() => setEditCompany({ ...c })}
                >
                  <Pencil className="w-3 h-3" /> {t('common.edit')}
                </Button>
                {!c.is_builtin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="font-cairo gap-1 text-xs text-destructive"
                    onClick={() => {
                      if (confirm(t('delivery.deleteConfirm'))) deleteCompany.mutate(c.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" /> {t('common.delete')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-cairo">{t('delivery.addCompany')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-cairo">{t('common.name')} *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-cairo" />
            </div>
            <div>
              <Label className="font-cairo">API Key</Label>
              <Input value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} placeholder={t('common.optional')} />
            </div>
            <div>
              <Label className="font-cairo">API URL</Label>
              <Input value={form.api_url} onChange={e => setForm(f => ({ ...f, api_url: e.target.value }))} placeholder="https://..." />
            </div>
            <Button onClick={handleAdd} disabled={addCompany.isPending} className="w-full font-cairo">{t('common.add')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCompany} onOpenChange={o => !o && setEditCompany(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-cairo">{t('common.edit')}</DialogTitle></DialogHeader>
          {editCompany && (
            <div className="space-y-4">
              <div>
                <Label className="font-cairo">{t('common.name')} *</Label>
                <Input value={editCompany.name} onChange={e => setEditCompany(c => c ? { ...c, name: e.target.value } : null)} className="font-cairo" />
              </div>
              <div>
                <Label className="font-cairo">API Key</Label>
                <Input value={editCompany.api_key || ''} onChange={e => setEditCompany(c => c ? { ...c, api_key: e.target.value } : null)} />
              </div>
              <div>
                <Label className="font-cairo">API URL</Label>
                <Input value={editCompany.api_url || ''} onChange={e => setEditCompany(c => c ? { ...c, api_url: e.target.value } : null)} />
              </div>
              <Button onClick={handleUpdate} disabled={updateCompany.isPending} className="w-full font-cairo">{t('common.save')}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
