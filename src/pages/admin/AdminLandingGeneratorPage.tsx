import { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Loader2, Star, ShieldCheck, Truck, RefreshCw, Check, Download, Trash2, Award, ChevronDown, Clock, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Palette {
  primary: string;
  accent: string;
  dark: string;
  light: string;
  soft: string;
}

interface GeneratedImages {
  hero: string | null;
  lifestyle: string | null;
  before: string | null;
  after: string | null;
}

interface Content {
  headline: string;
  subheadline: string;
  description: string;
  cta_primary: string;
  cta_secondary: string;
  before_after: { before_text: string; after_text: string; switch_line: string };
  testimonials: { name: string; text: string; rating: number }[];
  social_proof_stats: { number: string; label: string }[];
  authority_text: string;
  how_it_works: { icon: string; title: string; description: string }[];
  ingredients: { icon: string; title: string; description: string }[];
  guarantee_text: string;
  urgency_text: string;
  faq: { question: string; answer: string }[];
}

// Contrast helper — decide if text should be light or dark on top of a hex
function contrastText(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0a0a1a' : '#ffffff';
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

// Extract dominant colors from an image via canvas sampling
async function extractPalette(imgUrl: string): Promise<Palette> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = (canvas.width = 100);
      const h = (canvas.height = 100);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const buckets: Record<string, { r: number; g: number; b: number; c: number; s: number }> = {};
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 200) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        // skip near-white/near-black to bias toward brand hues
        if (max > 240 && min > 240) continue;
        if (max < 25) continue;
        const sat = max === 0 ? 0 : (max - min) / max;
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
        const bkt = buckets[key] || { r: 0, g: 0, b: 0, c: 0, s: 0 };
        bkt.r += r; bkt.g += g; bkt.b += b; bkt.c++; bkt.s += sat;
        buckets[key] = bkt;
      }
      // score by frequency × saturation to get real brand colors instead of muted greys
      const sorted = Object.values(buckets).sort((a, b) => (b.c * (1 + b.s / b.c)) - (a.c * (1 + a.s / a.c))).slice(0, 5);
      if (!sorted.length) {
        return resolve({ primary: '#1a1a2e', accent: '#c9a961', dark: '#0a0a15', light: '#fdfcf7', soft: '#f5f2eb' });
      }
      const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
      const rgb = (b: typeof sorted[number]) => `#${toHex(b.r / b.c)}${toHex(b.g / b.c)}${toHex(b.b / b.c)}`;
      const primary = rgb(sorted[0]);
      const accent = rgb(sorted[1] || sorted[0]);
      const p = sorted[0];
      const pr = p.r / p.c, pg = p.g / p.c, pb = p.b / p.c;
      const dark = `#${toHex(pr * 0.18)}${toHex(pg * 0.18)}${toHex(pb * 0.18)}`;
      const soft = `#${toHex(pr * 0.1 + 245 * 0.9)}${toHex(pg * 0.1 + 245 * 0.9)}${toHex(pb * 0.1 + 245 * 0.9)}`;
      const light = '#fdfcf7';
      resolve({ primary, accent, dark, light, soft });
    };
    img.onerror = () => resolve({ primary: '#1a1a2e', accent: '#c9a961', dark: '#0a0a15', light: '#fdfcf7', soft: '#f5f2eb' });
    img.src = imgUrl;
  });
}

const DEFAULT_CONTENT = (name: string): Content => ({
  headline: `${name} — تجربة استثنائية بمعايير عالمية`,
  subheadline: 'حرفية دقيقة، تصميم مدروس، ونتائج تشعر بها من اللحظة الأولى. صُنع لمن لا يرضى إلا بالأفضل.',
  description: 'كل تفصيل في هذا المنتج نتج عن هوس بالكمال — من اختيار المواد إلى أدق لمسات التشطيب.\n\nنؤمن أن الرفاهية الحقيقية تكمن في التفاصيل التي لا تُرى، لكنها تُحسّ. لذلك جمعنا نخبة من الحرفيين لصياغة تجربة لا تُنسى.\n\nاستثمر في ذوقك — واحصل على قطعة تدوم لسنوات، لا لموسم.',
  cta_primary: 'احجز قطعتك الآن',
  cta_secondary: 'اكتشف التفاصيل',
  before_after: {
    before_text: 'حلول متوسطة، جودة مخيّبة، إحساس بأنك تستحق أفضل — لكنك لم تجده بعد.',
    after_text: 'راحة فورية، ثقة تلمسها، وتجربة راقية تعيد تعريف ما تتوقعه من المنتج.',
    switch_line: 'انضم إلى آلاف العملاء الذين اختاروا ألا يتنازلوا عن أفضل ما يستحقونه.',
  },
  testimonials: [
    { name: 'أمينة ب. — الجزائر العاصمة', text: 'الجودة تفوق كل توقعاتي. أستخدمه يومياً منذ ٣ أشهر ومازلت مذهولة بالتفاصيل والأناقة.', rating: 5 },
    { name: 'كريم م. — وهران', text: 'دفعت أكثر لكن حصلت على ضعف القيمة. التشطيبات راقية والأداء ممتاز. أنصح به بقوة.', rating: 5 },
    { name: 'ليلى ح. — قسنطينة', text: 'التسليم كان سريعاً والتغليف يليق بمنتج فاخر. تجربة شراء متكاملة من البداية للنهاية.', rating: 5 },
  ],
  social_proof_stats: [
    { number: '+50,000', label: 'عميل مميّز' },
    { number: '4.9/5', label: 'تقييم موثّق' },
    { number: '99%', label: 'رضا مطلق' },
  ],
  authority_text: 'مختبَر وفق أعلى المعايير الدولية — موصى به من خبراء الجودة والتصميم.',
  how_it_works: [
    { icon: '1', title: 'اطلب قطعتك', description: 'املأ النموذج البسيط في أقل من دقيقة، بدون تعقيدات.' },
    { icon: '2', title: 'تسليم فاخر', description: 'يصلك في تغليف أنيق يعكس قيمة ما اخترته.' },
    { icon: '3', title: 'استمتع بالتحوّل', description: 'ستشعر بالفرق منذ الاستخدام الأول — نضمن لك ذلك.' },
  ],
  ingredients: [
    { icon: '✦', title: 'خامات فاخرة', description: 'مواد مختارة يدوياً توفّر متانة ولمعاناً يدوم لسنوات.' },
    { icon: '◆', title: 'دقة حرفية', description: 'كل قطعة تمر بمراحل جودة صارمة قبل أن تصلك.' },
    { icon: '⟡', title: 'أداء استثنائي', description: 'تقنيات متقدمة تضمن نتائج ملموسة من أول استخدام.' },
    { icon: '❖', title: 'تصميم أيقوني', description: 'خطوط أنيقة وتشطيبات ترتقي بذوقك في كل تفصيل.' },
  ],
  guarantee_text: 'ضمان شامل لمدة ١٤ يوماً — استرداد كامل، بدون أي أسئلة.',
  urgency_text: '⚡ عرض حصري لفترة محدودة — الكميات في نفاد سريع',
  faq: [
    { question: 'ما مدى جودة المنتج فعلاً؟', answer: 'نستخدم أعلى مستويات الجودة ونتبع معايير عالمية في التصنيع. كل قطعة تمر بفحص دقيق قبل الشحن.' },
    { question: 'كم تستغرق مدة التسليم؟', answer: 'التسليم يتم خلال ٢٤-٧٢ ساعة إلى جميع ولايات الجزائر بأمان تام.' },
    { question: 'هل يمكنني الإرجاع؟', answer: 'نعم، لديك ١٤ يوماً كاملة لاسترداد أموالك بدون أي أسئلة، مع تحمّلنا لتكاليف الإرجاع.' },
    { question: 'كيف أدفع؟', answer: 'الدفع عند الاستلام متاح في كل الولايات. كما نقبل الدفع الإلكتروني (بريدي موب).' },
  ],
});

// Editable text via contentEditable — no jitter, minimal re-renders
function Editable({
  value, onChange, className, style, as: Tag = 'span',
}: { value: string; onChange: (v: string) => void; className?: string; style?: React.CSSProperties; as?: any }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);
  return (
    <Tag
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: any) => onChange(e.currentTarget.innerText)}
      className={`outline-none focus:ring-2 focus:ring-primary/40 focus:rounded-sm px-0.5 -mx-0.5 ${className || ''}`}
      style={style}
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
  const [imagesLoading, setImagesLoading] = useState(false);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [images, setImages] = useState<GeneratedImages>({ hero: null, lifestyle: null, before: null, after: null });
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleUpload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) return toast.error('حجم الصورة يجب أن يكون أقل من 8MB');
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
      const base = DEFAULT_CONTENT(productName);
      const merged: Content = {
        headline: ai?.headline || base.headline,
        subheadline: ai?.subheadline || base.subheadline,
        description: ai?.description || base.description,
        cta_primary: ai?.cta_primary || base.cta_primary,
        cta_secondary: ai?.cta_secondary || base.cta_secondary,
        before_after: ai?.before_after || base.before_after,
        testimonials: ai?.testimonials?.length ? ai.testimonials : base.testimonials,
        social_proof_stats: ai?.social_proof_stats?.length ? ai.social_proof_stats : base.social_proof_stats,
        authority_text: ai?.authority_text || base.authority_text,
        how_it_works: ai?.how_it_works?.length ? ai.how_it_works : base.how_it_works,
        ingredients: ai?.benefits?.length
          ? ai.benefits.map((b: any) => ({ icon: b.icon || '✦', title: b.title, description: b.text }))
          : base.ingredients,
        guarantee_text: ai?.guarantee_text || base.guarantee_text,
        urgency_text: ai?.urgency_text || base.urgency_text,
        faq: ai?.faq?.length ? ai.faq : base.faq,
      };
      setContent(merged);
      toast.success('تم توليد المحتوى ✨ — جاري إنشاء الصور...');

      // Kick off AI photo generation in parallel (doesn't block content)
      setImagesLoading(true);
      supabase.functions
        .invoke('generate-landing-images', {
          body: { productName, description: description || '', referenceImage: image },
        })
        .then((imgRes) => {
          if (imgRes.error) throw imgRes.error;
          const d = imgRes.data || {};
          setImages({
            hero: d.hero || null,
            lifestyle: d.lifestyle || null,
            before: d.before || null,
            after: d.after || null,
          });
          const count = [d.hero, d.lifestyle, d.before, d.after].filter(Boolean).length;
          if (count > 0) toast.success(`تم إنشاء ${count} صورة احترافية 📸`);
          else toast.warning('تعذّر توليد الصور — الصفحة جاهزة بدون صور إضافية');
        })
        .catch((e) => {
          console.warn('image gen failed', e);
          toast.warning('تعذّر توليد الصور الإضافية');
        })
        .finally(() => setImagesLoading(false));
    } catch (err: any) {
      console.warn('AI generation failed, using defaults:', err);
      setContent(DEFAULT_CONTENT(productName));
      toast.warning('تعذّر الاتصال بالذكاء الاصطناعي — تم استخدام محتوى فاخر افتراضي قابل للتعديل');
    } finally {
      setLoading(false);
    }
  };

  const handleExportHTML = () => {
    if (!previewRef.current) return;
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${productName}</title><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet"><script src="https://cdn.tailwindcss.com"></script><style>body{font-family:'Cairo',sans-serif}.font-serif-lux{font-family:'Playfair Display',serif}</style></head><body>${previewRef.current.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${productName || 'landing'}.html`;
    a.click();
  };

  const reset = () => {
    setImage(null); setContent(null); setPalette(null);
    setImages({ hero: null, lifestyle: null, before: null, after: null });
    setProductName(''); setDescription(''); setPrice(''); setOldPrice('');
  };

  // Inject Playfair Display for the preview (loaded once, harmless if already present)
  useEffect(() => {
    if (document.getElementById('lp-playfair-font')) return;
    const link = document.createElement('link');
    link.id = 'lp-playfair-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&display=swap';
    document.head.appendChild(link);
  }, []);

  const p = palette;
  const ctaText = p ? contrastText(p.primary) : '#fff';
  const accentText = p ? contrastText(p.accent) : '#0a0a1a';
  const discount = oldPrice && price ? Math.round((1 - Number(price) / Number(oldPrice)) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-cairo font-bold text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            مولّد صفحات الهبوط الفاخرة
          </h1>
          <p className="text-sm text-muted-foreground font-cairo mt-1">
            ارفع صورة منتج — واحصل على صفحة هبوط بمستوى العلامات التجارية العالمية، مصممة بالذكاء الاصطناعي.
          </p>
        </div>
        {content && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              disabled={imagesLoading || !image}
              onClick={() => {
                if (!image) return;
                setImagesLoading(true);
                supabase.functions
                  .invoke('generate-landing-images', {
                    body: { productName, description: description || '', referenceImage: image },
                  })
                  .then((r) => {
                    if (r.error) throw r.error;
                    const d = r.data || {};
                    setImages({ hero: d.hero || null, lifestyle: d.lifestyle || null, before: d.before || null, after: d.after || null });
                    toast.success('تم تحديث الصور 📸');
                  })
                  .catch(() => toast.error('فشل توليد الصور'))
                  .finally(() => setImagesLoading(false));
              }}
              className="gap-2"
            >
              {imagesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {imagesLoading ? 'يتم إنشاء الصور...' : 'إعادة توليد الصور'}
            </Button>
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
                  <img src={image} alt="preview" className="max-h-48 mx-auto rounded-lg shadow-lg" />
                  {palette && (
                    <div className="flex gap-2 justify-center items-center flex-wrap">
                      {[palette.primary, palette.accent, palette.dark, palette.soft].map((c) => (
                        <div key={c} className="w-8 h-8 rounded-full border-2 border-white shadow-md" style={{ background: c }} title={c} />
                      ))}
                      <span className="text-xs text-muted-foreground font-mono">لوحة ألوان مستخرجة تلقائياً</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="font-cairo text-sm">اضغط أو اسحب صورة المنتج هنا</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG — حتى 8MB (يفضّل خلفية شفافة)</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="font-cairo mb-1 block">اسم المنتج *</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="مثال: ساعة ذكية Pro X" />
            </div>
            <div>
              <Label className="font-cairo mb-1 block">فئة / وصف مختصر</Label>
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
            {loading ? 'الذكاء الاصطناعي يصمم صفحتك الفاخرة...' : 'توليد صفحة الهبوط بالذكاء الاصطناعي'}
          </Button>
        </Card>
      )}

      {content && p && image && (
        <Card className="overflow-hidden shadow-2xl">
          <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground font-cairo border-b flex items-center justify-between">
            <span>💎 معاينة مباشرة — انقر على أي نص للتعديل. الألوان مستخرجة من صورة منتجك.</span>
          </div>
          <div ref={previewRef} className="lp-preview" style={{ background: p.light }}>
            {/* URGENCY BAR */}
            <div className="text-center py-2 text-xs md:text-sm font-cairo font-semibold tracking-wide"
              style={{ background: p.dark, color: '#fff' }}>
              <Editable
                as="span"
                value={content.urgency_text}
                onChange={(v) => setContent({ ...content, urgency_text: v })}
              />
            </div>

            {/* HERO */}
            <section className="relative overflow-hidden"
              style={{ background: `radial-gradient(ellipse at top right, ${hexWithAlpha(p.accent, 0.18)}, transparent 55%), radial-gradient(ellipse at bottom left, ${hexWithAlpha(p.primary, 0.12)}, transparent 55%), ${p.light}` }}>
              {/* AI-generated hero background */}
              {images.hero && (
                <>
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ backgroundImage: `url(${images.hero})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.25 }} />
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(180deg, ${hexWithAlpha(p.light, 0.7)} 0%, ${hexWithAlpha(p.light, 0.95)} 100%)` }} />
                </>
              )}
              {/* decorative orbs */}
              <div className="pointer-events-none absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-30"
                style={{ background: p.accent }} />
              <div className="pointer-events-none absolute -bottom-32 -left-20 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
                style={{ background: p.primary }} />

              <div className="relative max-w-6xl mx-auto px-6 py-14 md:py-24 grid md:grid-cols-2 gap-10 items-center">
                <div className="space-y-6 order-2 md:order-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase"
                    style={{ background: hexWithAlpha(p.primary, 0.08), color: p.primary, border: `1px solid ${hexWithAlpha(p.primary, 0.2)}` }}>
                    <Award className="w-3.5 h-3.5" /> إصدار محدود · صناعة فاخرة
                  </div>

                  <Editable
                    as="h1"
                    value={content.headline}
                    onChange={(v) => setContent({ ...content, headline: v })}
                    className="block text-4xl md:text-6xl leading-[1.1] tracking-tight"
                    style={{ color: p.dark, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
                  />

                  <Editable
                    as="p"
                    value={content.subheadline}
                    onChange={(v) => setContent({ ...content, subheadline: v })}
                    className="block text-lg leading-relaxed font-cairo max-w-xl"
                    style={{ color: `${p.dark}cc` }}
                  />

                  {/* Star aggregate */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm font-cairo font-semibold" style={{ color: p.dark }}>4.9/5</span>
                    <span className="text-xs text-slate-500 font-cairo">من +2,400 تقييم موثّق</span>
                  </div>

                  {/* Price block */}
                  {price && (
                    <div className="flex items-center gap-4 flex-wrap pt-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black font-cairo" style={{ color: p.primary }}>{price}</span>
                        <span className="text-lg font-cairo" style={{ color: p.primary }}>دج</span>
                      </div>
                      {oldPrice && (
                        <span className="text-xl text-slate-400 line-through font-cairo">{oldPrice} دج</span>
                      )}
                      {discount > 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold font-cairo"
                          style={{ background: p.dark, color: '#fff' }}>
                          وفّر {discount}%
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Editable
                      as="button"
                      value={content.cta_primary}
                      onChange={(v) => setContent({ ...content, cta_primary: v })}
                      className="px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition-all font-cairo text-base"
                      style={{ background: p.primary, color: ctaText, boxShadow: `0 10px 30px ${hexWithAlpha(p.primary, 0.4)}` }}
                    />
                    <Editable
                      as="button"
                      value={content.cta_secondary}
                      onChange={(v) => setContent({ ...content, cta_secondary: v })}
                      className="px-8 py-4 rounded-full font-bold border-2 hover:bg-black/5 transition-colors font-cairo"
                      style={{ borderColor: p.primary, color: p.primary }}
                    />
                  </div>

                  <div className="flex items-center gap-5 text-xs text-slate-500 font-cairo pt-3 flex-wrap">
                    <span className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> شحن سريع لكل الجزائر</span>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> ضمان ١٤ يوم</span>
                    <span className="flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> إرجاع مجاني</span>
                  </div>
                </div>

                {/* PRODUCT SHOWCASE */}
                <div className="order-1 md:order-2 relative flex justify-center">
                  {/* glow */}
                  <div className="absolute inset-0 rounded-full blur-3xl opacity-60 scale-90"
                    style={{ background: `radial-gradient(circle, ${p.accent}, transparent 70%)` }} />
                  {/* frame */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-[2.5rem] rotate-6"
                      style={{ background: `linear-gradient(135deg, ${p.accent}, ${p.primary})`, opacity: 0.15 }} />
                    <div className="relative rounded-[2.5rem] p-8 backdrop-blur-sm"
                      style={{ background: `linear-gradient(135deg, ${hexWithAlpha('#ffffff', 0.7)}, ${hexWithAlpha(p.soft, 0.4)})`, border: `1px solid ${hexWithAlpha(p.primary, 0.1)}` }}>
                      <img src={image} alt={productName} className="w-full max-w-md drop-shadow-2xl" />
                    </div>
                    {/* floating badge */}
                    <div className="absolute -top-4 -left-4 md:-left-8 rounded-full px-4 py-3 shadow-2xl rotate-[-8deg]"
                      style={{ background: p.dark, color: '#fff' }}>
                      <div className="text-[10px] font-cairo opacity-70">جودة</div>
                      <div className="text-lg font-black font-cairo" style={{ color: p.accent }}>Premium</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* TRUST STATS BAR */}
            <section style={{ background: p.dark, color: '#fff' }} className="relative overflow-hidden">
              <div className="absolute inset-0 opacity-10"
                style={{ background: `radial-gradient(circle at 30% 50%, ${p.accent}, transparent 50%)` }} />
              <div className="relative max-w-6xl mx-auto px-6 py-10 grid grid-cols-3 gap-6 text-center">
                {content.social_proof_stats.map((s, i) => (
                  <div key={i} className="relative">
                    {i > 0 && <div className="absolute top-2 bottom-2 right-0 w-px opacity-20 bg-white" />}
                    <Editable
                      as="div" value={s.number}
                      onChange={(v) => { const a = [...content.social_proof_stats]; a[i] = { ...a[i], number: v }; setContent({ ...content, social_proof_stats: a }); }}
                      className="block text-3xl md:text-5xl font-black tracking-tight"
                      style={{ color: p.accent, fontFamily: "'Playfair Display', serif" }}
                    />
                    <Editable
                      as="div" value={s.label}
                      onChange={(v) => { const a = [...content.social_proof_stats]; a[i] = { ...a[i], label: v }; setContent({ ...content, social_proof_stats: a }); }}
                      className="block text-xs md:text-sm text-white/60 font-cairo mt-2 uppercase tracking-widest"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* BEFORE / AFTER */}
            <section style={{ background: p.light }}>
              <div className="max-w-5xl mx-auto px-6 py-20">
                <div className="text-center mb-14">
                  <div className="inline-block px-3 py-1 rounded-full text-xs uppercase tracking-widest font-bold mb-4"
                    style={{ background: hexWithAlpha(p.primary, 0.08), color: p.primary }}>
                    التحوّل
                  </div>
                  <h2 className="text-4xl md:text-5xl mb-4"
                    style={{ color: p.dark, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                    الفرق يُلمس، لا يوصف
                  </h2>
                  <Editable
                    as="p"
                    value={content.before_after.switch_line}
                    onChange={(v) => setContent({ ...content, before_after: { ...content.before_after, switch_line: v } })}
                    className="block text-slate-600 font-cairo max-w-2xl mx-auto text-lg"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative rounded-3xl p-8 border overflow-hidden"
                    style={{ background: '#fafafa', borderColor: '#e5e5e5' }}>
                    <div className="absolute top-4 left-4 text-[9rem] font-black opacity-5 leading-none"
                      style={{ fontFamily: "'Playfair Display', serif" }}>01</div>
                    <div className="absolute -top-2 right-6 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest"
                      style={{ background: '#e5e5e5', color: '#666' }}>قبل</div>
                    {images.before && (
                      <div className="relative rounded-2xl overflow-hidden mb-5 aspect-video">
                        <img src={images.before} alt="before" className="w-full h-full object-cover grayscale-[40%]" />
                      </div>
                    )}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-2xl mb-4">😞</div>
                      <Editable
                        as="p"
                        value={content.before_after.before_text}
                        onChange={(v) => setContent({ ...content, before_after: { ...content.before_after, before_text: v } })}
                        className="block text-slate-600 font-cairo text-lg leading-relaxed"
                      />
                    </div>
                  </div>
                  <div className="relative rounded-3xl p-8 border overflow-hidden shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${hexWithAlpha(p.primary, 0.05)} 0%, ${hexWithAlpha(p.accent, 0.1)} 100%)`, borderColor: hexWithAlpha(p.primary, 0.2) }}>
                    <div className="absolute top-4 left-4 text-[9rem] font-black opacity-10 leading-none"
                      style={{ fontFamily: "'Playfair Display', serif", color: p.primary }}>02</div>
                    <div className="absolute -top-2 right-6 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest"
                      style={{ background: p.primary, color: ctaText }}>بعد</div>
                    {images.after && (
                      <div className="relative rounded-2xl overflow-hidden mb-5 aspect-video shadow-lg">
                        <img src={images.after} alt="after" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4"
                        style={{ background: hexWithAlpha(p.accent, 0.3) }}>✨</div>
                      <Editable
                        as="p"
                        value={content.before_after.after_text}
                        onChange={(v) => setContent({ ...content, before_after: { ...content.before_after, after_text: v } })}
                        className="block font-cairo text-lg leading-relaxed font-medium"
                        style={{ color: p.dark }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* AUTHORITY & TESTIMONIALS */}
            <section style={{ background: p.soft }}>
              <div className="max-w-6xl mx-auto px-6 py-20">
                <div className="text-center mb-14">
                  <div className="inline-block px-3 py-1 rounded-full text-xs uppercase tracking-widest font-bold mb-4"
                    style={{ background: hexWithAlpha(p.primary, 0.08), color: p.primary }}>
                    السلطة والثقة
                  </div>
                  <h2 className="text-4xl md:text-5xl mb-4"
                    style={{ color: p.dark, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                    يختارنا الأذكياء
                  </h2>
                  <Editable
                    as="p" value={content.authority_text}
                    onChange={(v) => setContent({ ...content, authority_text: v })}
                    className="block text-slate-600 font-cairo max-w-2xl mx-auto text-lg"
                  />
                  {/* Trust logos row */}
                  <div className="flex justify-center gap-4 mt-8 flex-wrap">
                    {['ISO 9001', 'CE Certified', '⭐ Trusted', 'Premium Quality', '100% Original'].map((b) => (
                      <div key={b} className="px-5 py-2.5 rounded-lg bg-white text-xs font-bold text-slate-600 shadow-sm font-cairo tracking-wide border border-slate-100">
                        {b}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {content.testimonials.map((t, i) => (
                    <div key={i} className="bg-white rounded-2xl p-7 shadow-lg border border-slate-100 relative">
                      <div className="absolute top-4 left-6 text-6xl leading-none opacity-10 font-black"
                        style={{ color: p.primary, fontFamily: "'Playfair Display', serif" }}>"</div>
                      <div className="flex mb-4 relative">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={`w-4 h-4 ${j < t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <Editable
                        as="p" value={t.text}
                        onChange={(v) => { const a = [...content.testimonials]; a[i] = { ...a[i], text: v }; setContent({ ...content, testimonials: a }); }}
                        className="block text-slate-700 font-cairo leading-relaxed mb-5 text-[15px]"
                      />
                      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})` }}>
                          {t.name.charAt(0)}
                        </div>
                        <Editable
                          as="div" value={t.name}
                          onChange={(v) => { const a = [...content.testimonials]; a[i] = { ...a[i], name: v }; setContent({ ...content, testimonials: a }); }}
                          className="block text-sm font-bold font-cairo"
                          style={{ color: p.dark }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* INGREDIENTS / MECHANISM */}
            <section style={{ background: p.light }}>
              <div className="max-w-6xl mx-auto px-6 py-20">
                <div className="text-center mb-14">
                  <div className="inline-block px-3 py-1 rounded-full text-xs uppercase tracking-widest font-bold mb-4"
                    style={{ background: hexWithAlpha(p.primary, 0.08), color: p.primary }}>
                    داخل التصميم
                  </div>
                  <h2 className="text-4xl md:text-5xl mb-4"
                    style={{ color: p.dark, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                    ما الذي يجعله استثنائياً؟
                  </h2>
                  <p className="text-slate-600 font-cairo text-lg max-w-2xl mx-auto">
                    كل عنصر مدروس بعناية، وكل تفصيل يخدم غاية واحدة: التميّز.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {content.ingredients.map((it, i) => (
                    <div key={i} className="group relative rounded-2xl p-7 text-center border transition-all hover:-translate-y-1 hover:shadow-2xl"
                      style={{ background: '#fff', borderColor: hexWithAlpha(p.primary, 0.1) }}>
                      <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-5 shadow-lg transition-transform group-hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})`, color: ctaText }}>
                        {it.icon}
                      </div>
                      <Editable
                        as="h3" value={it.title}
                        onChange={(v) => { const a = [...content.ingredients]; a[i] = { ...a[i], title: v }; setContent({ ...content, ingredients: a }); }}
                        className="block font-bold font-cairo mb-2 text-lg"
                        style={{ color: p.dark }}
                      />
                      <Editable
                        as="p" value={it.description}
                        onChange={(v) => { const a = [...content.ingredients]; a[i] = { ...a[i], description: v }; setContent({ ...content, ingredients: a }); }}
                        className="block text-sm text-slate-600 font-cairo leading-relaxed"
                      />
                    </div>
                  ))}
                </div>

                {/* How it works */}
                <div className="mt-24">
                  <div className="text-center mb-12">
                    <h3 className="text-3xl md:text-4xl"
                      style={{ color: p.dark, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                      كيف يعمل — بثلاث خطوات
                    </h3>
                  </div>
                  <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* connector line */}
                    <div className="hidden md:block absolute top-8 right-[16.66%] left-[16.66%] h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${hexWithAlpha(p.primary, 0.3)}, transparent)` }} />
                    {content.how_it_works.map((s, i) => (
                      <div key={i} className="text-center relative">
                        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-xl font-black mb-5 shadow-xl relative z-10"
                          style={{ background: p.light, color: p.primary, border: `2px solid ${p.primary}` }}>
                          {s.icon || i + 1}
                        </div>
                        <Editable
                          as="h4" value={s.title}
                          onChange={(v) => { const a = [...content.how_it_works]; a[i] = { ...a[i], title: v }; setContent({ ...content, how_it_works: a }); }}
                          className="block font-bold font-cairo mb-2 text-xl"
                          style={{ color: p.dark }}
                        />
                        <Editable
                          as="p" value={s.description}
                          onChange={(v) => { const a = [...content.how_it_works]; a[i] = { ...a[i], description: v }; setContent({ ...content, how_it_works: a }); }}
                          className="block text-sm text-slate-600 font-cairo max-w-xs mx-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section style={{ background: p.soft }}>
              <div className="max-w-3xl mx-auto px-6 py-20">
                <div className="text-center mb-10">
                  <div className="inline-block px-3 py-1 rounded-full text-xs uppercase tracking-widest font-bold mb-4"
                    style={{ background: hexWithAlpha(p.primary, 0.08), color: p.primary }}>
                    الأسئلة
                  </div>
                  <h2 className="text-4xl md:text-5xl"
                    style={{ color: p.dark, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                    كل ما تحتاج معرفته
                  </h2>
                </div>
                <div className="space-y-3">
                  {content.faq.map((f, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-5 text-right"
                      >
                        <Editable
                          as="span" value={f.question}
                          onChange={(v) => { const a = [...content.faq]; a[i] = { ...a[i], question: v }; setContent({ ...content, faq: a }); }}
                          className="font-bold font-cairo text-base"
                          style={{ color: p.dark }}
                        />
                        <ChevronDown className={`w-5 h-5 transition-transform shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} style={{ color: p.primary }} />
                      </button>
                      {openFaq === i && (
                        <div className="px-5 pb-5">
                          <Editable
                            as="p" value={f.answer}
                            onChange={(v) => { const a = [...content.faq]; a[i] = { ...a[i], answer: v }; setContent({ ...content, faq: a }); }}
                            className="block text-slate-600 font-cairo leading-relaxed"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* GUARANTEE STRIP */}
            <section className="border-y" style={{ background: p.light, borderColor: hexWithAlpha(p.primary, 0.1) }}>
              <div className="max-w-4xl mx-auto px-6 py-10 flex items-center justify-center gap-5 text-center flex-col md:flex-row">
                <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})`, color: ctaText }}>
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="text-center md:text-right">
                  <div className="font-bold font-cairo text-lg mb-1" style={{ color: p.dark }}>
                    ضمان الرضا التام
                  </div>
                  <Editable
                    as="p" value={content.guarantee_text}
                    onChange={(v) => setContent({ ...content, guarantee_text: v })}
                    className="block text-slate-600 font-cairo"
                  />
                </div>
              </div>
            </section>

            {/* FINAL CTA */}
            <section className="relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${p.dark} 0%, ${p.primary} 100%)`, color: '#fff' }}>
              <div className="absolute inset-0 opacity-20"
                style={{ background: `radial-gradient(circle at 20% 30%, ${p.accent}, transparent 40%), radial-gradient(circle at 80% 70%, ${p.accent}, transparent 40%)` }} />
              <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
                  style={{ background: hexWithAlpha('#ffffff', 0.1), color: p.accent, border: `1px solid ${hexWithAlpha(p.accent, 0.3)}` }}>
                  <Flame className="w-3.5 h-3.5" /> عرض محدود
                </div>
                <h2 className="text-4xl md:text-6xl mb-6"
                  style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                  حان وقت التحوّل
                </h2>
                <p className="text-white/70 font-cairo mb-10 max-w-2xl mx-auto text-lg">
                  انضم اليوم إلى آلاف العملاء الذين اختاروا الأفضل. الكمية محدودة، والفرصة لن تتكرر.
                </p>
                <button
                  className="px-10 py-5 rounded-full font-black text-lg shadow-2xl hover:scale-105 transition-transform font-cairo inline-flex items-center gap-3"
                  style={{ background: p.accent, color: accentText, boxShadow: `0 20px 60px ${hexWithAlpha(p.accent, 0.4)}` }}
                >
                  <Zap className="w-5 h-5" /> {content.cta_primary}
                </button>
                <div className="flex items-center justify-center gap-6 mt-8 text-xs text-white/50 font-cairo flex-wrap">
                  <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> دفع عند التسليم</span>
                  <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> شحن آمن</span>
                  <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> ضمان الاسترداد</span>
                </div>
              </div>
            </section>
          </div>
        </Card>
      )}
    </div>
  );
}
