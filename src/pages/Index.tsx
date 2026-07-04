import SEO from '@/components/SEO';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Smartphone, Laptop, Headphones, Mouse, Keyboard, Cable, Watch, Camera,
  BatteryCharging, Cpu, Gamepad2, HardDrive, Monitor, Speaker,
  Refrigerator, ChefHat, WashingMachine, Microwave, AirVent, Tag,
  ArrowRight, Search, Sparkles, Shield, Truck, BadgeCheck, Zap,
  ChevronRight, ChevronLeft, Star, Flame, Clock, Quote,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProductCard from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/LoadingSkeleton';
import { useCategories } from '@/hooks/useCategories';
import { useBrands } from '@/hooks/useBrands';
import { useTranslation } from '@/i18n';
import { useHomepageSettings } from '@/hooks/useHomepageSettings';
import MinimalTemplate from '@/components/templates/MinimalTemplate';
import BoldTemplate from '@/components/templates/BoldTemplate';
import LiquidTemplate from '@/components/templates/LiquidTemplate';
import DigitalTemplate from '@/components/templates/DigitalTemplate';
import heroBanner1 from '@/assets/hero-banner-1.jpg';
import heroBanner2 from '@/assets/hero-banner-2.jpg';
import heroBanner3 from '@/assets/hero-banner-3.jpg';
import bestPricesBanner from '@/assets/best-prices-banner.jpg.asset.json';

const DEFAULT_HERO_SLIDES = [
  { url: heroBanner1, alt: 'تبريد وغسيل' },
  { url: heroBanner2, alt: 'طبخ' },
  { url: heroBanner3, alt: 'تكييف وأجهزة صغيرة' },
];


const ICON_MAP: Record<string, LucideIcon> = {
  Smartphone, Laptop, Headphones, Mouse, Keyboard, Cable, Watch, Camera,
  BatteryCharging, Cpu, Gamepad2, HardDrive, Monitor, Speaker,
  Refrigerator, ChefHat, WashingMachine, Microwave, AirVent, Tag,
};

// Showcase trio: Laptops / Smartphones / Essential Gear
const SHOWCASE = [
  {
    key: 'laptops',
    title: 'حواسيب محمولة',
    desc: 'أجهزة عالية الأداء مصممة للمبدعين والمطورين واللاعبين.',
    icon: Laptop,
    cta: 'استكشف الحواسيب',
    href: '/products?category=Laptops',
    aura: 'aura-teal',
    accent: 'hsl(180 88% 55%)',
  },
  {
    key: 'phones',
    title: 'هواتف ذكية',
    desc: 'هواتف رائدة وأغطية وإكسسوارات مصممة لتألق يومي.',
    icon: Smartphone,
    cta: 'استكشف الهواتف',
    href: '/products?category=Phones',
    aura: 'aura-violet',
    accent: 'hsl(270 85% 65%)',
  },
  {
    key: 'gear',
    title: 'إكسسوارات أساسية',
    desc: 'سماعات، لوحات مفاتيح، شواحن — كل ما يكمّل إعدادك.',
    icon: Headphones,
    cta: 'تسوق الإكسسوارات',
    href: '/products?category=Headphones',
    aura: 'aura-teal',
    accent: 'hsl(200 95% 55%)',
  },
];

const FALLBACK_CATS = [
  { name: 'سماعات', icon: Headphones },
  { name: 'لوحات مفاتيح', icon: Keyboard },
  { name: 'فأرات', icon: Mouse },
  { name: 'شواحن', icon: BatteryCharging },
  { name: 'كابلات', icon: Cable },
  { name: 'ألعاب', icon: Gamepad2 },
  { name: 'ساعات', icon: Watch },
  { name: 'مكبرات صوت', icon: Speaker },
];


export default function IndexPage() {
  const { data: categoriesData } = useCategories();
  const { data: brandsData } = useBrands();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
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

  const { data: hp } = useHomepageSettings();
  const showSection = (s: 'hero'|'categories'|'trending'|'newest'|'deals'|'limited'|'brands'|'testimonials'|'trusted'|'trust_strip') => hp?.show?.[s] ?? (s !== 'limited');
  const txt = (key: string, fallback: string) => hp?.text?.[key] || fallback;

  const newestProducts = useMemo(() => allProducts?.slice(0, visibleProductsCount) || [], [allProducts, visibleProductsCount]);
  const featuredProducts = useMemo(
    () => (allProducts || []).filter((p: any) => p.is_featured).slice(0, 8),
    [allProducts],
  );
  const trendingProducts = useMemo(
    () => [...(allProducts || [])].sort((a, b) => Number(b.price) - Number(a.price)).slice(0, 4),
    [allProducts],
  );
  const dealsProducts = useMemo(
    () => (allProducts || [])
      .filter(p => p.old_price && Number(p.old_price) > Number(p.price))
      .sort((a, b) => (Number(b.old_price) - Number(b.price)) / Number(b.old_price) - (Number(a.old_price) - Number(a.price)) / Number(a.old_price))
      .slice(0, 4),
    [allProducts],
  );
  const hasMore = (allProducts?.length || 0) > newestProducts.length;

  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end.getTime() - now.getTime());
      setCountdown({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'rtl', loop: true }, [Autoplay({ delay: 4000, stopOnInteraction: false })]);
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedSlide(emblaApi.selectedScrollSnap());
    setSlideCount(emblaApi.scrollSnapList().length);
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', () => { setSlideCount(emblaApi.scrollSnapList().length); onSelect(); });
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);
  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();
  const scrollTo = (i: number) => emblaApi?.scrollTo(i);

  useEffect(() => { setVisibleProductsCount(12); }, [allProducts?.length]);

  useEffect(() => {
    if (!loadMoreRef.current || isLoading || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleProductsCount(prev => prev + 8);
    }, { rootMargin: '300px' });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isLoading, hasMore]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  if (storeTemplate === 'minimal') return <MinimalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} />;
  if (storeTemplate === 'bold')    return <BoldTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'liquid')  return <LiquidTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'digital') return <DigitalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;

  const bentoCats = useMemo(() => {
    return (categoriesData || [])
      .filter((c: any) => c?.name)
      .map((c: any) => ({
        name: c.name as string,
        image: c.image as string | undefined,
        icon: (c.icon && ICON_MAP[c.icon]) || Tag,
      }));
  }, [categoriesData]);

  const extraCats = useMemo(() => {
    const fromDb = (categoriesData || [])
      .filter((c: any) => c?.name)
      .map((c: any) => ({ name: c.name as string, icon: (c.icon && ICON_MAP[c.icon]) || Cpu }));
    return (fromDb.length > 0 ? fromDb : FALLBACK_CATS).slice(0, 8);
  }, [categoriesData]);

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden">
      <SEO
        title="نوفوريا ستور — منظومة تقنية متكاملة"
        description="حواسيب محمولة وهواتف ذكية وإكسسوارات أساسية. منظومة تقنية راقية مع توصيل سريع عبر 58 ولاية."
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'NuvoriaStore',
          url: '/',
          potentialAction: {
            '@type': 'SearchAction',
            target: '/products?search={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }}
      />


      {/* ─────────── HERO CAROUSEL (banners only, autoplay 2s) ─────────── */}
      {showSection('hero') && (() => {
        const slides = heroSlides && heroSlides.length > 0 ? heroSlides : DEFAULT_HERO_SLIDES;
        const count = slideCount || slides.length;
        return (
          <section className="relative px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-12">
            <div className="relative max-w-7xl mx-auto group">
              <div className="overflow-hidden rounded-3xl glass-card neon-border shadow-2xl" ref={emblaRef}>
                <div className="flex">
                  {slides.map((slide, i) => (
                    <div key={i} className="flex-[0_0_100%] min-w-0 relative">
                      {slide.link ? (
                        <Link to={slide.link}>
                          <img
                            src={slide.url}
                            alt={slide.alt || `Banner ${i + 1}`}
                            className="w-full h-[280px] sm:h-[420px] lg:h-[520px] object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
                          />
                        </Link>
                      ) : (
                        <img
                          src={slide.url}
                          alt={slide.alt || `Banner ${i + 1}`}
                          className="w-full h-[280px] sm:h-[420px] lg:h-[520px] object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
                        />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Prev / Next buttons */}
              <button
                type="button"
                onClick={scrollPrev}
                aria-label="السابق"
                className="absolute top-1/2 -translate-y-1/2 left-3 sm:left-5 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/70 backdrop-blur-md border border-border/60 text-foreground shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                aria-label="التالي"
                className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-5 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/70 backdrop-blur-md border border-border/60 text-foreground shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-background/50 backdrop-blur-md border border-border/40">
                {Array.from({ length: count }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollTo(i)}
                    aria-label={`الشريحة ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      selectedSlide === i
                        ? 'w-8 bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]'
                        : 'w-2 bg-foreground/30 hover:bg-foreground/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })()}




      {/* ─────────── CATEGORY BENTO (building layout) ─────────── */}
      {showSection('categories') && bentoCats.length > 0 && (() => {
        const [c0, c1, c2, c3, c4] = [0, 1, 2, 3, 4].map((i) => bentoCats[i] || bentoCats[i % bentoCats.length]);

        const Tile = ({
          cat, className = '', size = 'md',
        }: {
          cat: typeof bentoCats[number];
          className?: string;
          size?: 'sm' | 'md' | 'lg';
        }) => {
          const Icon = cat.icon;
          const titleSize = size === 'lg' ? 'text-3xl sm:text-4xl' : size === 'md' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';
          return (
            <Link
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className={`group relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 ${className}`}
            >
              {cat.image ? (
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
              )}
              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-primary/40 via-transparent to-transparent" />
              {/* Icon badge */}
              <div className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
                <Icon className="w-5 h-5" strokeWidth={2} />
              </div>
              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/60 mb-1.5 font-semibold">فئة</p>
                <h3 className={`font-display font-extrabold tracking-tight ${titleSize} drop-shadow-lg`}>
                  {cat.name}
                </h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  تسوق الآن
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </span>
              </div>
            </Link>
          );
        };

        return (
          <section className="px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10 sm:mb-14">
                <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">
                  {txt('cat_kicker', 'تسوق حسب الفئة')}
                </p>
                <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight">
                  {txt('cat_title', 'مصمم لكل إعداد')}
                </h2>
                <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
              </div>

              {/* Building bento: two tall towers + middle split, small-appliances base */}
              <div className="grid grid-cols-4 md:grid-cols-12 auto-rows-[140px] sm:auto-rows-[170px] md:auto-rows-[180px] lg:auto-rows-[220px] gap-2.5 sm:gap-3 md:gap-4">
                {/* Left tower — tall on all screens */}
                {c0 && <Tile cat={c0} size="lg" className="col-span-2 row-span-2 md:col-span-4 md:row-span-2" />}

                {/* Top-right small */}
                {c1 && <Tile cat={c1} size="md" className="col-span-2 md:col-span-4" />}

                {/* Bottom-right small (aligns beside left tower on mobile) */}
                {c2 && <Tile cat={c2} size="md" className="col-span-2 md:col-span-4" />}

                {/* Wide feature — full width on mobile, tall right tower on desktop */}
                {c3 && <Tile cat={c3} size="lg" className="col-span-4 md:col-span-4 md:row-span-2 md:col-start-9 md:row-start-1" />}

                {/* Base — full-width small appliances */}
                {c4 && <Tile cat={c4} size="md" className="col-span-4 md:col-span-12" />}
              </div>
            </div>
          </section>
        );
      })()}



      {/* ─────────── TRENDING ─────────── */}
      {showSection('trending') && trendingProducts.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--grad-violet))] font-semibold mb-2 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-current" /> {txt('trend_kicker', 'الأكثر رواجاً')}
                </p>
                <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl tracking-tight">{txt('trend_title', 'الأكثر تفضيلاً هذا الأسبوع')}</h2>

              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {trendingProducts.map(p => (
                <div key={p.id} className="glass-card neon-border rounded-2xl overflow-hidden">
                  <ProductCard
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
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────── NEWEST ─────────── */}
      {showSection('newest') && (
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--grad-teal))] font-semibold mb-2">{txt('new_kicker', 'وصل حديثاً')}</p>
                <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl tracking-tight">{txt('new_title', 'جديدنا')}</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">{txt('new_desc', 'إصدارات جديدة من أفضل العلامات.')}</p>
              </div>
              <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {txt('new_allProducts', 'عرض الكل')} <ChevronRight className="w-4 h-4" />
              </Link>

            </div>

            {isLoading ? (
              <ProductGridSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                  {(allProducts?.slice(0, 8) || []).map((p) => (
                    <div key={p.id} className="glass-card neon-border rounded-2xl overflow-hidden">
                      <ProductCard
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
                    </div>
                  ))}
                </div>
                {(allProducts?.length || 0) > 8 && (
                  <div className="mt-10 flex justify-center">
                    <Link to="/products" className="btn-neon inline-flex items-center gap-2 px-7 py-3 rounded-full min-h-[48px] font-semibold">
                      {txt('new_viewAll', 'عرض كل المنتجات')} <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ─────────── DEALS OF THE DAY ─────────── */}
      {showSection('deals') && dealsProducts.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto glass-card neon-border rounded-3xl p-5 sm:p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[hsl(var(--grad-violet)/0.25)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[hsl(var(--grad-teal)/0.25)] blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--grad-violet))] font-semibold mb-2 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5" /> {txt('deals_kicker', 'لوقت محدود')}
                </p>
                <h2 className="font-display font-extrabold uppercase text-2xl sm:text-4xl tracking-tight">{txt('deals_title', 'عروض اليوم')}</h2>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto rounded-2xl glass-panel border border-white/10 px-3 py-2">
                <Clock className="w-4 h-4 text-[hsl(var(--grad-teal))]" />
                <span className="text-[11px] text-muted-foreground hidden sm:inline">{txt('deals_endsIn', 'ينتهي خلال')}</span>
                {(['h', 'm', 's'] as const).map((k, i) => (
                  <div key={k} className="flex items-center gap-1">
                    <span className="font-display font-extrabold text-sm sm:text-base bg-white/5 text-[hsl(var(--grad-teal))] border border-white/10 rounded-lg px-2 py-1 tabular-nums min-w-[2.25rem] text-center">
                      {String(countdown[k]).padStart(2, '0')}
                    </span>
                    {i < 2 && <span className="text-muted-foreground/60">:</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {dealsProducts.map(p => (
                <div key={p.id} className="glass-card neon-border rounded-2xl overflow-hidden">
                  <ProductCard
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
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────── LIMITED EDITION ─────────── */}
      {showSection('limited') && (hp?.limited.title || hp?.limited.image) && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto glass-card neon-border rounded-3xl overflow-hidden grid md:grid-cols-2 gap-0 relative">
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[hsl(var(--grad-teal)/0.25)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[hsl(var(--grad-violet)/0.25)] blur-3xl" />
            <div className="relative p-6 sm:p-10 flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.3em] font-semibold border border-white/10 glass-panel mb-4">
                <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--grad-teal))]" /> إصدار محدود
              </span>
              <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl tracking-tight">{hp?.limited.title}</h2>
              {hp?.limited.subtitle && (
                <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">{hp.limited.subtitle}</p>
              )}
              <div className="mt-6">
                <Link to={hp?.limited.link || '/products'}>
                  <Button size="lg" className="btn-neon rounded-full gap-2 min-h-[48px] border-0">
                    {hp?.limited.cta || 'تسوق الآن'} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative min-h-[260px] md:min-h-full">
              {hp?.limited.image ? (
                <img src={hp.limited.image} alt={hp.limited.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--grad-teal)/0.3)] to-[hsl(var(--grad-violet)/0.3)]" />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─────────── BRANDS ─────────── */}
      {showSection('brands') && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--grad-teal))] font-semibold mb-2">{txt('brands_kicker', 'علامات موثوقة')}</p>
              <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl tracking-tight">{txt('brands_title', 'مدعوم من الأفضل')}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {(brandsData && brandsData.length > 0
                ? brandsData
                : [{name:'Apple'},{name:'Samsung'},{name:'Dell'},{name:'HP'},{name:'Lenovo'},{name:'ASUS'},{name:'Logitech'},{name:'Sony'},{name:'JBL'},{name:'Anker'},{name:'Razer'},{name:'Bose'}]
              ).slice(0, 12).map(brand => {
                const img = ('image' in brand && brand.image) ? (brand.image as string) : null;
                return (
                  <Link
                    key={brand.name}
                    to={`/products?brand=${encodeURIComponent(brand.name)}`}
                    className="group relative aspect-square rounded-2xl overflow-hidden glass-card neon-border flex items-center justify-center hover:-translate-y-1 transition-all duration-300"
                  >
                    {img ? (
                      <img src={img} alt={brand.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/30 to-transparent" />
                    <span className="relative font-display font-extrabold text-sm sm:text-base uppercase tracking-tight">{brand.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}


      {/* ─────────── TRUST STRIP ─────────── */}
      {showSection('trust_strip') && (
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-6xl mx-auto glass-card neon-border rounded-3xl p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Truck,      label: txt('ts_delivery',  t('idx.trust.delivery')),  desc: txt('ts_deliveryDesc', t('idx.trust.deliveryDesc')) },
              { icon: Shield,     label: txt('ts_returns',   t('idx.trust.returns')),   desc: txt('ts_returnsDesc',  t('idx.trust.returnsDesc')) },
              { icon: BadgeCheck, label: txt('ts_original',  t('idx.trust.original')),  desc: txt('ts_originalDesc', t('idx.trust.originalDesc')) },
              { icon: Headphones, label: txt('ts_support',   t('idx.trust.support')),   desc: txt('ts_supportDesc',  t('idx.trust.supportDesc')) },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-2xl glass-panel border border-white/10">
                <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--grad-teal)/0.15)] border border-white/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-[hsl(var(--grad-teal))]" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-sm leading-tight">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
