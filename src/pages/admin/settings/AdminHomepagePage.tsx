import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Eye, EyeOff, Sparkles, Upload, Trash2, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import {
  HP_SECTIONS,
  HP_TEXT_FIELDS,
  HP_TEXT_KEYS,
  type HpSection,
} from '@/hooks/useHomepageSettings';

const SECTION_LABEL_AR: Record<HpSection, string> = {
  hero: 'القسم الرئيسي (السلايدر + شارات)',
  categories: 'شبكة الفئات (Bento)',
  featured: 'اختيارات المتجر (منتجات مميزة)',
  newest: 'جديدنا',
  best_prices: 'بانر "أفضل الأسعار"',
  limited: 'إصدار محدود (Limited Edition)',
  brands: 'العلامات التجارية',
  trust_strip: 'سياسة الضمان',
  comparison: 'مقارنة الصور (قبل وبعد)',
};

const ALL_KEYS = [
  ...HP_SECTIONS.map(s => `hp_show_${s}`),
  ...HP_TEXT_KEYS,
  'hp_limited_title',
  'hp_limited_subtitle',
  'hp_limited_image',
  'hp_limited_link',
  'hp_limited_cta',
  'hp_limited_end_date',
  'hero_slides',
  'hp_promo_videos',
  'hp_comparison_before',
  'hp_comparison_after',
];

type HeroSlide = { url: string; link?: string; alt?: string };

export default function AdminHomepagePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [openSection, setOpenSection] = useState<HpSection | 'promo_videos' | null>('hero');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-hp-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('key,value').in('key', ALL_KEYS);
      const map: Record<string, string> = {};
      data?.forEach(r => { map[r.key] = r.value || ''; });
      return map;
    },
  });

  // Only clear local edits the first time settings load (avoid wiping user input on refetch)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (settings && !hydrated) {
      setForm({});
      setHydrated(true);
    }
  }, [settings, hydrated]);

  const merged = useMemo(() => ({ ...(settings || {}), ...form }), [settings, form]);
  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const getShow = (s: HpSection) => {
    const v = merged[`hp_show_${s}`];
    return v === '' || v === undefined ? s !== 'limited' : v !== 'false';
  };

  const fieldsBySection = useMemo(() => {
    const out: Record<HpSection, typeof HP_TEXT_FIELDS> = {} as any;
    HP_SECTIONS.forEach(s => { out[s] = HP_TEXT_FIELDS.filter(f => f.section === s); });
    return out;
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(form);
      for (const [key, value] of entries) {
        const { data } = await supabase.from('settings').update({ value }).eq('key', key).select();
        if (!data || data.length === 0) {
          await supabase.from('settings').insert({ key, value });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-hp-settings'] });
      qc.invalidateQueries({ queryKey: ['homepage-settings'] });
      toast({ title: 'تم حفظ إعدادات الصفحة الرئيسية ✅' });
      setForm({});
    },
    onError: () => toast({ title: 'فشل الحفظ', variant: 'destructive' }),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'الحد الأقصى 2MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `hp-limited-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('store').getPublicUrl(path);
      setField('hp_limited_image', data.publicUrl);
    } catch {
      toast({ title: 'فشل رفع الصورة', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return null;

  const hasChanges = Object.keys(form).length > 0;

  return (
    <div className="space-y-6 max-w-4xl p-4 md:p-6" dir="rtl">
      <div className="flex items-center justify-between gap-3 sticky top-0 bg-background/95 backdrop-blur z-10 py-3 -mt-3">
        <div>
          <h1 className="font-cairo font-bold text-2xl">إعدادات الصفحة الرئيسية</h1>
          <p className="font-cairo text-sm text-muted-foreground mt-1">
            تحكّم في إظهار/إخفاء كل قسم وعدّل جميع النصوص الظاهرة في الصفحة الرئيسية.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !hasChanges} className="font-cairo gap-2">
          <Save className="w-4 h-4" />
          {save.isPending ? 'جاري الحفظ...' : hasChanges ? `حفظ (${Object.keys(form).length})` : 'حفظ'}
        </Button>
      </div>

      <div className="bg-card border rounded-2xl p-5 space-y-3">
        <h2 className="font-cairo font-bold text-lg">الأقسام والنصوص</h2>
        <p className="font-cairo text-xs text-muted-foreground">
          اضغط على أي قسم لفتحه وتعديل نصوصه. اترك الحقل فارغًا لاستخدام النص الافتراضي.
        </p>

        <div className="space-y-3">
          {HP_SECTIONS.map(s => {
            const visible = getShow(s);
            const isOpen = openSection === s;
            const fields = fieldsBySection[s] || [];
            return (
              <div key={s} className="border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? null : s)}
                    className="flex items-center gap-2 flex-1 text-right"
                  >
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {visible ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    <span className="font-cairo font-semibold">{SECTION_LABEL_AR[s]}</span>
                    {fields.length > 0 && (
                      <span className="text-[11px] font-cairo text-muted-foreground mr-auto">
                        {fields.length} نص قابل للتعديل
                      </span>
                    )}
                  </button>
                  <Switch
                    checked={visible}
                    onCheckedChange={v => setField(`hp_show_${s}`, v ? 'true' : 'false')}
                  />
                </div>

                {isOpen && (
                  <div className="p-4 space-y-4">
                    {s === 'hero' && (
                      <HeroSlidesFields
                        value={merged.hero_slides || ''}
                        onChange={v => setField('hero_slides', v)}
                      />
                    )}

                    {s === 'limited' && (
                      <LimitedEditionFields
                        merged={merged}
                        setField={setField}
                        uploading={uploading}
                        onUpload={handleImageUpload}
                      />
                    )}

                    {s === 'comparison' && (
                      <ComparisonSliderFields
                        merged={merged}
                        setField={setField}
                      />
                    )}

                    {fields.length === 0 && s !== 'limited' && s !== 'hero' && (
                      <p className="font-cairo text-sm text-muted-foreground">
                        لا توجد نصوص خاصة بهذا القسم. يمكنك إظهاره/إخفاؤه فقط.
                      </p>
                    )}

                    {fields.map(f => {
                      const storeKey = `hp_text_${f.key}`;
                      const value = merged[storeKey] ?? '';
                      return (
                        <div key={f.key}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Label className="font-cairo text-xs text-foreground">{f.label}</Label>
                            {value && (
                              <button
                                type="button"
                                onClick={() => setField(storeKey, '')}
                                className="font-cairo text-[11px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                                title="إعادة للنص الافتراضي"
                              >
                                <RotateCcw className="w-3 h-3" /> افتراضي
                              </button>
                            )}
                          </div>
                          {f.multiline ? (
                            <Textarea
                              className="font-cairo"
                              placeholder={f.defaultValue}
                              value={value}
                              onChange={e => setField(storeKey, e.target.value)}
                              rows={3}
                            />
                          ) : (
                            <Input
                              className="font-cairo"
                              placeholder={f.defaultValue}
                              value={value}
                              onChange={e => setField(storeKey, e.target.value)}
                            />
                          )}
                          <p className="font-cairo text-[11px] text-muted-foreground mt-1">
                            الافتراضي: {f.defaultValue}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Promo Videos Accordion Section */}
          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 bg-muted/30">
              <button
                type="button"
                onClick={() => setOpenSection(openSection === 'promo_videos' ? null : 'promo_videos')}
                className="flex items-center gap-2 flex-1 text-right"
              >
                {openSection === 'promo_videos' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <Eye className="w-4 h-4 text-primary" />
                <span className="font-cairo font-semibold">فيديوهات ترويجية بين المنتجات</span>
              </button>
            </div>

            {openSection === 'promo_videos' && (
              <div className="p-4 space-y-4">
                <PromoVideosFields
                  value={merged.hp_promo_videos || ''}
                  onChange={v => setField('hp_promo_videos', v)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end sticky bottom-3">
        <Button onClick={() => save.mutate()} disabled={save.isPending || !hasChanges} className="font-cairo gap-2 shadow-lg">
          <Save className="w-4 h-4" />
          {save.isPending ? 'جاري الحفظ...' : hasChanges ? `حفظ التغييرات (${Object.keys(form).length})` : 'حفظ التغييرات'}
        </Button>
      </div>
    </div>
  );
}

function LimitedEditionFields({
  merged, setField, uploading, onUpload,
}: {
  merged: Record<string, string>;
  setField: (k: string, v: string) => void;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="font-cairo text-sm text-muted-foreground">
          قسم ترويجي بارز يظهر بين «التخفيضات» و«العلامات». فعّله من الأعلى لإظهاره في الصفحة.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="font-cairo text-xs">العنوان</Label>
          <Input
            className="font-cairo mt-1"
            placeholder="مثال: إصدار محدود — لا يفوّت"
            value={merged.hp_limited_title || ''}
            onChange={e => setField('hp_limited_title', e.target.value)}
          />
        </div>
        <div>
          <Label className="font-cairo text-xs">الوصف</Label>
          <Input
            className="font-cairo mt-1"
            placeholder="وصف قصير يجذب الانتباه"
            value={merged.hp_limited_subtitle || ''}
            onChange={e => setField('hp_limited_subtitle', e.target.value)}
          />
        </div>
        <div>
          <Label className="font-cairo text-xs">نص الزر</Label>
          <Input
            className="font-cairo mt-1"
            placeholder="اطلب الآن"
            value={merged.hp_limited_cta || ''}
            onChange={e => setField('hp_limited_cta', e.target.value)}
          />
        </div>
        <div>
          <Label className="font-cairo text-xs">رابط الزر</Label>
          <Input
            className="font-cairo mt-1"
            placeholder="/products"
            value={merged.hp_limited_link || ''}
            onChange={e => setField('hp_limited_link', e.target.value)}
          />
        </div>
        <div>
          <Label className="font-cairo text-xs">تاريخ انتهاء العرض (اختياري)</Label>
          <Input
            type="datetime-local"
            className="font-cairo mt-1"
            value={merged.hp_limited_end_date || ''}
            onChange={e => setField('hp_limited_end_date', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label className="font-cairo text-xs">صورة القسم</Label>
        <div className="mt-2 flex items-start gap-3">
          {merged.hp_limited_image ? (
            <div className="relative group">
              <img src={merged.hp_limited_image} alt="" className="w-32 h-32 object-cover rounded-xl border" />
              <button
                onClick={() => setField('hp_limited_image', '')}
                className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 rounded-xl border border-dashed flex items-center justify-center text-muted-foreground text-xs font-cairo">
              لا توجد صورة
            </div>
          )}
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            <Button asChild variant="outline" className="font-cairo gap-2" disabled={uploading}>
              <span>
                <Upload className="w-4 h-4" />
                {uploading ? 'جاري الرفع...' : 'رفع صورة'}
              </span>
            </Button>
          </label>
        </div>
      </div>
    </div>
  );
}

function HeroSlidesFields({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const slides: HeroSlide[] = useMemo(() => {
    try { return JSON.parse(value || '[]'); } catch { return []; }
  }, [value]);

  const update = (next: HeroSlide[]) => onChange(JSON.stringify(next));

  const isVideo = (url: string) => /\.(mp4|webm|mov)$/i.test(url);

  const validateVideoDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 9) {
          toast({ title: 'الفيديو يجب أن لا يتجاوز 9 ثوانٍ', variant: 'destructive' });
          resolve(false);
        } else {
          resolve(true);
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(true); // fallback: allow if metadata can't be read
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isVideoFile = file.type.startsWith('video/');
    const maxSize = isVideoFile ? 10 * 1024 * 1024 : 2 * 1024 * 1024; // 10MB for video, 2MB for image

    if (file.size > maxSize) {
      toast({ title: isVideoFile ? 'الحد الأقصى 10MB للفيديو' : 'الحد الأقصى 2MB', variant: 'destructive' });
      return;
    }
    if (slides.length >= 5) {
      toast({ title: 'الحد الأقصى 5 عناصر', variant: 'destructive' });
      return;
    }

    // Validate video duration (9s max)
    if (isVideoFile) {
      const valid = await validateVideoDuration(file);
      if (!valid) return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `hero-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('store').getPublicUrl(path);
      update([...slides, { url: data.publicUrl }]);
    } catch {
      toast({ title: 'فشل الرفع', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => update(slides.filter((_, idx) => idx !== i));
  const setLink = (i: number, link: string) => {
    const next = [...slides];
    next[i] = { ...next[i], link };
    update(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-primary mt-0.5" />
        <p className="font-cairo text-sm text-muted-foreground">
          صور وفيديوهات القسم الرئيسي (السلايدر). يمكنك إضافة حتى 5 عناصر — الحد الأقصى 2MB للصور و10MB للفيديو (9 ثوانٍ كحد أقصى). لا تنسَ الضغط على «حفظ» بعد التعديل.
        </p>
      </div>

      <div className="space-y-3">
        {slides.map((slide, i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-xl bg-muted/20">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-background shrink-0 border relative">
              {isVideo(slide.url) ? (
                <>
                  <video src={slide.url} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute top-1 left-1 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">🎬 VIDEO</div>
                </>
              ) : (
                <>
                  <img src={slide.url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">📷 IMAGE</div>
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Label className="font-cairo text-[11px] text-muted-foreground">رابط اختياري عند الضغط</Label>
              <Input
                value={slide.link || ''}
                onChange={e => setLink(i, e.target.value)}
                className="font-roboto text-sm mt-1"
                dir="ltr"
                placeholder="/products"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(i)} className="shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {slides.length === 0 && (
          <p className="font-cairo text-xs text-muted-foreground text-center py-6 border border-dashed rounded-xl">
            لا توجد عناصر بعد — سيتم استخدام الصور الافتراضية.
          </p>
        )}
      </div>

      {slides.length < 5 && (
        <label className="inline-block cursor-pointer">
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/webm" className="hidden" onChange={onUpload} />
          <Button asChild variant="outline" className="font-cairo gap-2" disabled={uploading}>
            <span>
              <Upload className="w-4 h-4" />
              {uploading ? 'جاري الرفع...' : `إضافة صورة أو فيديو (${slides.length}/5)`}
            </span>
          </Button>
        </label>
      )}
    </div>
  );
}

function PromoVideosFields({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const videos: string[] = useMemo(() => {
    try { return JSON.parse(value || '[]'); } catch { return []; }
  }, [value]);

  const update = (next: string[]) => onChange(JSON.stringify(next));

  const validateVideoDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 9) {
          toast({ title: 'الفيديو يجب أن لا يتجاوز 9 ثوانٍ', variant: 'destructive' });
          resolve(false);
        } else {
          resolve(true);
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(true);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({ title: 'يرجى رفع ملف فيديو فقط', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'الحد الأقصى 10MB للفيديو', variant: 'destructive' });
      return;
    }

    const valid = await validateVideoDuration(file);
    if (!valid) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `promo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('store').getPublicUrl(path);
      update([...videos, data.publicUrl]);
    } catch {
      toast({ title: 'فشل الرفع', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => update(videos.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-primary mt-0.5" />
        <p className="font-cairo text-sm text-muted-foreground">
          فيديوهات ترويجية تظهر بين أقسام المنتجات في الصفحة الرئيسية (بحد أقصى 9 ثوانٍ وحجم 10MB لكل فيديو). لا تنسَ الضغط على «حفظ» بعد التعديل.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {videos.map((url, i) => (
          <div key={i} className="relative group rounded-xl overflow-hidden aspect-[9/16] bg-slate-900 border">
            <video src={url} className="w-full h-full object-cover" muted controls />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-2 left-2 bg-destructive text-destructive-foreground p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-roboto">
              Video #{i + 1}
            </div>
          </div>
        ))}
      </div>

      {videos.length === 0 && (
        <p className="font-cairo text-xs text-muted-foreground text-center py-8 border border-dashed rounded-xl">
          لا توجد فيديوهات ترويجية مضافة حالياً.
        </p>
      )}

      <label className="inline-block cursor-pointer">
        <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={onUpload} />
        <Button asChild variant="outline" className="font-cairo gap-2" disabled={uploading}>
          <span>
            <Upload className="w-4 h-4" />
            {uploading ? 'جاري الرفع...' : 'إضافة فيديو ترويجي'}
          </span>
        </Button>
      </label>
    </div>
  );
}

function ComparisonSliderFields({
  merged,
  setField,
}: {
  merged: Record<string, string>;
  setField: (k: string, v: string) => void;
}) {
  const { toast } = useToast();
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  const uploadImage = async (file: File, key: 'hp_comparison_before' | 'hp_comparison_after', setUploading: (v: boolean) => void) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'الحد الأقصى للملف 2MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `comparison-${key === 'hp_comparison_before' ? 'before' : 'after'}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('store').getPublicUrl(path);
      setField(key, data.publicUrl);
      toast({ title: 'تم رفع الصورة بنجاح ✅' });
    } catch {
      toast({ title: 'فشل الرفع', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="font-cairo text-sm text-muted-foreground">
          اختر صورة "قبل" وصورة "بعد" ليتم عرض سلايدر مقارنة تفاعلي على الصفحة الرئيسية.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Before Image */}
        <div className="p-4 border rounded-xl space-y-3 bg-muted/10">
          <Label className="font-cairo text-xs font-bold block mb-1">صورة "قبل" (Avant)</Label>
          {merged.hp_comparison_before ? (
            <div className="relative aspect-[16/10] rounded-lg overflow-hidden border bg-background group">
              <img src={merged.hp_comparison_before} className="w-full h-full object-cover" alt="Before" />
              <button
                type="button"
                onClick={() => setField('hp_comparison_before', '')}
                className="absolute top-2 left-2 bg-destructive text-destructive-foreground p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="aspect-[16/10] rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground p-4">
              <Upload className="w-8 h-8 mb-2 opacity-50" />
              <span className="font-cairo text-[11px]">لا توجد صورة بعد</span>
            </div>
          )}
          <label className="block cursor-pointer mt-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file, 'hp_comparison_before', setUploadingBefore);
              }}
            />
            <Button asChild variant="outline" size="sm" className="w-full font-cairo" disabled={uploadingBefore}>
              <span>{uploadingBefore ? 'جاري الرفع...' : 'رفع صورة قبل'}</span>
            </Button>
          </label>
        </div>

        {/* After Image */}
        <div className="p-4 border rounded-xl space-y-3 bg-muted/10">
          <Label className="font-cairo text-xs font-bold block mb-1">صورة "بعد" (Après)</Label>
          {merged.hp_comparison_after ? (
            <div className="relative aspect-[16/10] rounded-lg overflow-hidden border bg-background group">
              <img src={merged.hp_comparison_after} className="w-full h-full object-cover" alt="After" />
              <button
                type="button"
                onClick={() => setField('hp_comparison_after', '')}
                className="absolute top-2 left-2 bg-destructive text-destructive-foreground p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="aspect-[16/10] rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground p-4">
              <Upload className="w-8 h-8 mb-2 opacity-50" />
              <span className="font-cairo text-[11px]">لا توجد صورة بعد</span>
            </div>
          )}
          <label className="block cursor-pointer mt-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file, 'hp_comparison_after', setUploadingAfter);
              }}
            />
            <Button asChild variant="outline" size="sm" className="w-full font-cairo" disabled={uploadingAfter}>
              <span>{uploadingAfter ? 'جاري الرفع...' : 'رفع صورة بعد'}</span>
            </Button>
          </label>
        </div>
      </div>
    </div>
  );
}
