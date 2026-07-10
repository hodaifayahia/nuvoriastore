import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAdminSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [slideUploading, setSlideUploading] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const heroSlideInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*');
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  const mergedSettings = { ...settings, ...form };

  const updateSetting = useMutation({
    mutationFn: async (entries: { key: string; value: string }[]) => {
      for (const entry of entries) {
        const { data } = await supabase.from('settings').update({ value: entry.value }).eq('key', entry.key).select();
        if (!data || data.length === 0) {
          await supabase.from('settings').insert({ key: entry.key, value: entry.value });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['store-logo'] });
      qc.invalidateQueries({ queryKey: ['store-theme-colors'] });
      qc.invalidateQueries({ queryKey: ['store-favicon'] });
      qc.invalidateQueries({ queryKey: ['announcement-bar'] });
      qc.invalidateQueries({ queryKey: ['top-marquee'] });
      qc.invalidateQueries({ queryKey: ['footer-settings'] });
      toast({ title: 'تم حفظ الإعدادات' });
      setForm({});
    },
  });

  const handleSave = () => {
    const entries = Object.entries(form).map(([key, value]) => ({ key, value }));
    if (entries.length > 0) updateSetting.mutate(entries);
  };

  const setField = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    settingKey: string,
    setLoadingFn: (v: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'حجم الملف كبير جداً (الحد الأقصى 2MB)', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'يرجى اختيار ملف صورة', variant: 'destructive' });
      return;
    }
    setLoadingFn(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${settingKey}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('store').getPublicUrl(path);
      const url = urlData.publicUrl;
      const { data } = await supabase.from('settings').update({ value: url }).eq('key', settingKey).select();
      if (!data || data.length === 0) {
        await supabase.from('settings').insert({ key: settingKey, value: url });
      }
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['store-logo'] });
      qc.invalidateQueries({ queryKey: ['store-favicon'] });
      toast({ title: 'تم رفع الصورة بنجاح ✅' });
    } catch {
      toast({ title: 'فشل رفع الصورة', variant: 'destructive' });
    } finally {
      setLoadingFn(false);
    }
  };

  const removeImage = async (settingKey: string) => {
    const { data } = await supabase.from('settings').update({ value: '' }).eq('key', settingKey).select();
    if (!data || data.length === 0) {
      await supabase.from('settings').insert({ key: settingKey, value: '' });
    }
    qc.invalidateQueries({ queryKey: ['admin-settings'] });
    qc.invalidateQueries({ queryKey: ['store-logo'] });
    qc.invalidateQueries({ queryKey: ['store-favicon'] });
    toast({ title: 'تم حذف الصورة' });
  };

  // Hero slides helpers
  const heroSlides: { url: string; link?: string; alt?: string }[] = (() => {
    try { return JSON.parse(mergedSettings.hero_slides || '[]'); } catch { return []; }
  })();

  const handleSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'حجم الملف كبير جداً (الحد الأقصى 2MB)', variant: 'destructive' });
      return;
    }
    if (heroSlides.length >= 5) {
      toast({ title: 'الحد الأقصى 5 صور', variant: 'destructive' });
      return;
    }
    setSlideUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `hero-slide-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('store').getPublicUrl(path);
      const newSlides = [...heroSlides, { url: urlData.publicUrl }];
      setField('hero_slides', JSON.stringify(newSlides));
    } catch {
      toast({ title: 'فشل رفع الصورة', variant: 'destructive' });
    } finally {
      setSlideUploading(false);
    }
  };

  const removeSlide = (index: number) => {
    const newSlides = heroSlides.filter((_, i) => i !== index);
    setField('hero_slides', JSON.stringify(newSlides));
  };

  const updateSlideLink = (index: number, link: string) => {
    const newSlides = [...heroSlides];
    newSlides[index] = { ...newSlides[index], link };
    setField('hero_slides', JSON.stringify(newSlides));
  };

  return {
    settings,
    isLoading,
    form,
    mergedSettings,
    updateSetting,
    handleSave,
    setField,
    handleImageUpload,
    removeImage,
    uploading,
    setUploading,
    faviconUploading,
    setFaviconUploading,
    slideUploading,
    setSlideUploading,
    logoInputRef,
    faviconInputRef,
    heroSlideInputRef,
    heroSlides,
    handleSlideUpload,
    removeSlide,
    updateSlideLink,
    toast,
  };
}
