import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, ArrowLeft, Zap, Shield, Heart, Loader2, Flame, Award, Truck, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export type Tone = 'Premium' | 'Playful' | 'Clinical' | 'Bold';

export interface LPPalette {
  bg?: string; surface?: string; accent?: string; accent2?: string; ink?: string; onAccent?: string;
}
export interface LPContent {
  productName: string;
  productDescription: string;
  headline: string;
  tagline: string;
  ctaText: string;
  hypeWords: string[];
  palette?: LPPalette;
  benefits: { title: string; icon?: string; imagePrompt?: string }[];
  testimonials: { name: string; quote: string; city: string }[];
  trustBadges: string[];
}
export interface LPImages {
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

const TONE_FALLBACK: Record<Tone, LPPalette> = {
  Premium:  { bg: '#0b0b12', surface: '#1a1330', accent: '#d4a24a', accent2: '#8b6b2f', ink: '#ffffff', onAccent: '#0b0b12' },
  Playful:  { bg: '#fff1f2', surface: '#fce7f3', accent: '#e11d74', accent2: '#f472b6', ink: '#3b0764', onAccent: '#ffffff' },
  Clinical: { bg: '#eff6ff', surface: '#ecfeff', accent: '#0369a1', accent2: '#38bdf8', ink: '#0c4a6e', onAccent: '#ffffff' },
  Bold:     { bg: '#0a0a0a', surface: '#450a0a', accent: '#ef4444', accent2: '#f97316', ink: '#ffffff', onAccent: '#0a0a0a' },
};

const ICONS: Record<string, any> = { zap: Zap, shield: Shield, heart: Heart, flame: Flame, award: Award };

export function ensureLandingFonts() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lp-arabic-font')) return;
  const l = document.createElement('link');
  l.id = 'lp-arabic-font';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Playfair+Display:wght@700;900&display=swap';
  document.head.appendChild(l);
}

interface Props {
  content: LPContent;
  images: LPImages;
  price?: string;
  tone?: Tone;
  productId: string;
  productName?: string;
  productPrice: number;
  variants: any[];
  landingPageId: string | null;
  onRegenerateImage?: (section: keyof LPImages) => void;
  regenSection?: string | null;
  previewRef?: React.RefObject<HTMLDivElement>;
}

export default function GeneratedLandingView({
  content, images, price = '', tone = 'Premium',
  productId, productName, productPrice, variants, landingPageId,
  onRegenerateImage, regenSection, previewRef,
}: Props) {
  useEffect(() => { ensureLandingFonts(); }, []);

  const palette: LPPalette = { ...TONE_FALLBACK[tone], ...(content?.palette || {}) };
  const bg = palette.bg || '#ffffff';
  const surface = palette.surface || bg;
  const accent = palette.accent || '#d4a24a';
  const accent2 = palette.accent2 || accent;
  const ink = palette.ink || '#0b0b12';
  const onAccent = palette.onAccent || '#ffffff';

  function ImageWithRegen({ src, section, className }: { src: string | null; section: keyof LPImages; className?: string }) {
    return (
      <div className={`relative group overflow-hidden ${className || ''}`}>
        {src ? <img src={src} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
             : <div className="w-full h-full bg-slate-200 animate-pulse" />}
        {onRegenerateImage && section !== 'hero' && (
          <button onClick={() => onRegenerateImage(section)} disabled={regenSection === section}
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            {regenSection === section ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={previewRef} dir="rtl" className="overflow-hidden" style={{ background: bg, color: ink, fontFamily: "'Tajawal', system-ui, sans-serif" }}>
      {/* TOP PROMO BANNER */}
      <section className="py-2.5 px-4 text-center text-xs sm:text-sm font-black tracking-wide" style={{ background: ink, color: bg }}>
        <span className="inline-flex items-center gap-2">
          <Flame className="w-3.5 h-3.5" style={{ color: accent }} />
          {content.trustBadges?.[0] || 'شحن مجاني'} • {content.trustBadges?.[1] || 'ضمان الجودة'} • {content.trustBadges?.[2] || 'الدفع عند الاستلام'}
          <Flame className="w-3.5 h-3.5" style={{ color: accent }} />
        </span>
      </section>

      {/* HERO */}
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

      {/* ICON BENEFITS STRIP */}
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

      {/* TRANSFORMATION */}
      <section className="py-20 px-6 sm:px-14" style={{ background: bg }}>
        <div className="text-center mb-10">
          <div className="text-xs font-black tracking-[0.3em] mb-3" style={{ color: accent }}>التحول الحقيقي</div>
          <h2 className="text-4xl sm:text-5xl font-black" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>شاهد الفرق بنفسك</h2>
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

      {/* BENEFITS */}
      <section className="py-24 px-6 sm:px-14" style={{ background: surface, color: ink }}>
        <div className="max-w-6xl mx-auto mb-16 text-center">
          <div className="text-xs font-black tracking-[0.3em] mb-3" style={{ color: accent }}>لماذا هذا المنتج</div>
          <h2 className="text-4xl sm:text-6xl font-black" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>مميزات تصنع الفرق</h2>
          <div className="mx-auto mt-6 h-px w-24" style={{ background: accent }} />
        </div>
        <div className="max-w-6xl mx-auto space-y-24">
          {content.benefits?.slice(0, 2).map((b, i) => {
            const Icon = ICONS[b.icon || 'zap'] || Zap;
            const key = `benefit${i}` as keyof LPImages;
            const img = images[key] as string | null;
            const reverse = i % 2 === 1;
            return (
              <div key={i} className={`grid md:grid-cols-12 gap-8 md:gap-16 items-center ${reverse ? 'md:[&>*:first-child]:order-2' : ''}`}>
                <div className="md:col-span-7 relative">
                  <div className="absolute -top-6 -right-4 md:-right-8 text-[10rem] md:text-[14rem] font-black leading-none opacity-[0.06] select-none" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-tr-[6rem] rounded-bl-[6rem]">
                    <ImageWithRegen src={img} section={key} className="absolute inset-0" />
                  </div>
                </div>
                <div className="md:col-span-5 relative">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-12 h-px" style={{ background: accent }} />
                    <Icon className="w-5 h-5" strokeWidth={2.5} style={{ color: accent }} />
                    <span className="text-xs font-black tracking-[0.25em]" style={{ color: accent }}>0{i + 1}</span>
                  </div>
                  <h3 className="text-4xl sm:text-5xl font-black leading-tight mb-4" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>{b.title}</h3>
                  <p className="text-lg opacity-70 leading-relaxed" style={{ color: ink }}>{content.hypeWords?.[i] || content.tagline}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6 sm:px-14 relative overflow-hidden" style={{ background: bg, color: ink }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}66, transparent)` }} />
        {(() => {
          const portraits = [images.lifestyle, images.inUse, images.after, images.benefit0].filter(Boolean) as string[];
          const items = content.testimonials || [];
          const hero = items[0];
          const second = items[1];
          const heroImg = portraits[0] || images.hero;
          const secondImg = portraits[1] || images.detail;
          return (
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end justify-between mb-16 flex-wrap gap-6">
                <div>
                  <div className="text-[11px] font-black tracking-[0.4em] mb-4" style={{ color: accent }}>— شهادات حقيقية</div>
                  <h2 className="text-5xl sm:text-6xl font-black leading-[0.95]" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>
                    آلاف العملاء<br/><span style={{ color: accent, fontStyle: 'italic' }}>الراضين.</span>
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-6xl font-black" style={{ color: accent, fontFamily: "'Playfair Display', serif" }}>4.9</div>
                  <div>
                    <div className="flex mb-1" style={{ color: accent }}>{[0,1,2,3,4].map(s => <Star key={s} className="w-5 h-5 fill-current" />)}</div>
                    <div className="text-xs font-bold opacity-70">من +٢٠٠٠ تقييم</div>
                  </div>
                </div>
              </div>
              {hero && (
                <div className="grid md:grid-cols-12 gap-10 items-center mb-16">
                  <div className="md:col-span-5 relative">
                    <div className="relative aspect-[4/5] rounded-tl-[5rem] rounded-br-[5rem] overflow-hidden shadow-2xl">
                      {heroImg && <img src={heroImg} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 60%, ${ink}55)` }} />
                    </div>
                    <div className="absolute -top-8 -right-6 text-[10rem] leading-none font-black select-none opacity-90" style={{ color: accent, fontFamily: "'Playfair Display', serif" }}>”</div>
                  </div>
                  <div className="md:col-span-7">
                    <p className="text-2xl sm:text-3xl font-medium leading-[1.5] mb-8" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>{hero.quote}</p>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden shadow-lg" style={{ border: `2px solid ${accent}` }}>
                        {heroImg && <img src={heroImg} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <div className="text-base font-black" style={{ color: ink }}>{hero.name}</div>
                        <div className="text-xs font-bold opacity-60 tracking-wider">{hero.city}</div>
                      </div>
                      <div className="mx-4 h-8 w-px" style={{ background: `${ink}30` }} />
                      <div className="flex" style={{ color: accent }}>{[0,1,2,3,4].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}</div>
                    </div>
                  </div>
                </div>
              )}
              {second && (
                <div className="grid md:grid-cols-12 gap-8 items-center pt-10 border-t" style={{ borderColor: `${ink}15` }}>
                  <div className="md:col-span-7 md:order-1 order-2">
                    <div className="text-xs font-black tracking-[0.3em] mb-3 opacity-60">تجربة أخرى</div>
                    <p className="text-lg sm:text-xl font-medium leading-relaxed opacity-90" style={{ color: ink }}>«{second.quote}»</p>
                    <div className="mt-4 text-sm">
                      <span className="font-black" style={{ color: accent }}>{second.name}</span>
                      <span className="opacity-60 font-bold"> — {second.city}</span>
                    </div>
                  </div>
                  <div className="md:col-span-5 md:order-2 order-1">
                    <div className="aspect-[16/10] rounded-3xl overflow-hidden shadow-xl">
                      {secondImg && <img src={secondImg} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {/* INGREDIENTS/BACKGROUND */}
      <section className="relative py-24 px-6 sm:px-14 overflow-hidden" style={{ background: surface }}>
        {images.packaging && (
          <img src={images.packaging} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        )}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 30% 30%, ${accent}33, transparent 50%), radial-gradient(circle at 70% 70%, ${accent2}33, transparent 50%)`,
        }} />
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="text-xs font-black tracking-[0.3em] mb-3" style={{ color: accent }}>المكونات الطبيعية</div>
          <h2 className="text-4xl sm:text-6xl font-black mb-4" style={{ color: ink, fontFamily: "'Playfair Display', serif" }}>{content.productName}</h2>
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
              <span key={i} className="px-5 py-2 rounded-full text-sm font-black" style={{ background: `${ink}10`, color: ink, border: `1.5px solid ${accent}` }}>{w}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ORDER FORM */}
      <OrderFormSection
        accent={accent} onAccent={onAccent} bg={bg} surface={surface} ink={ink}
        price={price} ctaText={content.ctaText}
        productId={productId} productName={productName || content.productName}
        productPrice={productPrice}
        landingPageId={landingPageId}
        variants={variants}
      />

      {/* FINAL CTA */}
      <section className="relative min-h-[60vh] flex items-center justify-center text-center overflow-hidden" style={{ background: bg }}>
        {images.hero && <img src={images.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
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
  );
}

function OrderFormSection({ accent, onAccent, bg, surface, ink, price, ctaText, productId, productName, productPrice, landingPageId, variants }: {
  accent: string; onAccent: string; bg: string; surface: string; ink: string;
  price?: string; ctaText?: string;
  productId: string; productName?: string; productPrice: number;
  landingPageId: string | null;
  variants: any[];
}) {
  const [form, setForm] = useState({ customer_name: '', phone: '', wilaya_id: '', baladiya: '', quantity: 1, variant_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { data: wilayas } = useQuery({
    queryKey: ['lp-wilayas'],
    queryFn: async () => {
      const { data } = await supabase.from('wilayas').select('id, name, shipping_price, shipping_price_home').eq('is_active', true).order('code', { ascending: true, nullsFirst: false });
      return data || [];
    },
  });
  const { data: baladiyat } = useQuery({
    queryKey: ['lp-baladiyat', form.wilaya_id],
    queryFn: async () => {
      const { data } = await supabase.from('baladiyat').select('id, name').eq('wilaya_id', form.wilaya_id).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!form.wilaya_id,
  });

  const selectedVariant = variants.find(v => v.id === form.variant_id);
  const unitPrice = selectedVariant ? Number(selectedVariant.price) : productPrice;
  const total = unitPrice * (Number(form.quantity) || 1);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim() || form.phone.trim().length < 8) { toast.error('يرجى إدخال الاسم ورقم هاتف صحيح'); return; }
    if (!productId) { toast.error('لم يتم اختيار المنتج'); return; }
    if (variants.length > 0 && !form.variant_id) { toast.error('يرجى اختيار المتغير'); return; }
    setSubmitting(true);
    try {
      const qty = Math.max(1, Number(form.quantity) || 1);
      const { data: rpcData, error } = await supabase.rpc('create_public_order', {
        p_order: {
          customer_name: form.customer_name.trim(),
          customer_phone: form.phone.trim(),
          wilaya_id: form.wilaya_id || null,
          baladiya: form.baladiya || null,
          total_amount: total,
          subtotal: total,
          landing_page_id: landingPageId,
        },
        p_items: [{
          product_id: productId,
          variant_id: form.variant_id || null,
          quantity: qty,
          unit_price: unitPrice,
        }],
      });
      if (error) throw error;
      const order = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (order?.id) {
      }

      setDone(true);
      toast.success('تم استلام طلبك — سنتصل بك قريباً');
    } catch (err: any) { toast.error(err.message || 'فشل الإرسال'); }
    finally { setSubmitting(false); }
  }

  const inputCls = 'w-full h-12 px-4 rounded-xl outline-none border-2';
  const inputStyle = { background: bg, color: ink, borderColor: `${ink}20` } as React.CSSProperties;

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
            {productName && (
              <div className="text-sm font-bold p-3 rounded-xl mb-2" style={{ background: `${accent}15`, color: ink }}>
                🛍️ المنتج: <span style={{ color: accent }}>{productName}</span>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>الاسم الكامل *</label>
                <input required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>رقم الهاتف *</label>
                <input required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} style={inputStyle} placeholder="05XX XX XX XX" />
              </div>
              <div>
                <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>الولاية *</label>
                <select required value={form.wilaya_id} onChange={e => setForm({ ...form, wilaya_id: e.target.value, baladiya: '' })} className={inputCls} style={inputStyle}>
                  <option value="">اختر الولاية</option>
                  {wilayas?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>البلدية</label>
                <select value={form.baladiya} onChange={e => setForm({ ...form, baladiya: e.target.value })} disabled={!form.wilaya_id || !baladiyat?.length} className={inputCls} style={inputStyle}>
                  <option value="">{form.wilaya_id ? 'اختر البلدية' : 'اختر الولاية أولاً'}</option>
                  {baladiyat?.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              {variants.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>المتغير *</label>
                  <select required value={form.variant_id} onChange={e => setForm({ ...form, variant_id: e.target.value })} className={inputCls} style={inputStyle}>
                    <option value="">اختر الخيار</option>
                    {variants.map(v => {
                      const label = Object.values(v.option_values || {}).join(' / ') || v.sku || 'متغير';
                      return <option key={v.id} value={v.id}>{label} — {Number(v.price)} دج</option>;
                    })}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: ink }}>الكمية</label>
                <input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className={inputCls} style={inputStyle} />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: `${accent}15` }}>
              <div className="font-bold" style={{ color: ink }}>المجموع</div>
              <div className="text-2xl font-black" style={{ color: accent, fontFamily: "'Playfair Display', serif" }}>
                {total > 0 ? `${total} دج` : (price || '—')}
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full h-14 rounded-xl font-black text-lg shadow-xl hover:scale-[1.02] transition disabled:opacity-60" style={{ background: accent, color: onAccent }}>
              {submitting ? 'جارٍ الإرسال…' : `${ctaText || 'اطلب الآن'} ←`}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
