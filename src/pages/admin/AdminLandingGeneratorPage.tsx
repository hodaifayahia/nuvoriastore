import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Download, RefreshCw, Star, ArrowLeft, Zap, Shield, Heart, Rocket, Loader2, Flame, Award, Truck } from 'lucide-react';
import { toast } from 'sonner';

type Tone = 'Premium' | 'Playful' | 'Clinical' | 'Bold';

interface Palette {
  bg?: string; surface?: string; accent?: string; accent2?: string; ink?: string; onAccent?: string;
}
interface Content {
  productName: string;
  productDescription: string;
  headline: string;
  tagline: string;
  ctaText: string;
  hypeWords: string[];
  palette?: Palette;
  benefits: { title: string; icon?: string; imagePrompt?: string }[];
  testimonials: { name: string; quote: string; city: string }[];
  trustBadges: string[];
}
interface Images {
  hero: string | null;
  lifestyle: string | null;
  detail: string | null;
  inUse: string | null;
  before: string | null;
  after: string | null;
  packaging: string | null;
  benefit0: string | null;
  benefit1: string | null;
  benefit2: string | null;
}

const TONE_FALLBACK: Record<Tone, Palette> = {
  Premium:  { bg: '#0b0b12', surface: '#1a1330', accent: '#d4a24a', accent2: '#8b6b2f', ink: '#ffffff', onAccent: '#0b0b12' },
  Playful:  { bg: '#fff1f2', surface: '#fce7f3', accent: '#e11d74', accent2: '#f472b6', ink: '#3b0764', onAccent: '#ffffff' },
  Clinical: { bg: '#eff6ff', surface: '#ecfeff', accent: '#0369a1', accent2: '#38bdf8', ink: '#0c4a6e', onAccent: '#ffffff' },
  Bold:     { bg: '#0a0a0a', surface: '#450a0a', accent: '#ef4444', accent2: '#f97316', ink: '#ffffff', onAccent: '#0a0a0a' },
};

const ICONS: Record<string, any> = { zap: Zap, shield: Shield, heart: Heart, flame: Flame, award: Award };

function ensureFonts() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lp-arabic-font')) return;
  const l = document.createElement('link');
  l.id = 'lp-arabic-font';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Playfair+Display:wght@700;900&display=swap';
  document.head.appendChild(l);
}

function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton className="h-[70vh] rounded-3xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export default function AdminLandingGeneratorPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [tone, setTone] = useState<Tone>('Premium');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const emptyImages: Images = { hero: null, lifestyle: null, detail: null, inUse: null, before: null, after: null, packaging: null, benefit0: null, benefit1: null, benefit2: null };
  const [images, setImages] = useState<Images>(emptyImages);
  const [prompts, setPrompts] = useState<any>(null);
  const [regen, setRegen] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ensureFonts(); }, []);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) await supabase.auth.signInAnonymously();
    })();
  }, []);

  const palette: Palette = { ...TONE_FALLBACK[tone], ...(content?.palette || {}) };
  const isDark = (() => {
    const hex = (palette.bg || '#ffffff').replace('#','');
    if (hex.length < 6) return false;
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    return (0.299*r + 0.587*g + 0.114*b) < 140;
  })();
  const ink = palette.ink || (isDark ? '#ffffff' : '#0b0b12');
  const accent = palette.accent || '#d4a24a';
  const accent2 = palette.accent2 || accent;
  const bg = palette.bg || '#ffffff';
  const surface = palette.surface || bg;
  const onAccent = palette.onAccent || '#ffffff';

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error('الصورة كبيرة جداً (الحد 8MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadedImage) { toast.error('يرجى رفع صورة المنتج'); return; }
    setLoading(true); setContent(null);
    setImages(emptyImages);
    setPageId(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-landing-page', {
        body: { referenceImage: uploadedImage, price: price.trim(), tone, mode: 'full' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setContent(data.content); setImages(data.images); setPrompts(data.prompts); setPageId(data.id || null);
      toast.success('تم إنشاء صفحة الهبوط');
    } catch (err: any) { toast.error(err.message || 'فشل الإنشاء'); }
    finally { setLoading(false); }
  }

  async function regenerateImage(section: keyof Images) {
    if (section === 'hero') { toast.info('الصورة الرئيسية من رفعك — ارفع صورة جديدة لتغييرها'); return; }
    if (!prompts?.[section]) return;
    setRegen(section);
    try {
      const { data, error } = await supabase.functions.invoke('generate-landing-page', {
        body: { mode: 'image', section, imagePrompt: prompts[section] },
      });
      if (error) throw error;
      if (data?.image) setImages(s => ({ ...s, [section]: data.image }));
    } catch (err: any) { toast.error(err.message); }
    finally { setRegen(null); }
  }

  function exportHTML() {
    if (!previewRef.current) return;
    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${content?.productName || 'صفحة'}</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet"><script src="https://cdn.tailwindcss.com"></script><style>body{font-family:'Tajawal',sans-serif;margin:0}</style></head><body>${previewRef.current.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${(content?.productName || 'landing').replace(/\s+/g, '-')}.html`; a.click();
  }

  function ImageWithRegen({ src, section, className }: any) {
    return (
      <div className={`relative group overflow-hidden ${className}`}>
        {src ? <img src={src} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
             : <div className="w-full h-full bg-slate-200 animate-pulse" />}
        {section !== 'hero' && (
          <button onClick={() => regenerateImage(section)} disabled={regen === section}
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            {regen === section ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white" style={{ fontFamily: "'Tajawal', system-ui, sans-serif" }}>
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3">
              <span className="inline-flex w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <Rocket className="w-5 h-5" />
              </span>
              مولّد صفحات الهبوط
            </h1>
            <p className="text-slate-500 mt-2">ارفع صورة المنتج + السعر، واحصل على صفحة بصرية جاهزة.</p>
          </div>
          {content && (
            <Button onClick={exportHTML} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl">
              <Download className="w-4 h-4 ml-2" /> تحميل HTML
            </Button>
          )}
        </div>

        {/* Form */}
        <Card className="p-6 sm:p-8 mb-10 rounded-3xl shadow-xl border border-slate-100 bg-white/80 backdrop-blur">
          <form onSubmit={handleGenerate} className="grid md:grid-cols-3 gap-5">
            <div className="md:col-span-3 space-y-2">
              <Label>صورة المنتج *</Label>
              <label className="relative flex items-center justify-center h-56 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 cursor-pointer overflow-hidden group">
                {uploadedImage ? (
                  <>
                    <img src={uploadedImage} alt="" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-medium transition">اضغط للتغيير</div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-3 flex items-center justify-center text-white shadow-lg">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-700">ارفع صورة المنتج</p>
                    <p className="text-xs text-slate-500 mt-1">PNG أو JPG — حتى 8MB</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFile} />
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">السعر</Label>
              <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="مثال: 4500 دج" className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label>الأسلوب البصري</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Premium">فاخر — داكن وراقٍ</SelectItem>
                  <SelectItem value="Playful">مرح — ألوان زاهية</SelectItem>
                  <SelectItem value="Clinical">علمي — نظيف وأبيض</SelectItem>
                  <SelectItem value="Bold">جريء — تباين عالٍ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading || !uploadedImage} className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                {loading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جارٍ الإنشاء…</> : <><Sparkles className="w-4 h-4 ml-2" />إنشاء</>}
              </Button>
            </div>
          </form>
        </Card>

        {loading && <SkeletonPage />}

        {content && (
          <div ref={previewRef} dir="rtl" className="rounded-3xl overflow-hidden shadow-2xl border border-slate-100" style={{ background: '#fff' }}>
            {/* ============ HERO — image dominant ============ */}
            <section className="relative min-h-[85vh] flex items-end overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
              {images.hero && (
                <img src={images.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              )}
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, ${theme.from}dd 70%, ${theme.from} 100%)` }} />
              <div className="absolute top-8 right-8 flex gap-2">
                {content.hypeWords?.slice(0, 3).map((w, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-black tracking-widest backdrop-blur border" style={{ color: ink, borderColor: `${ink}30`, background: `${ink}10` }}>{w}</span>
                ))}
              </div>
              <div className="relative z-10 w-full px-6 sm:px-14 pb-16 sm:pb-24">
                <div className="max-w-4xl">
                  <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: theme.accent, color: '#fff' }}>
                    <Flame className="w-3.5 h-3.5" /> جديد
                  </div>
                  <h1 className="text-5xl sm:text-7xl md:text-8xl font-black leading-[1.05] mb-4" style={{ color: ink }}>
                    {content.headline}
                  </h1>
                  <p className="text-xl sm:text-2xl font-medium mb-8 opacity-80" style={{ color: ink }}>{content.tagline}</p>
                  <div className="flex flex-wrap items-center gap-5">
                    <button className="px-10 py-5 rounded-full font-black text-lg shadow-2xl hover:scale-105 transition" style={{ background: theme.accent, color: '#fff' }}>
                      {content.ctaText} ←
                    </button>
                    {price && (
                      <div style={{ color: ink }}>
                        <div className="text-3xl sm:text-5xl font-black" style={{ fontFamily: "'Playfair Display', serif" }}>{price}</div>
                        <div className="text-xs opacity-70">شامل التوصيل</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ============ HYPE STRIP ============ */}
            <section className="py-6 overflow-hidden" style={{ background: theme.accent }}>
              <div className="flex gap-12 justify-center flex-wrap px-6" style={{ color: '#fff' }}>
                {content.trustBadges?.slice(0, 4).map((b, i) => (
                  <div key={i} className="flex items-center gap-2 font-black uppercase tracking-widest text-sm">
                    <Truck className="w-4 h-4" /> {b}
                  </div>
                ))}
              </div>
            </section>

            {/* ============ IMAGE GRID — lifestyle + detail ============ */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-black">
              <ImageWithRegen src={images.lifestyle} section="lifestyle" className="aspect-square md:aspect-auto md:row-span-2" />
              <ImageWithRegen src={images.detail} section="detail" className="aspect-square" />
              <ImageWithRegen src={images.inUse} section="inUse" className="aspect-square md:col-span-2 md:row-span-2" />
              <ImageWithRegen src={images.packaging} section="packaging" className="aspect-square" />
            </section>

            {/* ============ BENEFITS — icon only, minimal words ============ */}
            <section className="py-24 px-6 sm:px-14 text-center" style={{ background: '#fafafa' }}>
              <div className="text-xs font-black tracking-[0.3em] mb-4" style={{ color: theme.accent }}>لماذا هذا المنتج</div>
              <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
                {content.benefits?.slice(0, 3).map((b, i) => {
                  const Icon = ICONS[b.icon || 'zap'] || Zap;
                  return (
                    <div key={i} className="group">
                      <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition" style={{ background: `${theme.accent}15`, color: theme.accent }}>
                        <Icon className="w-9 h-9" strokeWidth={2.5} />
                      </div>
                      <div className="font-black text-lg sm:text-xl">{b.title}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ============ BEFORE / AFTER — split-screen ============ */}
            <section className="grid md:grid-cols-2">
              <div className="relative aspect-square md:aspect-auto min-h-[60vh]">
                <ImageWithRegen src={images.before} section="before" className="absolute inset-0" />
                <div className="absolute bottom-6 right-6 px-4 py-2 rounded-full font-black text-sm bg-slate-800 text-white uppercase tracking-widest">قبل</div>
              </div>
              <div className="relative aspect-square md:aspect-auto min-h-[60vh]">
                <ImageWithRegen src={images.after} section="after" className="absolute inset-0" />
                <div className="absolute bottom-6 right-6 px-4 py-2 rounded-full font-black text-sm text-white uppercase tracking-widest" style={{ background: theme.accent }}>بعد</div>
              </div>
            </section>

            {/* ============ HOW IT WORKS — 3 huge numbers ============ */}
            <section className="py-24 px-6 sm:px-14" style={{ background: theme.from, color: '#fff' }}>
              <div className="text-xs font-black tracking-[0.3em] text-center mb-16 opacity-70">كيف يعمل</div>
              <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
                {content.howItWorks?.slice(0, 3).map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-8xl font-black mb-4 opacity-20" style={{ fontFamily: "'Playfair Display', serif", color: theme.accent }}>0{i + 1}</div>
                    <div className="text-2xl font-black">{s.title}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* ============ TESTIMONIALS — image-forward cards ============ */}
            <section className="py-24 px-6 sm:px-14" style={{ background: '#fafafa' }}>
              <div className="text-xs font-black tracking-[0.3em] mb-4 text-center" style={{ color: theme.accent }}>آراء العملاء</div>
              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-10">
                {content.testimonials?.slice(0, 3).map((t, i) => (
                  <div key={i} className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition">
                    <div className="flex mb-3" style={{ color: theme.accent }}>
                      {[0,1,2,3,4].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
                    </div>
                    <p className="text-lg font-medium mb-6 leading-relaxed">«{t.quote}»</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black" style={{ background: theme.accent }}>
                        {t.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black">{t.name}</div>
                        <div className="text-xs text-slate-500">{t.city}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ============ FINAL CTA — full image ============ */}
            <section className="relative min-h-[75vh] flex items-center justify-center text-center overflow-hidden" style={{ background: theme.from }}>
              {images.packaging && (
                <img src={images.packaging} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
              )}
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.from}cc, ${theme.from})` }} />
              <div className="relative z-10 px-6 max-w-3xl">
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-black tracking-widest" style={{ background: theme.accent, color: '#fff' }}>
                  <Flame className="w-3.5 h-3.5" /> عرض محدود
                </div>
                <h2 className="text-5xl sm:text-7xl font-black mb-6" style={{ color: ink }}>{content.headline}</h2>
                {price && <div className="text-5xl sm:text-6xl font-black mb-8" style={{ color: theme.accent, fontFamily: "'Playfair Display', serif" }}>{price}</div>}
                <button className="px-12 py-5 rounded-full font-black text-xl shadow-2xl hover:scale-105 transition" style={{ background: theme.accent, color: '#fff' }}>
                  {content.ctaText} ←
                </button>
              </div>
            </section>
          </div>
        )}

        {!loading && !content && (
          <Card className="p-16 text-center rounded-3xl border-dashed border-2 border-slate-200 bg-white/50">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-black mb-2">ستظهر صفحة الهبوط هنا</h3>
            <p className="text-slate-500">ارفع صورة المنتج وأدخل السعر ثم اضغط إنشاء.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
