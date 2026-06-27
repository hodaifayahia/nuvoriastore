import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useBrands, type Brand } from '@/hooks/useBrands';
import { Plus, Trash2, Pencil, Tag, Upload, Loader2, Check, X, Award } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function AdminBrandsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: brandsData } = useBrands();

  const [brands, setBrands] = useState<Brand[] | null>(null);
  const current = brands ?? brandsData ?? [];

  const [newName, setNewName] = useState('');
  const [newImage, setNewImage] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editImage, setEditImage] = useState<string | undefined>();
  const [editUploading, setEditUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (list: Brand[]) => {
      const value = JSON.stringify(list);
      const { data } = await supabase.from('settings').select('id').eq('key', 'brands').maybeSingle();
      if (data) {
        await supabase.from('settings').update({ value }).eq('key', 'brands');
      } else {
        await supabase.from('settings').insert({ key: 'brands', value });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: t('common.savedSuccess') });
    },
    onError: () => toast({ title: t('common.errorOccurred'), variant: 'destructive' }),
  });

  const upload = async (file: File): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) throw new Error('Image too large (max 5MB)');
    const ext = file.name.split('.').pop();
    const path = `brands/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('store').upload(path, file);
    if (error) throw error;
    return supabase.storage.from('store').getPublicUrl(path).data.publicUrl;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setU = mode === 'new' ? setUploading : setEditUploading;
    setU(true);
    try {
      const url = await upload(file);
      if (mode === 'new') setNewImage(url); else setEditImage(url);
    } catch (err: any) {
      toast({ title: err.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setU(false);
      e.target.value = '';
    }
  };

  const addBrand = () => {
    const name = newName.trim();
    if (!name) return;
    if (current.some(b => b.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: 'Brand already exists', variant: 'destructive' });
      return;
    }
    const updated = [...current, { name, image: newImage || null }];
    setBrands(updated);
    saveMutation.mutate(updated);
    setNewName('');
    setNewImage(undefined);
  };

  const removeBrand = (i: number) => {
    const updated = current.filter((_, idx) => idx !== i);
    setBrands(updated);
    saveMutation.mutate(updated);
  };

  const startEdit = (i: number) => {
    setEditIndex(i);
    setEditName(current[i].name);
    setEditImage(current[i].image || undefined);
  };

  const cancelEdit = () => { setEditIndex(null); setEditName(''); setEditImage(undefined); };

  const saveEdit = () => {
    if (editIndex === null) return;
    const name = editName.trim();
    if (!name) return;
    const updated = current.map((b, i) => i === editIndex ? { name, image: editImage || null } : b);
    setBrands(updated);
    saveMutation.mutate(updated);
    cancelEdit();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Award className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-cairo font-bold text-2xl">{t('brands.title')}</h2>
          <p className="font-cairo text-sm text-muted-foreground">{t('brands.subtitle')}</p>
        </div>
        <div className="ms-auto bg-primary/10 text-primary font-cairo font-bold text-sm px-4 py-2 rounded-full">
          {current.length}
        </div>
      </div>

      {/* Add */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <h3 className="font-cairo font-semibold text-base mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          {t('brands.addNew')}
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Label className="font-cairo text-xs text-muted-foreground">{t('brands.brandName')}</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Apple, Samsung..." className="font-cairo mt-1.5 h-11" onKeyDown={e => e.key === 'Enter' && addBrand()} />
            </div>
            <Button onClick={addBrand} disabled={saveMutation.isPending || !newName.trim()} className="font-cairo gap-1.5 h-11 px-6 w-full sm:w-auto">
              <Plus className="w-4 h-4" /> {t('common.add')}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Label className="font-cairo text-xs text-muted-foreground shrink-0">{t('brands.brandLogo')}</Label>
            {newImage ? (
              <div className="flex items-center gap-2">
                <img src={newImage} alt="" className="w-12 h-12 rounded-lg object-contain bg-white border p-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setNewImage(undefined)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, 'new')} disabled={uploading} />
                <Button variant="outline" size="sm" className="font-cairo gap-1.5 pointer-events-none" disabled={uploading}>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? '...' : t('brands.uploadLogo')}
                </Button>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-muted/30">
          <h3 className="font-cairo font-semibold text-sm text-muted-foreground">{t('brands.list')}</h3>
        </div>
        {current.length > 0 ? (
          <div className="divide-y">
            {current.map((b, i) => {
              const isEditing = editIndex === i;
              if (isEditing) {
                return (
                  <div key={i} className="px-5 py-3 bg-primary/5 space-y-2">
                    <div className="flex items-center gap-3">
                      {editImage ? (
                        <img src={editImage} alt="" className="w-10 h-10 rounded-lg object-contain bg-white border p-1" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Award className="w-4 h-4 text-primary" /></div>
                      )}
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="font-cairo h-9 flex-1" autoFocus />
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, 'edit')} disabled={editUploading} />
                        <Button variant="outline" size="sm" className="font-cairo gap-1 pointer-events-none h-8" disabled={editUploading}>
                          {editUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        </Button>
                      </label>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={saveEdit}><Check className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {b.image ? (
                      <img src={b.image} alt={b.name} className="w-10 h-10 rounded-lg object-contain bg-white border p-1" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Award className="w-4 h-4 text-primary" /></div>
                    )}
                    <span className="font-cairo font-medium">{b.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(i)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeBrand(i)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center text-muted-foreground font-cairo">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {t('brands.empty')}
          </div>
        )}
      </div>
    </div>
  );
}
