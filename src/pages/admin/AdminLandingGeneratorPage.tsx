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
          <div ref={previewRef} dir="rtl" className="rounded-3xl overflow-hidden shadow-2xl border border-slate-100" style={{ background: bg, color: ink }}>
            {/* ============ TOP PROMO BANNER ============ */}
            <section className="py-2.5 px-4 text-center text-xs sm:text-sm font-black tracking-wide" style={{ background: ink, color: bg }}>
              <span className="inline-flex items-center gap-2">
                <Flame className="w-3.5 h-3.5" style={{ color: accent }} />
                {content.trustBadges?.[0] || 'شحن مجاني'} • {content.trustBadges?.[1] || 'ضمان الجودة'} • {content.trustBadges?.[2] || 'الدفع عند الاستلام'}
                <Flame className="w-3.5 h-3.5" style={{ color: accent }} />
              </span>
            </section>

            {/* ============ HERO — split ============ */}
            <section className="relative grid md:grid-cols-2 min-h-[85vh]" style={{ background: `linear-gradient(135deg, ${surface}, ${bg})` }}>
              <div className="relative order-2 md:order-1 flex flex-col justify-center px-6 sm:px-14 py-14" style={{ background: `radial-gradient(circle at 20% 20%, ${accent}22, transparent 60%)` }}>
                <div className="inline-flex self-start items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-black" style={{ background: accent, color: onAccent }}>
                  <Flame className="w-3.5 h-3.5" /> {content.hypeWords?.[0] || 'جديد'}
                </div>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-[1.05] mb-5" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>
                  {content.headline}
                </h1>
                <p className="text-lg sm:text-xl font-medium mb-8 opacity-80 max-w-md" style={{ color: ink }}>{content.tagline}</p>
                <div className="flex flex-wrap items-center gap-5">
                  <a href="#order-form" className="px-9 py-4 rounded-full font-black text-lg shadow-2xl hover:scale-105 transition" style={{ background: accent, color: onAccent }}>
                    {content.ctaText} ←
                  </a>
                  {price && (
                    <div style={{ color: ink }}>
                      <div className="text-3xl sm:text-4xl font-black" style={{ fontFamily: "'Playfair Display', serif", color: accent }}>{price}</div>
                      <div className="text-xs opacity-70">شامل التوصيل</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative order-1 md:order-2 min-h-[50vh] md:min-h-full overflow-hidden">
                {images.hero && <img src={images.hero} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <div className="absolute inset-0" style={{ background: `linear-gradient(270deg, transparent 40%, ${surface}88 100%)` }} />
              </div>
            </section>

            {/* ============ ICON BENEFITS STRIP ============ */}
            <section className="py-8 px-6" style={{ background: accent, color: onAccent }}>
              <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                {(content.trustBadges || []).slice(0, 4).map((b, i) => {
                  const Icon = [Truck, Shield, Award, Heart][i] || Truck;
                  return (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <Icon className="w-7 h-7" strokeWidth={2.5} />
                      <div className="font-black text-sm sm:text-base">{b}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ============ TRANSFORMATION (before / after) ============ */}
            <section className="py-20 px-6 sm:px-14" style={{ background: bg }}>
              <div className="text-center mb-10">
                <div className="text-xs font-black tracking-[0.3em] mb-3" style={{ color: accent }}>التحول الحقيقي</div>
                <h2 className="text-4xl sm:text-5xl font-black" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>
                  شاهد الفرق بنفسك
                </h2>
              </div>
              <div className="relative max-w-5xl mx-auto grid grid-cols-2 rounded-3xl overflow-hidden shadow-2xl">
                <div className="relative aspect-[3/4]">
                  <ImageWithRegen src={images.before} section="before" className="absolute inset-0" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 60%, ${ink}cc)` }} />
                  <div className="absolute bottom-6 right-6 left-6 flex items-center justify-between">
                    <span className="px-4 py-2 rounded-full font-black text-sm tracking-widest" style={{ background: ink, color: bg }}>قبل</span>
                  </div>
                </div>
                <div className="relative aspect-[3/4]">
                  <ImageWithRegen src={images.after} section="after" className="absolute inset-0" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 60%, ${accent}cc)` }} />
                  <div className="absolute bottom-6 right-6 left-6 flex items-center justify-between">
                    <span className="px-4 py-2 rounded-full font-black text-sm tracking-widest" style={{ background: accent, color: onAccent }}>بعد</span>
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center font-black text-xl shadow-2xl" style={{ background: bg, color: accent }}>
                  <ArrowLeft className="w-6 h-6" />
                </div>
              </div>
            </section>

            {/* ============ BENEFITS — image per benefit ============ */}
            <section className="py-20 px-6 sm:px-14 text-center" style={{ background: surface, color: ink }}>
              <div className="text-xs font-black tracking-[0.3em] mb-3" style={{ color: accent }}>لماذا هذا المنتج</div>
              <h2 className="text-4xl sm:text-5xl font-black mb-12" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>مميزات تصنع الفرق</h2>
              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {content.benefits?.slice(0, 3).map((b, i) => {
                  const Icon = ICONS[b.icon || 'zap'] || Zap;
                  const img = (images as any)[`benefit${i}`] as string | null;
                  const key = `benefit${i}` as keyof Images;
                  return (
                    <div key={i} className="group rounded-3xl overflow-hidden shadow-xl" style={{ background: bg }}>
                      <div className="relative aspect-square overflow-hidden">
                        <ImageWithRegen src={img} section={key} className="absolute inset-0" />
                        <div className="absolute top-4 right-4 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur" style={{ background: `${accent}dd`, color: onAccent }}>
                          <Icon className="w-6 h-6" strokeWidth={2.5} />
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="font-black text-xl sm:text-2xl" style={{ color: ink }}>{b.title}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ============ TESTIMONIAL MOSAIC ============ */}
            <section className="py-20 px-6 sm:px-14" style={{ background: bg, color: ink }}>
              <div className="text-center mb-12">
                <div className="text-xs font-black tracking-[0.3em] mb-3" style={{ color: accent }}>آراء العملاء</div>
                <h2 className="text-4xl sm:text-5xl font-black" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>آلاف العملاء الراضين</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-6xl mx-auto">
                {(() => {
                  const portraits = [images.lifestyle, images.inUse, images.detail, images.after, images.benefit0, images.benefit1].filter(Boolean) as string[];
                  const items = content.testimonials?.slice(0, 3) || [];
                  const tiles = Array.from({ length: 6 }).map((_, i) => ({
                    img: portraits[i % Math.max(portraits.length, 1)] || images.hero,
                    t: items[i % Math.max(items.length, 1)],
                  }));
                  return tiles.map((tile, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group shadow-lg">
                      {tile.img && <img src={tile.img} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />}
                      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 40%, ${ink}ee)` }} />
                      <div className="absolute bottom-0 right-0 left-0 p-4" style={{ color: bg }}>
                        <div className="flex mb-1.5" style={{ color: accent }}>
                          {[0,1,2,3,4].map(s => <Star key={s} className="w-3 h-3 fill-current" />)}
                        </div>
                        {tile.t && (
                          <>
                            <p className="text-xs sm:text-sm font-medium leading-snug mb-1.5 line-clamp-2">«{tile.t.quote}»</p>
                            <div className="text-[10px] font-black opacity-90">— {tile.t.name} • {tile.t.city}</div>
                          </>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </section>

            {/* ============ INGREDIENTS / BACKGROUND SHOWCASE ============ */}
            <section className="relative py-24 px-6 sm:px-14 overflow-hidden" style={{ background: surface }}>
              {images.packaging && (
                <img src={images.packaging} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
              )}
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 30% 30%, ${accent}33, transparent 50%), radial-gradient(circle at 70% 70%, ${accent2}33, transparent 50%)`,
              }} />
              <div className="relative z-10 max-w-5xl mx-auto text-center">
                <div className="text-xs font-black tracking-[0.3em] mb-3" style={{ color: accent }}>المكونات الطبيعية</div>
                <h2 className="text-4xl sm:text-6xl font-black mb-4" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>
                  {content.productName}
                </h2>
                <p className="text-lg opacity-80 max-w-2xl mx-auto mb-12" style={{ color: ink }}>{content.productDescription}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[images.detail, images.lifestyle, images.inUse, images.packaging].map((img, i) => img && (
                    <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-2xl border-4" style={{ borderColor: `${accent}55` }}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="mt-12 flex flex-wrap justify-center gap-3">
                  {content.hypeWords?.map((w, i) => (
                    <span key={i} className="px-5 py-2 rounded-full text-sm font-black" style={{ background: `${ink}10`, color: ink, border: `1.5px solid ${accent}` }}>
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* ============ ORDER FORM ============ */}
            <OrderFormSection
              accent={accent} onAccent={onAccent} bg={bg} surface={surface} ink={ink}
              price={price} productName={content.productName} pageId={pageId} ctaText={content.ctaText}
            />

            {/* ============ FINAL CTA ============ */}
            <section className="relative min-h-[60vh] flex items-center justify-center text-center overflow-hidden" style={{ background: bg }}>
              {images.hero && (
                <img src={images.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
              )}
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${bg}cc, ${bg})` }} />
              <div className="relative z-10 px-6 max-w-3xl">
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-black tracking-widest" style={{ background: accent, color: onAccent }}>
                  <Flame className="w-3.5 h-3.5" /> عرض محدود
                </div>
                <h2 className="text-5xl sm:text-7xl font-black mb-6" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>{content.headline}</h2>
                {price && <div className="text-5xl sm:text-6xl font-black mb-8" style={{ color: accent, fontFamily: "'Playfair Display', serif" }}>{price}</div>}
                <a href="#order-form" className="inline-block px-12 py-5 rounded-full font-black text-xl shadow-2xl hover:scale-105 transition" style={{ background: accent, color: onAccent }}>
                  {content.ctaText} ←
                </a>
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

function OrderFormSection({ accent, onAccent, bg, surface, ink, price, productName, pageId, ctaText }: {
  accent: string; onAccent: string; bg: string; surface: string; ink: string;
  price?: string; productName?: string; pageId: string | null; ctaText?: string;
}) {
  const [form, setForm] = useState({ customer_name: '', phone: '', wilaya: '', address: '', quantity: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.phone.trim()) { toast.error('يرجى إدخال الاسم ورقم الهاتف'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('launchpage_orders').insert({
        page_id: pageId, product_name: productName, price,
        customer_name: form.customer_name.trim(), phone: form.phone.trim(),
        wilaya: form.wilaya.trim() || null, address: form.address.trim() || null,
        quantity: Number(form.quantity) || 1,
      });
      if (error) throw error;
      setDone(true);
      toast.success('تم استلام طلبك — سنتصل بك قريباً');
    } catch (err: any) { toast.error(err.message || 'فشل الإرسال'); }
    finally { setSubmitting(false); }
  }

  return (
    <section id="order-form" className="py-24 px-6 sm:px-14" style={{ background: bg, color: ink }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-xs font-black tracking-[0.3em] mb-4 text-center" style={{ color: accent }}>اطلب الآن</div>
        <h2 className="text-4xl sm:text-5xl font-black text-center mb-3" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>
          أكمل طلبك خلال دقيقة
        </h2>
        <p className="text-center opacity-70 mb-10" style={{ color: ink }}>الدفع عند الاستلام — شحن سريع لكل ولايات الجزائر</p>

        {done ? (
          <div className="rounded-3xl p-10 text-center shadow-xl" style={{ background: surface }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: accent, color: onAccent }}>
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black mb-2" style={{ color: ink }}>تم استلام طلبك ✓</h3>
            <p className="opacity-70" style={{ color: ink }}>سيتصل بك فريقنا خلال ساعات لتأكيد التوصيل.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4" style={{ background: surface }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>الاسم الكامل *</label>
                <input required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl outline-none border-2"
                  style={{ background: bg, color: ink, borderColor: `${ink}20` }} />
              </div>
              <div>
                <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>رقم الهاتف *</label>
                <input required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl outline-none border-2"
                  style={{ background: bg, color: ink, borderColor: `${ink}20` }} placeholder="05XX XX XX XX" />
              </div>
              <div>
                <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>الولاية</label>
                <input value={form.wilaya} onChange={e => setForm({ ...form, wilaya: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl outline-none border-2"
                  style={{ background: bg, color: ink, borderColor: `${ink}20` }} />
              </div>
              <div>
                <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>الكمية</label>
                <input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                  className="w-full h-12 px-4 rounded-xl outline-none border-2"
                  style={{ background: bg, color: ink, borderColor: `${ink}20` }} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>العنوان</label>
                <textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl outline-none border-2 resize-none"
                  style={{ background: bg, color: ink, borderColor: `${ink}20` }} />
              </div>
            </div>

            {price && (
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: `${accent}15` }}>
                <div className="font-bold" style={{ color: ink }}>المجموع</div>
                <div className="text-2xl font-black" style={{ color: accent, fontFamily: "'Playfair Display', serif" }}>{price}</div>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full h-14 rounded-xl font-black text-lg shadow-xl hover:scale-[1.02] transition disabled:opacity-60"
              style={{ background: accent, color: onAccent }}>
              {submitting ? 'جارٍ الإرسال…' : `${ctaText || 'اطلب الآن'} ←`}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
