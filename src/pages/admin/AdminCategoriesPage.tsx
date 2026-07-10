import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';
import {
  Plus, Trash2, Pencil, Home, Sparkles, Watch, ShoppingBag, Gift, Star, Heart, Shirt, Layers, Check, X,
  Upload, ImageIcon, Loader2, ListTree,
  Laptop, Smartphone, Car, Utensils, Baby, Headphones, Camera, Sofa, Dumbbell, Palette,
  Book, Gem, Zap, Flame, Leaf, Music, Plane, Pizza, Coffee, Glasses, Footprints, Dog,
  Wrench, Gamepad2, Crown, Flower2, Bike, Briefcase, Stethoscope
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from '@/i18n';

const AVAILABLE_ICONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'Home', label: 'منزل', Icon: Home },
  { value: 'Sparkles', label: 'زينة', Icon: Sparkles },
  { value: 'Watch', label: 'ساعة', Icon: Watch },
  { value: 'ShoppingBag', label: 'حقيبة', Icon: ShoppingBag },
  { value: 'Gift', label: 'هدية', Icon: Gift },
  { value: 'Star', label: 'نجمة', Icon: Star },
  { value: 'Heart', label: 'قلب', Icon: Heart },
  { value: 'Shirt', label: 'ملابس', Icon: Shirt },
  { value: 'Laptop', label: 'حاسوب', Icon: Laptop },
  { value: 'Smartphone', label: 'هاتف', Icon: Smartphone },
  { value: 'Car', label: 'سيارة', Icon: Car },
  { value: 'Utensils', label: 'مطبخ', Icon: Utensils },
  { value: 'Baby', label: 'أطفال', Icon: Baby },
  { value: 'Headphones', label: 'سماعات', Icon: Headphones },
  { value: 'Camera', label: 'كاميرا', Icon: Camera },
  { value: 'Sofa', label: 'أثاث', Icon: Sofa },
  { value: 'Dumbbell', label: 'رياضة', Icon: Dumbbell },
  { value: 'Palette', label: 'فن', Icon: Palette },
  { value: 'Book', label: 'كتاب', Icon: Book },
  { value: 'Gem', label: 'مجوهرات', Icon: Gem },
  { value: 'Zap', label: 'كهرباء', Icon: Zap },
  { value: 'Flame', label: 'نار', Icon: Flame },
  { value: 'Leaf', label: 'طبيعة', Icon: Leaf },
  { value: 'Music', label: 'موسيقى', Icon: Music },
  { value: 'Plane', label: 'سفر', Icon: Plane },
  { value: 'Pizza', label: 'طعام', Icon: Pizza },
  { value: 'Coffee', label: 'قهوة', Icon: Coffee },
  { value: 'Glasses', label: 'نظارات', Icon: Glasses },
  { value: 'Footprints', label: 'أحذية', Icon: Footprints },
  { value: 'Dog', label: 'حيوانات', Icon: Dog },
  { value: 'Wrench', label: 'أدوات', Icon: Wrench },
  { value: 'Gamepad2', label: 'ألعاب', Icon: Gamepad2 },
  { value: 'Crown', label: 'فاخر', Icon: Crown },
  { value: 'Flower2', label: 'زهور', Icon: Flower2 },
  { value: 'Bike', label: 'دراجة', Icon: Bike },
  { value: 'Briefcase', label: 'عمل', Icon: Briefcase },
  { value: 'Stethoscope', label: 'صحة', Icon: Stethoscope },
];

type Subcategory = { name: string; image?: string };
type Category = { name: string; icon: string; image?: string; subcategories?: Subcategory[] };

export default function AdminCategoriesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: categoriesData } = useCategories();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('Home');
  const [newImage, setNewImage] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Home');
  const [editImage, setEditImage] = useState<string | undefined>();
  const [editUploading, setEditUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<number | null>(null);
  const [subDialog, setSubDialog] = useState<number | null>(null);
  const [subNewName, setSubNewName] = useState('');
  const [subNewImage, setSubNewImage] = useState<string | undefined>();
  const [subUploading, setSubUploading] = useState(false);

  const currentCategories = categories ?? categoriesData ?? [];

  useEffect(() => {
    if (categoriesData && !categories) {
      // don't override local changes
    }
  }, [categoriesData]);

  const saveMutation = useMutation({
    mutationFn: async (cats: Category[]) => {
      const value = JSON.stringify(cats);
      const { data } = await supabase.from('settings').select('id').eq('key', 'categories').maybeSingle();
      if (data) {
        await supabase.from('settings').update({ value }).eq('key', 'categories');
      } else {
        await supabase.from('settings').insert({ key: 'categories', value });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: t('common.savedSuccess') });
    },
    onError: () => {
      toast({ title: t('common.errorOccurred'), variant: 'destructive' });
    },
  });

  const uploadImage = async (file: File): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) throw new Error(t('categories.imageTooLarge'));
    const ext = file.name.split('.').pop();
    const path = `categories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('store').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('store').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleNewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setNewImage(url);
      toast({ title: t('categories.imageUploaded') });
    } catch (err: any) {
      toast({ title: err.message || t('categories.imageFailed'), variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUploading(true);
    try {
      const url = await uploadImage(file);
      setEditImage(url);
      toast({ title: t('categories.imageUploaded') });
    } catch (err: any) {
      toast({ title: err.message || t('categories.imageFailed'), variant: 'destructive' });
    } finally {
      setEditUploading(false);
      e.target.value = '';
    }
  };

  const addCategory = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (currentCategories.some(c => c.name === trimmed)) {
      toast({ title: t('categories.alreadyExists'), variant: 'destructive' });
      return;
    }
    const updated = [...currentCategories, { name: trimmed, icon: newIcon, image: newImage }];
    setCategories(updated);
    saveMutation.mutate(updated);
    setNewName('');
    setNewIcon('Home');
    setNewImage(undefined);
  };

  const removeCategory = (index: number) => {
    const updated = currentCategories.filter((_, i) => i !== index);
    setCategories(updated);
    saveMutation.mutate(updated);
    setDeleteDialog(null);
  };

  const startEdit = (index: number) => {
    setEditIndex(index);
    setEditName(currentCategories[index].name);
    setEditIcon(currentCategories[index].icon);
    setEditImage(currentCategories[index].image);
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setEditName('');
    setEditIcon('Home');
    setEditImage(undefined);
  };

  const saveEdit = () => {
    if (editIndex === null) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (currentCategories.some((c, i) => c.name === trimmed && i !== editIndex)) {
      toast({ title: t('categories.alreadyExists'), variant: 'destructive' });
      return;
    }
    const updated = currentCategories.map((c, i) =>
      i === editIndex ? { name: trimmed, icon: editIcon, image: editImage } : c
    );
    setCategories(updated);
    saveMutation.mutate(updated);
    cancelEdit();
  };

  const SelectedIcon = AVAILABLE_ICONS.find(i => i.value === newIcon)?.Icon || Home;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-cairo font-bold text-2xl text-foreground">{t('categories.title')}</h2>
            <p className="font-cairo text-sm text-muted-foreground">{t('categories.subtitle')}</p>
          </div>
        </div>
        <div className="bg-primary/10 text-primary font-cairo font-bold text-sm px-4 py-2 rounded-full">
          {t('categories.count').replace('{n}', String(currentCategories.length))}
        </div>
      </div>

      {/* Add new category */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <h3 className="font-cairo font-semibold text-base mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          {t('categories.addNew')}
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Label className="font-cairo text-xs text-muted-foreground">{t('categories.categoryName')}</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('categories.namePlaceholder')} className="font-cairo mt-1.5 h-11" onKeyDown={e => e.key === 'Enter' && addCategory()} />
            </div>
            <div className="w-full sm:w-40">
              <Label className="font-cairo text-xs text-muted-foreground">{t('categories.icon')}</Label>
              <Select value={newIcon} onValueChange={setNewIcon}>
                <SelectTrigger className="mt-1.5 h-11">
                  <div className="flex items-center gap-2">
                    <SelectedIcon className="w-4 h-4 text-primary" />
                    <span className="font-cairo text-sm">{AVAILABLE_ICONS.find(i => i.value === newIcon)?.label}</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {AVAILABLE_ICONS.map(ic => (
                    <SelectItem key={ic.value} value={ic.value}>
                      <div className="flex items-center gap-2"><ic.Icon className="w-4 h-4" /><span className="font-cairo">{ic.label}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addCategory} disabled={saveMutation.isPending || !newName.trim()} className="font-cairo gap-1.5 h-11 px-6 w-full sm:w-auto">
              <Plus className="w-4 h-4" /> {t('common.add')}
            </Button>
          </div>
          {/* Image upload for new category */}
          <div className="flex items-center gap-3">
            <Label className="font-cairo text-xs text-muted-foreground shrink-0">{t('categories.categoryImage')}</Label>
            {newImage ? (
              <div className="flex items-center gap-2">
                <img src={newImage} alt="صورة الفئة" className="w-10 h-10 rounded-lg object-cover border" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setNewImage(undefined)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleNewImageUpload} disabled={uploading} />
                <Button variant="outline" size="sm" className="font-cairo gap-1.5 pointer-events-none" disabled={uploading}>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? t('categories.uploading') : t('categories.uploadImage')}
                </Button>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Categories list */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-cairo font-semibold text-sm text-muted-foreground">{t('categories.currentCategories')}</h3>
        </div>
        {currentCategories.length > 0 ? (
          <div className="divide-y">
            {currentCategories.map((cat, index) => {
              const CatIcon = AVAILABLE_ICONS.find(i => i.value === cat.icon)?.Icon || Home;
              const isEditing = editIndex === index;

              if (isEditing) {
                const EditIcon = AVAILABLE_ICONS.find(i => i.value === editIcon)?.Icon || Home;
                return (
                  <div key={index} className="px-5 py-3 bg-primary/5 border-r-2 border-primary space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-roboto text-xs text-muted-foreground w-5 text-center">{index + 1}</span>
                      {editImage ? (
                        <div className="relative w-9 h-9 shrink-0">
                          <img src={editImage} alt="" className="w-9 h-9 rounded-lg object-cover" />
                          <button className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center" onClick={() => setEditImage(undefined)}>
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <EditIcon className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="font-cairo h-9 flex-1"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <Select value={editIcon} onValueChange={setEditIcon}>
                        <SelectTrigger className="w-32 h-9">
                          <div className="flex items-center gap-2">
                            <EditIcon className="w-3.5 h-3.5 text-primary" />
                            <span className="font-cairo text-xs">{AVAILABLE_ICONS.find(i => i.value === editIcon)?.label}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {AVAILABLE_ICONS.map(ic => (
                            <SelectItem key={ic.value} value={ic.value}>
                              <div className="flex items-center gap-2">
                                <ic.Icon className="w-4 h-4" />
                                <span className="font-cairo">{ic.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={saveEdit}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={cancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Image upload in edit mode */}
                    <div className="flex items-center gap-2 mr-8">
                      {!editImage && (
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={handleEditImageUpload} disabled={editUploading} />
                          <Button variant="outline" size="sm" className="font-cairo gap-1 text-xs pointer-events-none h-7" disabled={editUploading}>
                            {editUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            {editUploading ? t('categories.uploading') : t('categories.uploadImage')}
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={index} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="font-roboto text-xs text-muted-foreground w-5 text-center">{index + 1}</span>
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CatIcon className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <span className="font-cairo font-medium text-foreground">{cat.name}</span>
                  </div>
                  <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => startEdit(index)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteDialog(index)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-cairo text-muted-foreground">{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteDialog !== null} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-cairo text-center">{t('categories.deleteConfirm')}</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <p className="font-cairo text-muted-foreground">{t('categories.deleteMessage')}</p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => setDeleteDialog(null)} className="font-cairo px-6">{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={() => { if (deleteDialog !== null) removeCategory(deleteDialog); }} className="font-cairo px-6">{t('common.delete')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
