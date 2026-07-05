import { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Loader2, Star, ShieldCheck, Truck, RefreshCw, Check, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Palette {
  primary: string;
  accent: string;
  dark: string;
  light: string;
}

interface Content {
  headline: string;
  subheadline: string;
  cta_primary: string;
  cta_secondary: string;
  before_after: { before_text: string; after_text: string; switch_line: string };
  testimonials: { name: string; text: string; rating: number }[];
  social_proof_stats: { number: string; label: string }[];
  authority_text: string;
  how_it_works: { icon: string; title: string; description: string }[];
  ingredients?: { icon: string; title: string; description: string }[];
  guarantee_text: string;
}

// Extract dominant colors from an image via canvas sampling
async function extractPalette(imgUrl: string): Promise<Palette> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = (canvas.width = 80);
      const h = (canvas.height = 80);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const buckets: Record<string, { r: number; g: number; b: number; c: number }> = {};
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 200) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // skip near-white/near-black to find brand hues
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max > 240 && min > 240) continue;
        if (max < 20) continue;
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
        const bkt = buckets[key] || { r: 0, g: 0, b: 0, c: 0 };
        bkt.r += r; bkt.g += g; bkt.b += b; bkt.c++;
        buckets[key] = bkt;
      }
      const sorted = Object.values(buckets).sort((a, b) => b.c - a.c).slice(0, 4);
      if (!sorted.length) {
        return resolve({ primary: '#1e1e5a', accent: '#4f46e5', dark: '#0a0a1a', light: '#f5f5fa' });
      }
      const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
      const rgb = (b: typeof sorted[number]) => `#${toHex(b.r / b.c)}${toHex(b.g / b.c)}${toHex(b.b / b.c)}`;
      const primary = rgb(sorted[0]);
      const accent = rgb(sorted[1] || sorted[0]);
      // derive dark/light from primary
      const p = sorted[0];
      const pr = p.r / p.c, pg = p.g / p.c, pb = p.b / p.c;
      const darken = (v: number) => Math.max(0, v * 0.25);
      const dark = `#${toHex(darken(pr))}${toHex(darken(pg))}${toHex(darken(pb))}`;
      const light = '#fafafa';
      resolve({ primary, accent, dark, light });
    };
    img.onerror = () => resolve({ primary: '#1e1e5a', accent: '#4f46e5', dark: '#0a0a1a', light: '#f5f5fa' });
    img.src = imgUrl;
  });
}

const DEFAULT_CONTENT = (name: string): Content => ({
  headline: `اكتشف ${name} — تجربة استثنائية بانتظارك`,
  subheadline: 'حلٌّ مبتكر يُحدث فارقاً حقيقياً في يومك، مصمّم بعناية ليمنحك أفضل ما تستحق.',
  cta_primary: 'اطلب الآن',
  cta_secondary: 'اعرف المزيد',
  before_after: {
    before_text: 'إحباط يومي، نتائج مخيّبة، وقتٌ ضائع بلا فائدة.',
    after_text: 'راحة فورية، نتائج مذهلة، وثقة تكتشفها من أول استخدام.',
    switch_line: 'آلاف العملاء بدّلوا حياتهم — والدور عليك الآن.',
  },
  testimonials: [
    { name: 'أمينة ب.', text: 'منتج رائع فعلاً! الفرق ملحوظ من اليوم الأول. أنصح به بشدة.', rating: 5 },
    { name: 'كريم م.', text: 'جودة تفوق التوقعات والسعر مناسب جداً. شكراً على الاحتراف.', rating: 5 },
    { name: 'ليلى ح.', text: 'التسليم كان سريعاً والمنتج مطابق للوصف تماماً. تجربة ممتازة.', rating: 4 },
  ],
  social_proof_stats: [
    { number: '+50,000', label: 'عميل سعيد' },
    { number: '4.9/5', label: 'تقييم العملاء' },
    { number: '+99%', label: 'رضا مضمون' },
  ],
  authority_text: 'موصى به من خبراء الجودة ومختبَر وفق أعلى المعايير الدولية.',
  how_it_works: [
    { icon: '1', title: 'اطلب منتجك', description: 'املأ النموذج البسيط في أقل من دقيقة.' },
    { icon: '2', title: 'استلم بسرعة', description: 'يصلك الطلب إلى باب منزلك بأمان.' },
    { icon: '3', title: 'استمتع بالنتائج', description: 'اختبر الفرق منذ الاستخدام الأول.' },
  ],
  ingredients: [
    { icon: '✨', title: 'خامات فاخرة', description: 'مواد مختارة بعناية توفّر متانة تدوم طويلاً.' },
    { icon: '🛡️', title: 'حماية ذكية', description: 'تصميم مدروس يقيك من المشاكل الشائعة.' },
    { icon: '⚡', title: 'أداء فوري', description: 'نتائج ملحوظة من أول استخدام دون انتظار.' },
    { icon: '💎', title: 'تشطيب أنيق', description: 'لمسات جمالية راقية تناسب كل الأذواق.' },
  ],
  guarantee_text: 'ضمان استرداد المال خلال 14 يوماً إذا لم تعجبك التجربة.',
});

// Simple editable text component using contentEditable
function Editable({
  value,
  onChange,
  className,
  as: Tag = 'span',
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  as?: any;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);
  return (
    <Tag
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: any) => onChange(e.currentTarget.innerText)}
      className={`outline-none focus:ring-2 focus:ring-primary/40 focus:rounded px-1 -mx-1 ${className || ''}`}
    />
  );
}

export default function AdminLandingGeneratorPage() {
  const [image, setImage] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [oldPrice, setOldPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleUpload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 8MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      setImage(url);
      const p = await extractPalette(url);
      setPalette(p);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!image) return toast.error('ارفع صورة المنتج أولاً');
    if (!productName.trim()) return toast.error('أدخل اسم المنتج');
    setLoading(true);
    try {
      const res = await supabase.functions.invoke('generate-landing', {
        body: {
          productName,
          price: Number(price) || 0,
          oldPrice: oldPrice ? Number(oldPrice) : null,
          description,
          shortDescription: description,
          category: '',
          language: 'ar',
        },
      });
      if (res.error) throw res.error;
      const ai = res.data;
      // Merge AI response into our schema — keep defaults for missing fields
      const base = DEFAULT_CONTENT(productName);
      const merged: Content = {
        headline: ai?.headline || base.headline,
        subheadline: ai?.subheadline || base.subheadline,
        cta_primary: ai?.cta_primary || base.cta_primary,
        cta_secondary: ai?.cta_secondary || base.cta_secondary,
        before_after: ai?.before_after || base.before_after,
        testimonials: ai?.testimonials?.length ? ai.testimonials : base.testimonials,
        social_proof_stats: ai?.social_proof_stats?.length ? ai.social_proof_stats : base.social_proof_stats,
        authority_text: ai?.authority_text || base.authority_text,
        how_it_works: ai?.how_it_works?.length ? ai.how_it_works : base.how_it_works,
        ingredients: ai?.benefits?.length ? ai.benefits.map((b: any) => ({ icon: b.icon || '✨', title: b.title, description: b.text })) : base.ingredients,
        guarantee_text: ai?.guarantee_text || base.guarantee_text,
      };
      setContent(merged);
      toast.success('تم توليد الصفحة بنجاح ✨');
    } catch (err: any) {
      console.warn('AI generation failed, using defaults:', err);
      setContent(DEFAULT_CONTENT(productName));
      toast.warning('تعذّر الاتصال بالـAI — تم استخدام محتوى افتراضي قابل للتعديل');
    } finally {
      setLoading(false);
    }
  };

  const handleExportHTML = () => {
    if (!previewRef.current) return;
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${productName}</title><script src="https://cdn.tailwindcss.com"></script></head><body>${previewRef.current.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${productName || 'landing'}.html`;
    a.click();
  };

  const reset = () => {
    setImage(null);
    setContent(null);
    setPalette(null);
    setProductName('');
    setDescription('');
    setPrice('');
    setOldPrice('');
  };

  const themeStyle = palette
    ? ({
        ['--lp-primary' as any]: palette.primary,
        ['--lp-accent' as any]: palette.accent,
        ['--lp-dark' as any]: palette.dark,
        ['--lp-light' as any]: palette.light,
      } as React.CSSProperties)
    : {};

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-cairo font-bold text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            مولّد صفحات الهبوط بالذكاء الاصطناعي
          </h1>
          <p className="text-sm text-muted-foreground font-cairo mt-1">
            ارفع صورة منتج واحدة — واحصل على صفحة هبوط كاملة، جاهزة، وقابلة للتعديل.
          </p>
        </div>
        {content && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportHTML} className="gap-2">
              <Download className="w-4 h-4" /> تصدير HTML
            </Button>
            <Button variant="outline" onClick={reset} className="gap-2">
              <Trash2 className="w-4 h-4" /> إعادة تعيين
            </Button>
          </div>
        )}
      </div>

      {!content && (
        <Card className="p-6 space-y-5">
          <div>
            <Label className="font-cairo mb-2 block">صورة المنتج *</Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors"
            >
              {image ? (
                <div className="space-y-3">
                  <img src={image} alt="preview" className="max-h-48 mx-auto rounded-lg shadow" />
                  {palette && (
                    <div className="flex gap-2 justify-center">
                      {[palette.primary, palette.accent, palette.dark].map((c) => (
                        <div key={c} className="w-8 h-8 rounded-full border shadow-sm" style={{ background: c }} title={c} />
                      ))}
                      <span className="text-xs text-muted-foreground self-center font-mono">لوحة الألوان مستخرجة تلقائياً</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="font-cairo text-sm">اضغط أو اسحب صورة المنتج هنا</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG — حتى 8MB</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="font-cairo mb-1 block">اسم المنتج *</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="مثال: ساعة ذكية Pro X" />
            </div>
            <div>
              <Label className="font-cairo mb-1 block">الفئة / وصف مختصر</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ساعة رياضية بشاشة لمس" />
            </div>
            <div>
              <Label className="font-cairo mb-1 block">السعر (دج)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="4990" />
            </div>
            <div>
              <Label className="font-cairo mb-1 block">السعر القديم (اختياري)</Label>
              <Input type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="7990" />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading || !image} size="lg" className="w-full gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'جاري توليد الصفحة...' : 'توليد صفحة الهبوط'}
          </Button>
        </Card>
      )}

      {content && palette && image && (
        <Card className="overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground font-cairo border-b">
            💡 معاينة مباشرة — انقر على أي نص لتعديله. صمم بلوحة ألوان مستخرجة من صورتك.
          </div>
          <div ref={previewRef} style={themeStyle} className="lp-preview">
            {/* HERO */}
            <section
              className="relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${palette.light} 0%, #fff 60%, ${palette.accent}15 100%)` }}
            >
              <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
                <div className="space-y-6 order-2 md:order-1">
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: `${palette.primary}15`, color: palette.primary }}
                  >
                    <Sparkles className="w-3 h-3" /> إصدار محدود
                  </div>
                  <Editable
                    as="h1"
                    value={content.headline}
                    onChange={(v) => setContent({ ...content, headline: v })}
                    className="block text-4xl md:text-5xl font-bold leading-tight font-cairo"
                    // @ts-ignore
                    style={{ color: palette.dark }}
                  />
                  <Editable
                    as="p"
                    value={content.subheadline}
                    onChange={(v) => setContent({ ...content, subheadline: v })}
                    className="block text-lg text-slate-600 font-cairo leading-relaxed"
                  />
                  {price && (
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold" style={{ color: palette.primary }}>{price} دج</span>
                      {oldPrice && <span className="text-lg text-slate-400 line-through">{oldPrice} دج</span>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Editable
                      as="button"
                      value={content.cta_primary}
                      onChange={(v) => setContent({ ...content, cta_primary: v })}
                      className="px-8 py-3 rounded-full font-bold text-white shadow-lg hover:scale-105 transition-transform font-cairo"
                      // @ts-ignore
                      style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})` }}
                    />
                    <Editable
                      as="button"
                      value={content.cta_secondary}
                      onChange={(v) => setContent({ ...content, cta_secondary: v })}
                      className="px-8 py-3 rounded-full font-bold border-2 hover:bg-black/5 transition-colors font-cairo"
                      // @ts-ignore
                      style={{ borderColor: palette.primary, color: palette.primary }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-cairo pt-2">
                    <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> شحن سريع</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> ضمان الجودة</span>
                    <span className="flex items-center gap-1"><RefreshCw className="w-4 h-4" /> إرجاع مجاني</span>
                  </div>
                </div>
                <div className="order-1 md:order-2 relative">
                  <div
                    className="absolute inset-0 rounded-full blur-3xl opacity-40"
                    style={{ background: `radial-gradient(circle, ${palette.accent}, transparent 70%)` }}
                  />
                  <img src={image} alt={productName} className="relative w-full max-w-md mx-auto drop-shadow-2xl" />
                </div>
              </div>
            </section>

            {/* SOCIAL PROOF STATS BAR */}
            <section style={{ background: palette.dark, color: '#fff' }}>
              <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-3 gap-4 text-center">
                {content.social_proof_stats.map((s, i) => (
                  <div key={i}>
                    <Editable
                      as="div"
                      value={s.number}
                      onChange={(v) => {
                        const arr = [...content.social_proof_stats];
                        arr[i] = { ...arr[i], number: v };
                        setContent({ ...content, social_proof_stats: arr });
                      }}
                      className="block text-2xl md:text-3xl font-bold font-cairo"
                      // @ts-ignore
                      style={{ color: palette.accent }}
                    />
                    <Editable
                      as="div"
                      value={s.label}
                      onChange={(v) => {
                        const arr = [...content.social_proof_stats];
                        arr[i] = { ...arr[i], label: v };
                        setContent({ ...content, social_proof_stats: arr });
                      }}
                      className="block text-xs md:text-sm text-white/70 font-cairo mt-1"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* BEFORE / AFTER TRANSFORMATION */}
            <section className="bg-white">
              <div className="max-w-5xl mx-auto px-6 py-16">
                <h2 className="text-center text-3xl md:text-4xl font-bold mb-3 font-cairo" style={{ color: palette.dark }}>
                  تحوّل حقيقي، نتائج ملموسة
                </h2>
                <Editable
                  as="p"
                  value={content.before_after.switch_line}
                  onChange={(v) => setContent({ ...content, before_after: { ...content.before_after, switch_line: v } })}
                  className="block text-center text-slate-600 font-cairo mb-10 max-w-2xl mx-auto"
                />
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-2xl p-6 border-2 border-red-100 bg-red-50/40 relative">
                    <div className="absolute -top-3 right-6 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">قبل</div>
                    <div className="text-5xl mb-3">😞</div>
                    <Editable
                      as="p"
                      value={content.before_after.before_text}
                      onChange={(v) => setContent({ ...content, before_after: { ...content.before_after, before_text: v } })}
                      className="block text-slate-700 font-cairo leading-relaxed"
                    />
                  </div>
                  <div
                    className="rounded-2xl p-6 border-2 relative"
                    style={{ borderColor: `${palette.primary}30`, background: `${palette.primary}08` }}
                  >
                    <div
                      className="absolute -top-3 right-6 text-white text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: palette.primary }}
                    >
                      بعد
                    </div>
                    <div className="text-5xl mb-3">✨</div>
                    <Editable
                      as="p"
                      value={content.before_after.after_text}
                      onChange={(v) => setContent({ ...content, before_after: { ...content.before_after, after_text: v } })}
                      className="block text-slate-800 font-cairo leading-relaxed font-medium"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* AUTHORITY & TESTIMONIALS */}
            <section style={{ background: palette.light }}>
              <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-bold mb-3 font-cairo" style={{ color: palette.dark }}>
                    يثق بنا الآلاف
                  </h2>
                  <Editable
                    as="p"
                    value={content.authority_text}
                    onChange={(v) => setContent({ ...content, authority_text: v })}
                    className="block text-slate-600 font-cairo max-w-2xl mx-auto"
                  />
                  <div className="flex justify-center gap-6 mt-6 flex-wrap">
                    {['ISO 9001', 'CE', '⭐ Trusted', 'Premium'].map((b) => (
                      <div key={b} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold text-slate-600 shadow-sm font-cairo">
                        {b}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-5">
                  {content.testimonials.map((t, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                      <div className="flex mb-3">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={`w-4 h-4 ${j < t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                      <Editable
                        as="p"
                        value={t.text}
                        onChange={(v) => {
                          const arr = [...content.testimonials];
                          arr[i] = { ...arr[i], text: v };
                          setContent({ ...content, testimonials: arr });
                        }}
                        className="block text-slate-700 font-cairo leading-relaxed mb-4 text-sm"
                      />
                      <Editable
                        as="div"
                        value={`— ${t.name}`}
                        onChange={(v) => {
                          const arr = [...content.testimonials];
                          arr[i] = { ...arr[i], name: v.replace(/^—\s*/, '') };
                          setContent({ ...content, testimonials: arr });
                        }}
                        className="block text-xs font-semibold font-cairo"
                        // @ts-ignore
                        style={{ color: palette.primary }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* INGREDIENTS / MECHANISM */}
            <section className="bg-white">
              <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold mb-3 font-cairo" style={{ color: palette.dark }}>
                    ما الذي يجعله مميّزاً؟
                  </h2>
                  <p className="text-slate-600 font-cairo">مكوّنات وتقنيات مدروسة بعناية لضمان تجربة استثنائية.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {(content.ingredients || []).map((it, i) => (
                    <div
                      key={i}
                      className="rounded-2xl p-6 text-center border hover:shadow-lg transition-shadow"
                      style={{ background: `linear-gradient(180deg, #fff 0%, ${palette.accent}08 100%)` }}
                    >
                      <div
                        className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-4"
                        style={{ background: `${palette.primary}15`, color: palette.primary }}
                      >
                        {it.icon}
                      </div>
                      <Editable
                        as="h3"
                        value={it.title}
                        onChange={(v) => {
                          const arr = [...(content.ingredients || [])];
                          arr[i] = { ...arr[i], title: v };
                          setContent({ ...content, ingredients: arr });
                        }}
                        className="block font-bold font-cairo mb-2"
                        // @ts-ignore
                        style={{ color: palette.dark }}
                      />
                      <Editable
                        as="p"
                        value={it.description}
                        onChange={(v) => {
                          const arr = [...(content.ingredients || [])];
                          arr[i] = { ...arr[i], description: v };
                          setContent({ ...content, ingredients: arr });
                        }}
                        className="block text-sm text-slate-600 font-cairo leading-relaxed"
                      />
                    </div>
                  ))}
                </div>

                {/* How it works — mechanism */}
                <div className="mt-16 grid md:grid-cols-3 gap-6 relative">
                  {content.how_it_works.map((s, i) => (
                    <div key={i} className="text-center">
                      <div
                        className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})` }}
                      >
                        {s.icon || i + 1}
                      </div>
                      <Editable
                        as="h4"
                        value={s.title}
                        onChange={(v) => {
                          const arr = [...content.how_it_works];
                          arr[i] = { ...arr[i], title: v };
                          setContent({ ...content, how_it_works: arr });
                        }}
                        className="block font-bold font-cairo mb-1"
                        // @ts-ignore
                        style={{ color: palette.dark }}
                      />
                      <Editable
                        as="p"
                        value={s.description}
                        onChange={(v) => {
                          const arr = [...content.how_it_works];
                          arr[i] = { ...arr[i], description: v };
                          setContent({ ...content, how_it_works: arr });
                        }}
                        className="block text-sm text-slate-600 font-cairo"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* FINAL CTA */}
            <section
              style={{
                background: `linear-gradient(135deg, ${palette.primary}, ${palette.dark})`,
              }}
              className="text-white"
            >
              <div className="max-w-4xl mx-auto px-6 py-16 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 font-cairo">جاهز لبدء التحوّل؟</h2>
                <Editable
                  as="p"
                  value={content.guarantee_text}
                  onChange={(v) => setContent({ ...content, guarantee_text: v })}
                  className="block text-white/80 font-cairo mb-8 max-w-2xl mx-auto"
                />
                <button
                  className="px-10 py-4 rounded-full font-bold text-lg shadow-2xl hover:scale-105 transition-transform font-cairo inline-flex items-center gap-2"
                  style={{ background: palette.accent, color: '#fff' }}
                >
                  <Check className="w-5 h-5" /> {content.cta_primary}
                </button>
              </div>
            </section>
          </div>
        </Card>
      )}
    </div>
  );
}
