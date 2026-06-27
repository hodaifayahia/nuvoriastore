import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Laptop, Headphones, Watch, Cpu, Zap, Gift,
  RefreshCw, Layers, Wifi, Repeat, Users,
  ArrowLeft, Smartphone, Truck, BadgeCheck, RotateCcw,
  Headset, Star, Mail, Sparkles, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/LoadingSkeleton';
import { useCategories } from '@/hooks/useCategories';
import MinimalTemplate from '@/components/templates/MinimalTemplate';
import BoldTemplate from '@/components/templates/BoldTemplate';
import LiquidTemplate from '@/components/templates/LiquidTemplate';
import DigitalTemplate from '@/components/templates/DigitalTemplate';
import heroLaptopAsset from '@/assets/hero-laptop.jpg.asset.json';
import sifarDevicesAsset from '@/assets/sifar-devices.jpg.asset.json';
import ecosystemTechAsset from '@/assets/ecosystem-tech.jpg.asset.json';

const ECOSYSTEM_FEATURES = [
  { icon: RefreshCw, label: 'Seamless Sync' },
  { icon: Repeat,    label: 'Resource Festive' },
  { icon: Users,     label: 'Solo Actors' },
  { icon: Layers,    label: 'Unified Experience' },
  { icon: Watch,     label: 'SmartWatch' },
  { icon: Wifi,      label: 'Tech Connectivities' },
];

const WORLDS = [
  { icon: Laptop,     label: 'اللابتوب',   to: 'laptop' },
  { icon: Smartphone, label: 'هواتف ذكية', to: 'phone' },
  { icon: Headphones, label: 'إكسسوارات',  to: 'accessory' },
];

const PARTNERS = ['TECH BRAND 1','TECH BRAND 2','TECH BRAND 3','TECH BRAND 4','TECH BRAND 5','TECH BRAND 6'];

export default function IndexPage() {
  const { data: categoriesData } = useCategories();
  const navigate = useNavigate();
  const [visibleProductsCount, setVisibleProductsCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { data: allProducts, isLoading } = useQuery({
    queryKey: ['all-active-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: heroSlides } = useQuery({
    queryKey: ['hero-slides'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'hero_slides').maybeSingle();
      try { return JSON.parse(data?.value || '[]') as { url: string; link?: string; alt?: string }[]; } catch { return []; }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: storeTemplate } = useQuery({
    queryKey: ['store-template'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'store_template').maybeSingle();
      return data?.value || 'classic';
    },
    staleTime: 5 * 60 * 1000,
  });

  const newProducts = useMemo(() => allProducts?.slice(0, 4) || [], [allProducts]);
  const bestSellers = useMemo(() => [...(allProducts || [])].sort((a, b) => Number(b.price) - Number(a.price)).slice(0, 4), [allProducts]);
  const offerProducts = useMemo(() => allProducts?.slice(0, 2) || [], [allProducts]);
  const allShown = useMemo(() => allProducts?.slice(0, visibleProductsCount) || [], [allProducts, visibleProductsCount]);
  const hasMore = (allProducts?.length || 0) > allShown.length;

  const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'rtl', loop: true }, [Autoplay({ delay: 5000 })]);
  const [selectedSlide, setSelectedSlide] = useState(0);

  useEffect(() => { setVisibleProductsCount(12); }, [allProducts?.length]);
  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setSelectedSlide(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSel); onSel();
  }, [emblaApi]);
  useEffect(() => {
    if (!loadMoreRef.current || isLoading || !hasMore) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisibleProductsCount(p => p + 8); }, { rootMargin: '300px' });
    obs.observe(loadMoreRef.current);
    return () => obs.disconnect();
  }, [isLoading, hasMore]);

  if (storeTemplate === 'minimal') return <MinimalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} />;
  if (storeTemplate === 'bold')    return <BoldTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'liquid')  return <LiquidTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'digital') return <DigitalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;

  const heroBanners = (heroSlides && heroSlides.length > 0)
    ? heroSlides.map(s => ({ image: s.url, alt: s.alt || '' }))
    : [
        { image: heroLaptopAsset.url, alt: 'Sifar premium laptop' },
        { image: sifarDevicesAsset.url, alt: 'Sifar devices' },
        { image: ecosystemTechAsset.url, alt: 'Tech ecosystem' },
      ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" dir="rtl">

      {/* ═════ 1. LUXURY HERO ═════ */}
      <section className="px-4 sm:px-6 lg:px-8 pt-5 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-[28px] overflow-hidden gold-glow">
            <div className="relative" ref={emblaRef}>
              <div className="flex">
                {heroBanners.map((b, i) => (
                  <div key={i} className="flex-[0_0_100%] min-w-0 relative">
                    <img src={b.image} alt={b.alt} className="w-full h-[280px] sm:h-[400px] lg:h-[500px] object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-l from-black/85 via-black/50 to-black/20" />
                    <div className="absolute inset-0 flex items-center">
                      <div className="px-6 sm:px-12 lg:px-16 text-right max-w-xl mr-auto">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/40 mb-4">
                          <Sparkles className="w-3 h-3" /> سيفار ستور
                        </span>
                        <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl leading-tight gold-text-gradient">
                          اكتشف الفخامة
                        </h1>
                        <p className="mt-3 text-sm sm:text-lg text-white/85">
                          منتجات سيفار بريميوم بتصميم عصري وجودة لا تُضاهى
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3 justify-end">
                          <Button onClick={() => navigate('/products?sale=flash')} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-5 h-10 text-sm font-semibold gap-1.5">
                            <Zap className="w-4 h-4" /> عروض خاصة
                          </Button>
                          <Button onClick={() => navigate('/products')} variant="outline" className="rounded-full border-primary/50 text-primary hover:bg-primary/10 px-5 h-10 text-sm font-semibold gap-1.5">
                            تسوق الآن <ArrowLeft className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {heroBanners.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {heroBanners.map((_, i) => (
                <button key={i} onClick={() => emblaApi?.scrollTo(i)}
                  className={`h-1.5 rounded-full transition-all ${selectedSlide === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/40'}`}
                  aria-label={`slide ${i + 1}`} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═════ 2. اختر عالمك ═════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-8">اختر عالمك</h2>
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {WORLDS.map(w => (
              <Link key={w.label} to={`/products?category=${w.to}`}
                className="group relative rounded-3xl gold-glow gold-glow-hover bg-gradient-to-br from-[#1a1410] to-[#0e0b08] p-5 sm:p-8 aspect-square flex flex-col items-center justify-center gap-3 sm:gap-4">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <w.icon className="w-7 h-7 sm:w-10 sm:h-10 text-primary" />
                </div>
                <span className="font-display font-bold text-sm sm:text-lg">{w.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═════ 3. أحدث المنتجات (4×N grid) ═════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient">أحدث المنتجات</h2>
            <Link to="/products" className="text-xs sm:text-sm text-primary/80 hover:text-primary inline-flex items-center gap-1">
              عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
          {isLoading ? <ProductGridSkeleton /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {newProducts.map(p => (
                <ProductCard key={p.id} id={p.id} name={p.name} price={Number(p.price)}
                  oldPrice={p.old_price ? Number(p.old_price) : undefined}
                  image={p.images?.[p.main_image_index ?? 0] || p.images?.[0] || ''}
                  images={p.images || []} mainImageIndex={p.main_image_index ?? 0}
                  category={p.category || []} stock={p.stock ?? 0}
                  shippingPrice={Number(p.shipping_price) || 0} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═════ 4. عروض خاصة — countdown cards ═════ */}
      {offerProducts.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-14">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-center font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-6">عروض خاصة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {offerProducts.map((p, idx) => (
                <FlashOfferCard key={p.id} product={p} label={idx === 0 ? 'عروض الكبار' : 'عروض الأصغر'} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═════ 5. منظومة التكنولوجيا ═════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-8">منظومة التكنولوجيا</h2>
          <div className="relative rounded-[28px] gold-glow bg-gradient-to-b from-[#15110d] to-[#0e0b08] p-6 sm:p-10 lg:p-14">
            <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-8">
              <div className="flex flex-col gap-6 sm:gap-10 order-2 lg:order-1">
                {ECOSYSTEM_FEATURES.slice(0, 3).map(f => <FeatureChip key={f.label} icon={f.icon} label={f.label} side="right" />)}
              </div>
              <div className="relative flex items-center justify-center order-1 lg:order-2">
                <div className="absolute w-44 h-44 sm:w-64 sm:h-64 rounded-full bg-primary/25 blur-3xl" />
                <img src={ecosystemTechAsset.url} alt="Tech ecosystem" className="relative w-full max-w-xs sm:max-w-md aspect-square object-cover rounded-2xl gold-glow" />
              </div>
              <div className="flex flex-col gap-6 sm:gap-10 order-3">
                {ECOSYSTEM_FEATURES.slice(3, 6).map(f => <FeatureChip key={f.label} icon={f.icon} label={f.label} side="left" />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════ 6. BIG PROMO BANNER ═════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-[28px] gold-glow overflow-hidden bg-gradient-to-l from-[#1a1410] via-[#13100d] to-[#0e0b08] p-6 sm:p-10 lg:p-14">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="relative grid grid-cols-12 items-center gap-6">
              <div className="col-span-12 sm:col-span-7 text-right">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/40 mb-4">
                  <Sparkles className="w-3.5 h-3.5" /> عرض حصري
                </span>
                <h3 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl gold-text-gradient leading-tight">
                  خصم 25% على الباقات
                </h3>
                <p className="mt-3 text-sm sm:text-base text-foreground/70 max-w-md">
                  اجمع شاحن + كابل + غطاء واحصل على خصم فوري على المجموعة كاملة.
                </p>
                <Button onClick={() => navigate('/products')} className="mt-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-10 font-semibold gap-1.5">
                  تسوق الباقات <ArrowLeft className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="col-span-12 sm:col-span-5 flex items-center justify-center">
                <img src={sifarDevicesAsset.url} alt="Sifar bundle" className="w-full max-w-sm aspect-video object-cover rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════ 7. BEST SELLERS ═════ */}
      {bestSellers.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-14">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient inline-flex items-center gap-2">
                <Star className="w-5 h-5 fill-primary text-primary" /> الأكثر مبيعاً
              </h2>
              <Link to="/products" className="text-xs sm:text-sm text-primary/80 hover:text-primary inline-flex items-center gap-1">
                عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {bestSellers.map(p => (
                <ProductCard key={p.id} id={p.id} name={p.name} price={Number(p.price)}
                  oldPrice={p.old_price ? Number(p.old_price) : undefined}
                  image={p.images?.[p.main_image_index ?? 0] || p.images?.[0] || ''}
                  images={p.images || []} mainImageIndex={p.main_image_index ?? 0}
                  category={p.category || []} stock={p.stock ?? 0}
                  shippingPrice={Number(p.shipping_price) || 0} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═════ 8. شركاؤنا ═════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-6">شركاؤنا</h2>
          <div className="rounded-2xl gold-glow bg-gradient-to-r from-[#15110d] via-[#0e0b08] to-[#15110d] py-6 px-4">
            <div className="flex items-center justify-around gap-4 overflow-x-auto scrollbar-hide">
              {PARTNERS.map(p => (
                <div key={p} className="flex items-center gap-2 shrink-0 text-primary/70 hover:text-primary transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[11px] sm:text-xs font-display font-bold tracking-wider whitespace-nowrap">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═════ 9. لماذا تختار سيفار ═════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-8">لماذا تختار سيفار</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: Truck,      title: 'شحن مجاني',     desc: 'لجميع ولايات الوطن' },
              { icon: BadgeCheck, title: 'ضمان 12 شهر',   desc: 'منتجات أصلية 100%' },
              { icon: Headset,    title: 'دعم 24/7',      desc: 'فريق متاح دائماً لخدمتك' },
              { icon: RotateCcw,  title: 'دفع آمن',       desc: 'طرق دفع متعددة وموثوقة' },
            ].map(f => (
              <div key={f.title} className="rounded-2xl gold-glow bg-gradient-to-br from-[#1a1410] to-[#0e0b08] p-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center mx-auto mb-3">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-display font-bold text-sm sm:text-base mb-1">{f.title}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════ 10. آراء العملاء ═════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-8">آراء العملاء</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {[
              { name: 'أحمد ب.',  text: 'جودة ممتازة وتوصيل سريع جداً، شكراً سيفار!' },
              { name: 'سارة م.',  text: 'منتجات أصلية والأسعار في المتناول. أنصح بها.' },
              { name: 'يوسف ك.',  text: 'تجربة شراء رائعة ودعم فعّال. سأعود مرة أخرى.' },
              { name: 'نسرين ل.', text: 'تغليف فاخر ومنتج مطابق للوصف تماماً.' },
              { name: 'سفيان ر.', text: 'أفضل متجر إلكترونيات في الجزائر بدون منافس.' },
              { name: 'سناء د.',  text: 'الشحن أسرع مما توقعت. تقييم ممتاز.' },
            ].map(t => (
              <div key={t.name} className="rounded-2xl gold-glow bg-gradient-to-br from-[#1a1410] to-[#0e0b08] p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold truncate">{t.name}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-3 h-3 fill-primary text-primary" />)}
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════ 11. NEWSLETTER ═════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-5xl mx-auto rounded-[28px] gold-glow bg-gradient-to-r from-[#1a1410] via-[#13100d] to-[#1a1410] p-6 sm:p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-2">انضم الآن</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            احصل على آخر العروض والمنتجات الجديدة مباشرة في بريدك.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto p-1.5 rounded-2xl bg-background/60 border border-border/60">
            <input type="email" required placeholder="بريدك الإلكتروني"
              className="flex-1 bg-transparent border-0 outline-none px-4 h-10 text-sm placeholder:text-muted-foreground text-right" />
            <Button type="submit" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 text-sm font-semibold">
              اشترك
            </Button>
          </form>
        </div>
      </section>

      {/* ═════ 12. ALL PRODUCTS ═════ */}
      {allShown.length > 4 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-5">جميع المنتجات</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {allShown.map(p => (
                <ProductCard key={p.id} id={p.id} name={p.name} price={Number(p.price)}
                  oldPrice={p.old_price ? Number(p.old_price) : undefined}
                  image={p.images?.[p.main_image_index ?? 0] || p.images?.[0] || ''}
                  images={p.images || []} mainImageIndex={p.main_image_index ?? 0}
                  category={p.category || []} stock={p.stock ?? 0}
                  shippingPrice={Number(p.shipping_price) || 0} />
              ))}
            </div>
            {hasMore && <div ref={loadMoreRef} className="h-12" />}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────── */

function FeatureChip({ icon: Icon, label, side }: { icon: any; label: string; side: 'left' | 'right' }) {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${side === 'right' ? 'justify-start' : 'justify-end'}`}>
      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
      </div>
      <span className="text-[11px] sm:text-sm font-medium text-foreground/90">{label}</span>
    </div>
  );
}

function useCountdown(hours: number) {
  const [end] = useState(() => Date.now() + hours * 3600 * 1000);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, end - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s };
}

function CountdownBlock() {
  const { h, m, s } = useCountdown(24);
  const Cell = ({ v }: { v: number }) => (
    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-primary/15 border border-primary/40 flex items-center justify-center text-primary font-mono font-bold text-sm sm:text-base">
      {String(v).padStart(2, '0')}
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 sm:gap-2" dir="ltr">
      <Cell v={h} /><span className="text-primary font-bold">:</span>
      <Cell v={m} /><span className="text-primary font-bold">:</span>
      <Cell v={s} />
    </div>
  );
}

function FlashOfferCard({ product, label }: { product: any; label: string }) {
  const navigate = useNavigate();
  const img = product.images?.[product.main_image_index ?? 0] || product.images?.[0] || '';
  return (
    <div className="relative rounded-2xl gold-glow gold-glow-hover bg-gradient-to-br from-[#1a1410] to-[#0e0b08] p-4 sm:p-5">
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-secondary/40 flex items-center justify-center overflow-hidden shrink-0">
          {img ? <img src={img} alt={product.name} className="w-full h-full object-contain p-2" loading="lazy" />
               : <Smartphone className="w-10 h-10 text-primary/60" />}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
              <Zap className="w-3 h-3" /> Flash Sale
            </span>
            <span className="text-[11px] text-muted-foreground truncate">{label}</span>
          </div>
          <h3 className="font-display font-bold text-sm sm:text-base truncate mb-1">{product.name}</h3>
          <p className="text-primary font-bold text-base sm:text-lg mb-3">{Number(product.price).toLocaleString()} د.ج</p>
          <CountdownBlock />
        </div>
      </div>
      <Button onClick={() => navigate(`/product/${product.id}`)}
        className="w-full mt-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs font-semibold gap-1.5">
        اشترِ الآن <ArrowLeft className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
