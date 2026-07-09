import SEO from '@/components/SEO';
import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
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
  ChevronRight, ChevronLeft, Star, Flame, Clock, Quote, RefreshCw, Wrench,
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
// Lazy-load storefront templates so visitors only download the one that's active.
const MinimalTemplate = lazy(() => import('@/components/templates/MinimalTemplate'));
const BoldTemplate = lazy(() => import('@/components/templates/BoldTemplate'));
const LiquidTemplate = lazy(() => import('@/components/templates/LiquidTemplate'));
const DigitalTemplate = lazy(() => import('@/components/templates/DigitalTemplate'));
import TextMarquee from '@/components/TextMarquee';
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
    queryKey: ['all-active-products', 'home-v2'],
    queryFn: async () => {
      // Only fetch the columns the homepage actually renders, and cap the
      // payload — the full catalogue lives on /products with its own pager.
      const { data, error } = await supabase
        .from('products')
        .select('id,name,price,old_price,price_text,short_description,images,main_image_index,category,stock,shipping_price,is_featured,created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
  const showSection = (s: 'hero'|'categories'|'featured'|'newest'|'best_prices'|'limited'|'brands'|'trust_strip') =>
    hp?.show?.[s] ?? (s !== 'limited');
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

  if (storeTemplate && storeTemplate !== 'classic') {
    if (storeTemplate === 'minimal') {
      return (
        <Suspense fallback={<div className="min-h-screen" />}>
          <MinimalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} />
        </Suspense>
      );
    }
    const Tpl =
      storeTemplate === 'bold' ? BoldTemplate :
      storeTemplate === 'liquid' ? LiquidTemplate :
      storeTemplate === 'digital' ? DigitalTemplate : null;
    if (Tpl) {
      return (
        <Suspense fallback={<div className="min-h-screen" />}>
          <Tpl products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />
        </Suspense>
      );
    }
  }

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
        // Build product-based slides from featured (or newest) products with real photos
        const productPool = (featuredProducts.length > 0 ? featuredProducts : (allProducts || []).slice(0, 6));
        const productSlides = productPool
          .map((p: any) => {
            const img = p.images?.[p.main_image_index ?? 0] || p.images?.[0];
            if (!img) return null;
            return {
              url: img,
              alt: p.name,
              title: p.name,
              subtitle: p.short_description || p.description || '',
              price: p.price ? `${p.price} د.ج` : '',
              oldPrice: p.old_price ? `${p.old_price} د.ج` : '',
              link: `/product/${p.id}`,
              badge: p.is_featured ? 'مميّز' : 'وصل حديثاً',
              cta: 'اشترِ الآن',
            };
          })
          .filter(Boolean) as any[];

        const customSlides = (heroSlides && heroSlides.length > 0 ? heroSlides : []) as any[];
        const slides = customSlides.length > 0
          ? customSlides
          : (productSlides.length > 0 ? productSlides : DEFAULT_HERO_SLIDES as any[]);
        const count = slideCount || slides.length;
        const active = slides[selectedSlide] || slides[0] || {};
        const activeTitle: string = active.title || active.alt || 'تجربة ذكية لكل ركن في منزلك';
        const activeSubtitle: string =
          active.subtitle ||
          'اكتشف الجيل القادم من الأجهزة المنزلية التي تجمع بين الأداء الفائق والتصميم العصري.';
        const activeBadge: string = active.badge || 'وصل حديثاً';
        const activePrice: string = active.price || '';
        const activeOldPrice: string = active.oldPrice || '';
        const activeCta: string = active.cta || 'اشترِ الآن';
        const activeCtaHref: string = active.link || '/products';

        // Split title on <br/> or newline for two-line reveal (second line gets gradient)
        const titleParts = activeTitle.split(/<br\s*\/?>|\n/).map((s) => s.trim()).filter(Boolean);
        const lineOne = titleParts[0] || activeTitle;
        const lineTwo = titleParts[1] || '';

        return (
          <section className="relative px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-12">
            <div className="relative max-w-7xl mx-auto group">
              <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white text-slate-900 shadow-2xl border border-white/60">
                {/* Ambient background blurs */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-[10%] -right-[5%] w-[55%] h-[65%] rounded-full blur-[120px] opacity-70"
                       style={{ background: 'hsl(var(--primary) / 0.18)' }} />
                  <div className="absolute -bottom-[10%] -left-[5%] w-[45%] h-[55%] rounded-full blur-[100px] opacity-50"
                       style={{ background: 'hsl(var(--primary) / 0.12)' }} />
                </div>

                {/* Corner wordmark */}
                <div aria-hidden className="hidden md:block absolute top-6 left-6 opacity-[0.08] select-none">
                  <span className="font-display text-4xl font-black tracking-tighter text-slate-900">NUVORIA</span>
                </div>

                {/* Embla viewport (hidden overlay just for autoplay + swipe) */}
                <div className="absolute inset-0 opacity-0 pointer-events-none" ref={emblaRef}>
                  <div className="flex h-full">
                    {slides.map((_, i) => (<div key={i} className="flex-[0_0_100%] min-w-0 h-full" />))}
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4 p-6 sm:p-10 md:p-14 lg:p-16 min-h-[520px] md:min-h-[560px] lg:min-h-[600px]" dir="rtl">
                  {/* ── Text column ── */}
                  <div key={`text-${selectedSlide}`} className="flex flex-col justify-center gap-6 md:gap-8 order-2 md:order-1">
                    <div className="flex flex-wrap gap-2 animate-fade-in">
                      <span className="px-4 py-1.5 bg-primary text-primary-foreground text-[11px] font-bold rounded-full tracking-wide">
                        {activeBadge}
                      </span>
                      <span className="px-4 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-full">
                        {txt('hero_exclusive_badge', 'حصري في NuvoriaStore')}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <h1
                        className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight animate-fade-in"
                        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
                      >
                        <span className="block text-slate-900">{lineOne}</span>
                        {lineTwo && (
                          <span
                            className="block bg-clip-text text-transparent"
                            style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' }}
                          >
                            {lineTwo}
                          </span>
                        )}
                      </h1>
                      <p
                        className="text-base sm:text-lg md:text-xl text-slate-500 max-w-lg leading-relaxed animate-fade-in"
                        style={{ animationDelay: '180ms', animationFillMode: 'both' }}
                      >
                        {activeSubtitle}
                      </p>
                    </div>

                    <div
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 animate-fade-in"
                      style={{ animationDelay: '280ms', animationFillMode: 'both' }}
                    >
                      {(activePrice || activeOldPrice) && (
                        <div className="flex flex-col">
                          {activeOldPrice && (
                            <span className="text-slate-400 text-sm line-through decoration-destructive/70">
                              {activeOldPrice}
                            </span>
                          )}
                          {activePrice && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{activePrice}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <Link
                          to={activeCtaHref}
                          className="px-8 sm:px-10 py-3.5 sm:py-4 bg-slate-900 text-white font-bold rounded-2xl hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-slate-900/10 inline-flex items-center gap-2"
                        >
                          <span>{activeCta}</span>
                          <ArrowRight className="w-4 h-4 rotate-180" />
                        </Link>
                        <Link
                          to="/wishlist"
                          aria-label={txt('hero_wishlist_alt', 'إضافة للمفضلة')}
                          className="p-3.5 sm:p-4 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors text-slate-900"
                        >
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    {/* Dots */}
                    <div className="flex gap-2.5 mt-2">
                      {Array.from({ length: count }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => scrollTo(i)}
                          aria-label={`الشريحة ${i + 1}`}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            selectedSlide === i ? 'w-12 bg-primary' : 'w-3 bg-slate-200 hover:bg-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* ── Image column ── */}
                  <div className="relative order-1 md:order-2 flex items-center justify-center p-2 sm:p-6">
                    <div key={`img-${selectedSlide}`} className="relative w-full max-w-md aspect-square animate-scale-in">
                      {/* Top-left floating badge */}
                      <div className="absolute -top-3 right-3 sm:-top-4 sm:right-4 z-20 bg-white/85 backdrop-blur-lg p-3 sm:p-4 rounded-3xl shadow-xl border border-white flex items-center gap-3 animate-fade-in"
                           style={{ animationDelay: '220ms', animationFillMode: 'both' }}>
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] sm:text-xs text-slate-400">{txt('hero_energy_label', 'توفير الطاقة')}</div>
                          <div className="text-xs sm:text-sm font-bold text-slate-800">{txt('hero_energy_value', 'فئة +++A')}</div>
                        </div>
                      </div>

                      {/* Product image */}
                      <Link
                        to={activeCtaHref}
                        className="group/img relative flex items-center justify-center w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-900/10 border-4 border-white bg-gradient-to-br from-slate-50 to-white hover:scale-[1.02] transition-transform duration-500"
                      >
                        <img
                          src={active.url}
                          alt={active.alt || activeTitle}
                          width={800}
                          height={800}
                          loading="eager"
                          fetchPriority="high"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </Link>

                      {/* Bottom-right floating badge */}
                      <div className="absolute -bottom-5 -left-3 sm:-bottom-6 sm:-left-4 z-20 bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-2xl flex flex-col gap-1 text-white animate-fade-in"
                           style={{ animationDelay: '320ms', animationFillMode: 'both' }}>
                        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'hsl(var(--primary) / 0.9)' }}>
                          {txt('hero_features_label', 'المميزات التقنية')}
                        </div>
                        <div className="text-sm sm:text-base font-bold">{txt('hero_features_value', 'التحكم عبر التطبيق')}</div>
                        <div className="flex gap-1 mt-1" dir="ltr">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--primary) / 0.5)' }} />
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--primary) / 0.3)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prev / Next */}
              <button
                type="button"
                onClick={scrollPrev}
                aria-label="السابق"
                className="absolute top-1/2 -translate-y-1/2 left-3 sm:left-5 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-900 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                aria-label="التالي"
                className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-5 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-900 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </section>
        );
      })()}

      {/* ─────────── ANNOUNCEMENT TICKER (seamless infinite text marquee) ─────────── */}
      {showSection('hero') && <TextMarquee />}


      {/* ─────────── CATEGORY BENTO (building layout) ─────────── */}
      {showSection('categories') && bentoCats.length === 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24" aria-hidden="true">
          <div className="max-w-7xl mx-auto min-h-[560px] sm:min-h-[720px] md:min-h-[760px] lg:min-h-[900px]" />
        </section>
      )}
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
                  width={600}
                  height={600}
                  loading="lazy"
                  decoding="async"
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
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/60 mb-1.5 font-semibold">{txt('cat_tag', 'فئة')}</p>
                <h3 className={`font-display font-extrabold tracking-tight ${titleSize} drop-shadow-lg`}>
                  {cat.name}
                </h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  {txt('cat_shop_now', 'تسوق الآن')}
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



      {/* ─────────── FEATURED PRODUCTS (admin picks) ─────────── */}
      {showSection('featured') && isLoading && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16" aria-hidden="true">
          <div className="max-w-6xl mx-auto min-h-[520px]" />
        </section>
      )}
      {showSection('featured') && !isLoading && featuredProducts.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-500 font-semibold mb-2 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-current" /> {txt('feat_kicker', 'منتجات مميزة')}
                </p>
                <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight">{txt('feat_title', 'اختيارات المتجر')}</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">{txt('feat_desc', 'منتجات مختارة بعناية من طرف فريقنا خصيصاً لك.')}</p>
              </div>
              <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {txt('feat_viewAll', 'عرض الكل')} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {featuredProducts.map(p => (
                <div key={p.id} className="glass-card neon-border rounded-2xl overflow-hidden relative">
                  <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-400/95 text-amber-950 text-[10px] font-bold shadow-lg">
                    <Star className="w-3 h-3 fill-current" /> {txt('feat_badge', 'مميز')}
                  </div>
                  <ProductCard
                    id={p.id}
                    name={p.name}
                    price={Number(p.price)}
                    oldPrice={p.old_price ? Number(p.old_price) : undefined}
                    priceText={(p as any).price_text}
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
                  {(allProducts?.slice(0, 4) || []).map((p) => (
                    <div key={p.id} className="glass-card neon-border rounded-2xl overflow-hidden">
                      <ProductCard
                        id={p.id}
                        name={p.name}
                        price={Number(p.price)}
                        oldPrice={p.old_price ? Number(p.old_price) : undefined}
                    priceText={(p as any).price_text}
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
                {(allProducts?.length || 0) > 4 && (
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

      {/* ─────────── PRODUCTS BY CATEGORY (all categories, randomized picks) ─────────── */}
      {bentoCats.map((cat, idx) => {
        const pool = (allProducts || [])
          .filter((p: any) => Array.isArray(p.category) && p.category.some((c: string) => c === cat.name));
        // Stable pick — keep the same 4 products across renders (products are
        // already ordered by created_at DESC from the query).
        const catProducts = pool.slice(0, 4);
        if (catProducts.length === 0) return null;
        const CatIcon = cat.icon;
        const accents = [
          'from-primary/20 to-transparent',
          'from-amber-400/20 to-transparent',
          'from-emerald-400/20 to-transparent',
          'from-fuchsia-400/20 to-transparent',
          'from-sky-400/20 to-transparent',
        ];
        const accent = accents[idx % accents.length];
        return (
          <section key={cat.name} className="px-4 sm:px-6 lg:px-8 pb-16">
            <div className="max-w-6xl mx-auto">
              <div className={`relative rounded-3xl border border-border/60 bg-gradient-to-br ${accent} p-5 sm:p-8 overflow-hidden`}>
                <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative flex items-end justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-background/80 backdrop-blur border border-border/60 flex items-center justify-center shadow-sm">
                      <CatIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-1">فئة</p>
                      <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">{cat.name}</h2>
                    </div>
                  </div>
                  <Link
                    to={`/products?category=${encodeURIComponent(cat.name)}`}
                    className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    عرض الكل <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                  {catProducts.map((p: any) => (
                    <div key={p.id} className="glass-card neon-border rounded-2xl overflow-hidden">
                      <ProductCard
                        id={p.id}
                        name={p.name}
                        price={Number(p.price)}
                        oldPrice={p.old_price ? Number(p.old_price) : undefined}
                    priceText={(p as any).price_text}
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
                <div className="sm:hidden mt-5 flex justify-center">
                  <Link
                    to={`/products?category=${encodeURIComponent(cat.name)}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                  >
                    عرض كل منتجات {cat.name} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ─────────── BEST PRICES BANNER ─────────── */}
      {showSection('best_prices') && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/60 min-h-[260px] sm:min-h-[340px]">
              <img
                src={bestPricesBanner.url}
                alt={`${txt('bp_title_line1', 'أفضل الأسعار')} ${txt('bp_title_line2', 'في الجزائر')}`}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Gradient overlay — stronger on right for RTL text */}
              <div className="absolute inset-0 bg-gradient-to-l from-[#0a1e3a]/95 via-[#0a1e3a]/70 to-transparent" />
              <div className="relative h-full flex items-center justify-end p-6 sm:p-12 lg:p-16 min-h-[260px] sm:min-h-[340px]">
                <div className="max-w-md text-right text-white">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/95 text-amber-950 text-[11px] font-bold mb-4 shadow-lg">
                    <BadgeCheck className="w-3.5 h-3.5" /> {txt('bp_badge', 'ضمان أفضل سعر')}
                  </div>
                  <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight drop-shadow-lg">
                    {txt('bp_title_line1', 'أفضل الأسعار')}<br />{txt('bp_title_line2', 'في الجزائر')}
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed">
                    {txt('bp_desc', 'أجهزة كهرومنزلية أصلية بأسعار لا تُقاوم، مع توصيل سريع إلى 58 ولاية.')}
                  </p>
                  <Link
                    to="/products"
                    className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#0a1e3a] font-bold text-sm shadow-xl hover:scale-105 transition-transform"
                  >
                    {txt('bp_cta', 'تسوق الآن')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
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
                <img src={hp.limited.image} alt={hp.limited.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--grad-teal)/0.3)] to-[hsl(var(--grad-violet)/0.3)]" />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─────────── BRANDS ─────────── */}
      {showSection('brands') && (
        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--grad-teal))] font-semibold mb-2">{txt('brands_kicker', 'علامات موثوقة')}</p>
              <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl tracking-tight">{txt('brands_title', 'مدعوم من الأفضل')}</h2>
            </div>
          </div>

          {(() => {
            const list = (brandsData && brandsData.length > 0
              ? brandsData
              : [{name:'Samsung'},{name:'LG'},{name:'Bosch'},{name:'Condor'},{name:'Brandt'}]
            );
            const renderCard = (brand: any, i: number) => {
              const img = ('image' in brand && brand.image) ? (brand.image as string) : null;
              return (
                <Link
                  key={`${brand.name}-${i}`}
                  to={`/products?brand=${encodeURIComponent(brand.name)}`}
                  className="shrink-0 w-40 sm:w-52 h-24 sm:h-28 rounded-2xl overflow-hidden bg-white border border-white/10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] flex items-center justify-center hover:-translate-y-1 hover:shadow-[0_18px_45px_-15px_hsl(var(--grad-teal)/0.55)] transition-all duration-300"
                  aria-label={brand.name}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={brand.name}
                      loading="lazy"
                      className="max-h-16 sm:max-h-20 max-w-[80%] object-contain grayscale hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <span className="font-display font-extrabold text-lg uppercase tracking-tight text-neutral-800">{brand.name}</span>
                  )}
                </Link>
              );
            };
            // Repeat the list inside each track so the track is always wider than the viewport,
            // guaranteeing a seamless loop with no visible gap when the animation wraps.
            const trackItems = [...list, ...list, ...list];
            return (
              <div
                dir="ltr"
                className="relative overflow-hidden group"
                style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
              >
                <div className="flex w-max animate-brand-marquee group-hover:[animation-play-state:paused]" style={{ animationTimingFunction: 'linear' }}>
                  {/* Two identical tracks side-by-side. Translating the parent -50% lands on the exact start of the duplicate → zero-gap loop. */}
                  <div className="flex gap-4 sm:gap-6 pr-4 sm:pr-6 shrink-0">
                    {trackItems.map((b, i) => renderCard(b, i))}
                  </div>
                  <div className="flex gap-4 sm:gap-6 pr-4 sm:pr-6 shrink-0" aria-hidden="true">
                    {trackItems.map((b, i) => renderCard(b, i + trackItems.length))}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      )}


      {/* ─────────── WARRANTY POLICY ─────────── */}
      {showSection('trust_strip') && (
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-6xl mx-auto relative overflow-hidden rounded-3xl glass-card neon-border">
            {/* Decorative gradient blobs */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[hsl(var(--grad-teal)/0.18)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[hsl(var(--grad-amber)/0.15)] blur-3xl" />

            <div className="relative p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Header column */}
              <div className="lg:col-span-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--grad-teal)/0.12)] border border-[hsl(var(--grad-teal)/0.3)] text-[hsl(var(--grad-teal))] text-xs font-semibold mb-4">
                  <Shield className="w-3.5 h-3.5" />
                  {txt('ts_tag', 'حماية موثوقة')}
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight mb-3">
                  {txt('ts_title', 'سياسة الضمان')}
                </h2>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-display text-5xl sm:text-6xl font-black bg-gradient-to-br from-[hsl(var(--grad-teal))] to-[hsl(var(--grad-amber))] bg-clip-text text-transparent">
                    {txt('ts_months', '12')}
                  </span>
                  <span className="text-lg font-semibold text-muted-foreground">
                    {txt('ts_months_suffix', 'شهراً من تاريخ الشراء')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {txt('ts_desc', 'يغطي هذا الضمان عيوب التصنيع طوال مدة الضمان المحددة أعلاه، وفق الشروط والأحكام المعمول بها.')}
                </p>
              </div>

              {/* Terms column */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: RefreshCw,
                    tag: txt('ts_card1_tag', 'الأيام السبعة الأولى'),
                    title: txt('ts_card1_title', 'استبدال كامل للجهاز'),
                    desc: txt('ts_card1_desc', 'استبدال كامل للجهاز خلال الأيام السبعة الأولى في حال ثبوت عيب مصنعي.'),
                    color: 'grad-teal',
                  },
                  {
                    icon: Wrench,
                    tag: txt('ts_card2_tag', 'بعد فترة الاستبدال'),
                    title: txt('ts_card2_title', 'إصلاح وقطع غيار'),
                    desc: txt('ts_card2_desc', 'يقتصر الضمان على إصلاح الأعطال الناتجة عن عيوب التصنيع، مع توفير قطع الغيار.'),
                    color: 'grad-amber',
                  },
                ].map((it) => (
                  <div
                    key={it.title}
                    className="group relative p-5 rounded-2xl glass-panel border border-white/10 hover:border-white/25 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-[hsl(var(--${it.color})/0.15)] border border-[hsl(var(--${it.color})/0.3)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <it.icon className={`w-5 h-5 text-[hsl(var(--${it.color}))]`} />
                    </div>
                    <p className={`text-[10px] font-bold tracking-wider uppercase text-[hsl(var(--${it.color}))] mb-1`}>
                      {it.tag}
                    </p>
                    <h3 className="font-display font-bold text-base mb-2 leading-tight">
                      {it.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {it.desc}
                    </p>
                  </div>
                ))}

                {/* Full-width coverage bar */}
                <div className="sm:col-span-2 flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--grad-teal)/0.1)] to-[hsl(var(--grad-amber)/0.1)] border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-background/50 border border-white/10 flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-5 h-5 text-[hsl(var(--grad-teal))]" />
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {txt('ts_coverage', 'الضمان يشمل عيوب التصنيع فقط، ولا يغطي الأعطال الناتجة عن سوء الاستخدام أو الحوادث.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
