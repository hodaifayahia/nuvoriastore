import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Laptop, Headphones, Watch, Cpu, Zap, Gift,
  RefreshCw, Layers, Shield, Wifi, Repeat, Users,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/LoadingSkeleton';
import { useCategories } from '@/hooks/useCategories';
import MinimalTemplate from '@/components/templates/MinimalTemplate';
import BoldTemplate from '@/components/templates/BoldTemplate';
import LiquidTemplate from '@/components/templates/LiquidTemplate';
import DigitalTemplate from '@/components/templates/DigitalTemplate';

const ECOSYSTEM_FEATURES = [
  { icon: RefreshCw, label: 'Seamless Sync' },
  { icon: Repeat,    label: 'Resource Festive' },
  { icon: Users,     label: 'Solo Actors' },
  { icon: Layers,    label: 'Unified Experience' },
  { icon: Watch,     label: 'SmartWatch' },
  { icon: Wifi,      label: 'Tech Connectivities' },
];

export default function IndexPage() {
  const { data: categoriesData } = useCategories();
  const navigate = useNavigate();
  const [visibleProductsCount, setVisibleProductsCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { data: allProducts, isLoading } = useQuery({
    queryKey: ['all-active-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
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
  const allShown    = useMemo(() => allProducts?.slice(0, visibleProductsCount) || [], [allProducts, visibleProductsCount]);
  const heroProduct = newProducts[0];
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
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleProductsCount(prev => prev + 8);
    }, { rootMargin: '300px' });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isLoading, hasMore]);

  if (storeTemplate === 'minimal') return <MinimalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} />;
  if (storeTemplate === 'bold')    return <BoldTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'liquid')  return <LiquidTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'digital') return <DigitalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;

  const slides = (heroSlides && heroSlides.length > 0)
    ? heroSlides
    : [
        { url: heroProduct?.images?.[0] || '', alt: heroProduct?.name || '' },
        { url: newProducts[1]?.images?.[0] || '', alt: newProducts[1]?.name || '' },
        { url: newProducts[2]?.images?.[0] || '', alt: newProducts[2]?.name || '' },
      ].filter(s => s.url);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" dir="rtl">

      {/* ───────── HERO BANNER ───────── */}
      <section className="px-4 sm:px-6 lg:px-8 pt-5 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-[28px] overflow-hidden gold-glow bg-gradient-to-bl from-[#1a1612] via-[#13100d] to-[#0e0b08]">
            <div className="relative" ref={emblaRef}>
              <div className="flex">
                {(slides.length ? slides : [{ url: '', alt: '' }]).map((slide, i) => (
                  <div key={i} className="flex-[0_0_100%] min-w-0">
                    <div className="grid grid-cols-12 gap-3 items-center p-5 sm:p-8 lg:p-12 min-h-[260px] sm:min-h-[340px] lg:min-h-[420px]">
                      {/* Image side (left in RTL = visually left) */}
                      <div className="col-span-6 relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                        {slide.url ? (
                          <img src={slide.url} alt={slide.alt || ''} className="relative max-h-40 sm:max-h-56 lg:max-h-72 object-contain drop-shadow-[0_20px_40px_hsl(38_75%_55%/0.4)]" />
                        ) : (
                          <Laptop className="relative w-28 h-28 sm:w-40 sm:h-40 text-primary/70" />
                        )}
                      </div>

                      {/* Text side */}
                      <div className="col-span-6 text-right">
                        <h2 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl leading-tight gold-text-gradient">
                          وصل حديثاً
                        </h2>
                        <p className="mt-2 text-sm sm:text-base lg:text-lg text-foreground/80">
                          لسنتجار المهدة
                        </p>
                        <p className="mt-2 text-[11px] sm:text-xs text-muted-foreground hidden sm:block">
                          اكتشف أحدث الإكسسوارات لأجهزتك
                        </p>
                        <Button
                          onClick={() => navigate('/products')}
                          className="mt-4 sm:mt-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 sm:px-6 h-9 sm:h-10 text-xs sm:text-sm font-semibold gap-1.5"
                        >
                          تسوق الآن <ArrowLeft className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* dots */}
          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`h-1.5 rounded-full transition-all ${selectedSlide === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/40'}`}
                  aria-label={`slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────── وصل حديثاً (NEW ARRIVALS ROW) ───────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient">وصل حديثاً</h2>
            <Link to="/products" className="text-xs sm:text-sm text-primary/80 hover:text-primary inline-flex items-center gap-1">
              عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {newProducts.map(p => (
                <div key={p.id} className="rounded-2xl p-3 gold-glow gold-glow-hover bg-card">
                  <Link to={`/product/${p.id}`} className="block">
                    <div className="aspect-square rounded-xl bg-secondary/40 flex items-center justify-center overflow-hidden mb-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain p-2" loading="lazy" />
                      ) : (
                        <Headphones className="w-12 h-12 text-primary/50" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-medium truncate text-center mb-2">{p.name}</p>
                  </Link>
                  <Button
                    onClick={() => navigate(`/product/${p.id}`)}
                    size="sm"
                    className="w-full rounded-full bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/40 text-[11px] sm:text-xs font-semibold h-8"
                  >
                    {Number(p.price).toLocaleString()} د.ج
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────── منظومة التكنولوجيا (ECOSYSTEM) ───────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-8">
            منظومة التكنولوجيا
          </h2>

          <div className="relative rounded-[28px] gold-glow bg-gradient-to-b from-[#15110d] to-[#0e0b08] p-6 sm:p-10 lg:p-14">
            <div className="grid grid-cols-3 items-center gap-4 sm:gap-8">
              {/* Left features */}
              <div className="flex flex-col gap-6 sm:gap-10">
                {ECOSYSTEM_FEATURES.slice(0, 3).map(f => (
                  <FeatureChip key={f.label} icon={f.icon} label={f.label} side="right" />
                ))}
              </div>

              {/* Center device */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-44 h-44 sm:w-64 sm:h-64 rounded-full bg-primary/20 blur-3xl" />
                <Laptop className="relative w-24 h-24 sm:w-36 sm:h-36 lg:w-48 lg:h-48 text-primary" strokeWidth={1.2} />
              </div>

              {/* Right features */}
              <div className="flex flex-col gap-6 sm:gap-10">
                {ECOSYSTEM_FEATURES.slice(3, 6).map(f => (
                  <FeatureChip key={f.label} icon={f.icon} label={f.label} side="left" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── عروض خاصة (SPECIAL OFFERS) ───────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-6">
            عروض خاصة
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <OfferTile icon={Zap}  title="Flash Sale" subtitle="عروض محدودة" to="/products?sale=flash" />
            <OfferTile icon={Gift} title="عرض خاص"   subtitle="هدية مع كل طلب" to="/products?sale=gift" />
          </div>
        </div>
      </section>

      {/* ───────── ALL PRODUCTS ───────── */}
      {(allShown.length > 4) && (
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl gold-text-gradient mb-5">
              جميع المنتجات
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {allShown.map(p => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  price={Number(p.price)}
                  oldPrice={p.old_price ? Number(p.old_price) : undefined}
                  image={p.images?.[p.main_image_index ?? 0] || p.images?.[0] || ''}
                  images={p.images || []}
                  mainImageIndex={p.main_image_index ?? 0}
                  category={p.category || []}
                  stock={p.stock ?? 0}
                  shippingPrice={Number(p.shipping_price) || 0}
                />
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

function OfferTile({ icon: Icon, title, subtitle, to }: { icon: any; title: string; subtitle: string; to: string }) {
  return (
    <Link
      to={to}
      className="group relative rounded-2xl gold-glow gold-glow-hover bg-gradient-to-br from-[#1a1410] to-[#0e0b08] p-4 sm:p-6 flex items-center gap-3 sm:gap-4 overflow-hidden"
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-sm sm:text-base truncate">{title}</p>
        <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </Link>
  );
}
