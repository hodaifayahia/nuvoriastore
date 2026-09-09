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
  ChevronRight, ChevronLeft, Star, Flame, Clock, Quote, RefreshCw, Wrench, Grid3X3,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProductCard from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/LoadingSkeleton';
import { useCategories } from '@/hooks/useCategories';
import { useBrands } from '@/hooks/useBrands';
import { useTranslation } from '@/i18n';
import { useHomepageSettings, type HpSection } from '@/hooks/useHomepageSettings';
import { ImageComparison } from '@/components/ui/image-comparison-slider';
// Lazy-load storefront templates so visitors only download the one that's active.
const MinimalTemplate = lazy(() => import('@/components/templates/MinimalTemplate'));
const BoldTemplate = lazy(() => import('@/components/templates/BoldTemplate'));
const LiquidTemplate = lazy(() => import('@/components/templates/LiquidTemplate'));
const DigitalTemplate = lazy(() => import('@/components/templates/DigitalTemplate'));
import TextMarquee from '@/components/TextMarquee';
import LimitedOfferSection from '@/components/homepage/LimitedOfferSection';

import heroBanner1 from '@/assets/hero-banner-1.jpg';
import heroBanner2 from '@/assets/hero-banner-2.jpg';
import heroBanner3 from '@/assets/hero-banner-3.jpg';
import bestPricesBannerUrl from '@/assets/hero-banner-new.jpg';
const bestPricesBanner = { url: bestPricesBannerUrl };

const DEFAULT_HERO_SLIDES = [
  { url: heroBanner1, alt: 'Froid et lavage' },
  { url: heroBanner2, alt: 'Cuisson' },
  { url: heroBanner3, alt: 'Climatisation et petit électroménager' },
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
    title: 'Ordinateurs portables',
    desc: 'Appareils performants conçus pour les créateurs, développeurs et joueurs.',
    icon: Laptop,
    cta: 'Explorer les ordinateurs',
    href: '/products?category=Laptops',
    aura: 'aura-teal',
    accent: 'hsl(180 88% 55%)',
  },
  {
    key: 'phones',
    title: 'Smartphones',
    desc: 'Téléphones premium, coques et accessoires pensés pour le quotidien.',
    icon: Smartphone,
    cta: 'Explorer les téléphones',
    href: '/products?category=Phones',
    aura: 'aura-violet',
    accent: 'hsl(270 85% 65%)',
  },
  {
    key: 'gear',
    title: 'Accessoires essentiels',
    desc: 'Écouteurs, claviers, chargeurs — tout pour compléter votre installation.',
    icon: Headphones,
    cta: 'Acheter les accessoires',
    href: '/products?category=Headphones',
    aura: 'aura-teal',
    accent: 'hsl(200 95% 55%)',
  },
];

const FALLBACK_CATS = [
  { name: 'Écouteurs', icon: Headphones },
  { name: 'Claviers', icon: Keyboard },
  { name: 'Souris', icon: Mouse },
  { name: 'Chargeurs', icon: BatteryCharging },
  { name: 'Câbles', icon: Cable },
  { name: 'Gaming', icon: Gamepad2 },
  { name: 'Montres', icon: Watch },
  { name: 'Enceintes', icon: Speaker },
];


export default function IndexPage() {
  const { data: categoriesData } = useCategories();
  const { data: brandsData } = useBrands();
  const { t, language } = useTranslation();
  const isAr = language === 'ar';

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
        .select('id,name,price,old_price,price_text,short_description,images,main_image_index,category,stock,shipping_price,is_free_shipping,slug,is_featured,created_at')
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
  const showSection = (s: HpSection) =>
    hp?.show?.[s] ?? (s !== 'limited');
  const txt = (key: string, fallback: string, arFallback?: string) => hp?.text?.[key] || (isAr && arFallback ? arFallback : fallback);

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

  const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'ltr', loop: true }, [Autoplay({ delay: 8000, stopOnInteraction: false })]);
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
        title="NuvoriaStore — Électroménager en Algérie"
        description="Électroménager, électronique et accessoires originaux avec livraison rapide dans les 58 wilayas."
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

      {/* ─────────── HERO — Full-Width Image/Video Slider ─────────── */}
      {showSection('hero') && (() => {
        const customSlides = (heroSlides && heroSlides.length > 0 ? heroSlides : []) as any[];
        
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
              link: `/product/${p.id}`,
              cta: isAr ? 'اكتشف المزيد' : 'Découvrir',
            };
          })
          .filter(Boolean) as any[];

        const slides = customSlides.length > 0
          ? customSlides
          : (productSlides.length > 0 ? productSlides : DEFAULT_HERO_SLIDES.map(s => ({ ...s, title: s.alt, cta: 'Découvrir' })) as any[]);
        const count = slideCount || slides.length;
        const active = slides[selectedSlide] || slides[0] || {};
        const isVideo = (url: string) => /\.(mp4|webm|mov)$/i.test(url);

        return (
          <section className="relative w-full">
            <div className="relative max-w-[1920px] mx-auto group">
              {/* Embla viewport (invisible, drives autoplay + swipe) */}
              <div className="absolute inset-0 opacity-0 pointer-events-none" ref={emblaRef}>
                <div className="flex h-full">
                  {slides.map((_: any, i: number) => (<div key={i} className="flex-[0_0_100%] min-w-0 h-full" />))}
                </div>
              </div>

              {/* Active slide — full-bleed */}
              <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/7] xl:aspect-[21/9] overflow-hidden bg-slate-900">
                {slides.map((slide: any, i: number) => (
                  <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === selectedSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    {isVideo(slide.url) ? (
                      <video
                        src={slide.url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={slide.url}
                        alt={slide.alt || slide.title || ''}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : undefined}
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </div>
                ))}

                {/* Bottom content overlay */}
                <div className="absolute bottom-0 left-0 right-0 z-20 p-6 sm:p-10 lg:p-14 flex items-end justify-between gap-4">
                  {/* Title */}
                  <div>
                    <h1 key={`title-${selectedSlide}`} className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.4)] animate-fade-in">
                      {active.title || active.alt || (isAr ? 'اكتشف المجموعة' : 'Découvrez la collection')}
                    </h1>
                  </div>
                  {/* CTA Button */}
                  <Link
                    to={active.link || '/products'}
                    className="shrink-0 inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-white/95 backdrop-blur-sm text-slate-900 font-bold text-sm sm:text-base shadow-xl hover:bg-white hover:scale-105 transition-all duration-300"
                  >
                    <span>{active.cta || (isAr ? 'اكتشف' : 'Découvrir')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Navigation dots */}
                {count > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    {slides.map((_: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => scrollTo(i)}
                        className={`rounded-full transition-all duration-300 ${i === selectedSlide ? 'w-8 h-3 bg-white' : 'w-3 h-3 bg-white/50 hover:bg-white/70'}`}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Prev / Next arrows */}
                <button
                  type="button"
                  onClick={scrollPrev}
                  aria-label="Précédent"
                  className="absolute top-1/2 -translate-y-1/2 left-4 sm:left-8 z-20 w-12 h-12 rounded-full border-2 border-white/60 bg-transparent text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white hover:text-slate-900 transition-all duration-300"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  aria-label="Suivant"
                  className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-8 z-20 w-12 h-12 rounded-full border-2 border-white/60 bg-white/95 text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-300 shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Swipe hint (mobile only) */}
            <div className="sm:hidden text-center py-2">
              <span className="text-xs text-muted-foreground font-cairo">👆 Glissez pour découvrir</span>
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
      {showSection('categories') && bentoCats.length > 0 && (
        <section className="pb-16 sm:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-2">
                {txt('cat_kicker', 'Acheter par catégorie', 'تسوق حسب الفئة')}
              </p>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight">
                {txt('cat_title', 'Conçu pour chaque foyer', 'مصمّم لكل بيت')}
              </h2>
              <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
            </div>
          </div>

          <div
            className="overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex justify-center gap-4 sm:gap-6 px-4 sm:px-6 lg:px-8 pb-4 mx-auto w-max min-w-full">

              <Link
                to="/products"
                className="group flex flex-col items-center gap-3 shrink-0 snap-start"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center group-hover:scale-105 group-hover:border-primary/50 transition-all shadow-md">
                  <Grid3X3 className="w-9 h-9 sm:w-10 sm:h-10 text-primary" strokeWidth={1.8} />
                </div>
                <span className="font-display font-bold text-sm sm:text-base text-foreground text-center max-w-[110px] truncate">
                  {txt('cat_all', 'Tout', 'الكل')}
                </span>
              </Link>

              {bentoCats.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.name}
                    to={`/products?category=${encodeURIComponent(cat.name)}`}
                    className="group flex flex-col items-center gap-3 shrink-0 snap-start"
                  >
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden bg-muted border-2 border-border/60 group-hover:scale-105 group-hover:border-primary/60 group-hover:shadow-xl transition-all shadow-md">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center">
                          <Icon className="w-9 h-9 sm:w-10 sm:h-10 text-primary/70" strokeWidth={1.8} />
                        </div>
                      )}
                    </div>
                    <span className="font-display font-bold text-sm sm:text-base text-foreground text-center max-w-[110px] sm:max-w-[130px] truncate">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-4 sm:hidden text-center">
            <Link to="/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              {txt('cat_all', 'Voir tout', 'عرض الكل')}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
        </section>
      )}

      {/* ─────────── LIMITED OFFER (under categories) ─────────── */}
      {showSection('limited') && (
        <LimitedOfferSection
          title={hp?.limited.title}
          subtitle={hp?.limited.subtitle}
          image={hp?.limited.image}
          link={hp?.limited.link}
          cta={hp?.limited.cta}
          endDate={hp?.limited.end_date}
          price={hp?.limited.price ?? undefined}
          oldPrice={hp?.limited.old_price ?? undefined}
        />
      )}


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
                  <Star className="w-3.5 h-3.5 fill-current" /> {txt('feat_kicker', 'Produits sélectionnés', 'منتجات مختارة')}
                </p>
                <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight">{txt('feat_title', 'Choix de la boutique', 'اختيار المتجر')}</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">{txt('feat_desc', 'Des produits soigneusement sélectionnés par notre équipe.', 'منتجات مختارة بعناية من طرف فريقنا.')}</p>
              </div>
              <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {txt('feat_viewAll', 'Voir tout', 'عرض الكل')} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {featuredProducts.map(p => (
                <div key={p.id} className="glass-card neon-border rounded-2xl overflow-hidden relative">
                  <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-400/95 text-amber-950 text-[10px] font-bold shadow-lg">
                    <Star className="w-3 h-3 fill-current" /> {txt('feat_badge', 'Sélection', 'مميّز')}
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
                    isFreeShipping={!!(p as any).is_free_shipping}
                      slug={(p as any).slug}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Promotional Video 1 */}
      {hp?.promoVideos && hp.promoVideos[0] && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-4xl mx-auto rounded-[2rem] overflow-hidden shadow-2xl bg-slate-900 border border-white/10 aspect-video relative group">
            <video
              src={hp.promoVideos[0]}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="w-full h-full object-cover"
            />
          </div>
        </section>
      )}


      {/* ─────────── COMPARISON SLIDER ─────────── */}
      {showSection('comparison') && hp?.comparison?.before && hp?.comparison?.after && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-[1400px] mx-auto w-full">
            <div className="text-center mb-8">
              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-500 font-semibold mb-2">
                {isAr ? 'قارن بنفسك' : 'Comparez vous-même'}
              </p>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight">
                {isAr ? 'قبل وبعد استخدام منتجاتنا' : 'Avant & Après utilisation'}
              </h2>
            </div>
            <div className="w-full">
              <ImageComparison
                beforeImage={hp.comparison.before}
                afterImage={hp.comparison.after}
                altBefore="Avant"
                altAfter="Après"
              />
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
                <p className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--grad-teal))] font-semibold mb-2">{txt('new_kicker', 'Nouveautés', 'جديد')}</p>
                <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl tracking-tight">{txt('new_title', 'Nouveau en boutique', 'جديد في المتجر')}</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">{txt('new_desc', 'Les dernières références des meilleures marques.', 'أحدث الإصدارات من أفضل العلامات.')}</p>
              </div>
              <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {txt('new_allProducts', 'Voir tout', 'عرض الكل')} <ChevronRight className="w-4 h-4" />
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
                    isFreeShipping={!!(p as any).is_free_shipping}
                      slug={(p as any).slug}
                      />
                    </div>
                  ))}
                </div>
                {(allProducts?.length || 0) > 4 && (
                  <div className="mt-10 flex justify-center">
                    <Link to="/products" className="btn-neon inline-flex items-center gap-2 px-7 py-3 rounded-full min-h-[48px] font-semibold">
                      {txt('new_viewAll', 'Voir tous les produits', 'عرض كل المنتجات')} <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Promotional Video 2 */}
      {hp?.promoVideos && hp.promoVideos[1] && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-4xl mx-auto rounded-[2rem] overflow-hidden shadow-2xl bg-slate-900 border border-white/10 aspect-video relative group">
            <video
              src={hp.promoVideos[1]}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="w-full h-full object-cover"
            />
          </div>
        </section>
      )}




      {/* ─────────── BEST PRICES BANNER ─────────── */}
      {showSection('best_prices') && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/60 min-h-[260px] sm:min-h-[340px]">
              <img
                src={bestPricesBanner.url}
                alt={`${txt('bp_title_line1', 'Les meilleurs prix', 'أفضل الأسعار')} ${txt('bp_title_line2', 'en Algérie', 'في الجزائر')}`}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Gradient overlay — stronger on the side where text sits */}
              <div className={`absolute inset-0 ${isAr ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-[#0a1e3a]/95 via-[#0a1e3a]/70 to-transparent`} />
              <div dir="ltr" className={`relative h-full flex items-center ${isAr ? 'justify-end' : 'justify-start'} p-6 sm:p-12 lg:p-16 min-h-[260px] sm:min-h-[340px]`}>
                <div dir={isAr ? 'rtl' : 'ltr'} className="max-w-md text-white" style={{ textAlign: isAr ? 'right' : 'left' }}>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/95 text-amber-950 text-[11px] font-bold mb-4 shadow-lg">
                    <BadgeCheck className="w-3.5 h-3.5" /> {txt('bp_badge', 'Meilleur prix garanti', 'أفضل سعر مضمون')}
                  </div>
                  <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight drop-shadow-lg">
                    {txt('bp_title_line1', 'Les meilleurs prix', 'أفضل الأسعار')}<br />{txt('bp_title_line2', 'en Algérie', 'في الجزائر')}
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed">
                    {txt('bp_desc', 'Électroménager original à prix imbattables, avec livraison rapide dans les 58 wilayas.', 'أجهزة كهرومنزلية أصلية بأسعار لا تُقاوم، مع توصيل سريع لـ 58 ولاية.')}
                  </p>
                  <Link
                    to="/products"
                    className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#0a1e3a] font-bold text-sm shadow-xl hover:scale-105 transition-transform"
                  >
                    {txt('bp_cta', 'Acheter maintenant', 'اشترِ الآن')} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}







      {/* ─────────── BRANDS ─────────── */}
      {showSection('brands') && (
        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--grad-teal))] font-semibold mb-2">{txt('brands_kicker', 'Marques fiables', 'علامات موثوقة')}</p>
              <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl tracking-tight">{txt('brands_title', 'Sélection des meilleures marques', 'اختيار من أفضل العلامات')}</h2>
            </div>
          </div>

          {(() => {
            const list = (brandsData && brandsData.length > 0
              ? brandsData
              : [{name:'Samsung'},{name:'LG'},{name:'Bosch'},{name:'Condor'},{name:'Brandt'},{name:'Beko'},{name:'Midea'},{name:'Teka'}]
            );
            
            const renderBrand = (brand: any, i: number, darkText: boolean) => {
              const img = ('image' in brand && brand.image) ? (brand.image as string) : null;
              return (
                <Link
                  key={`${darkText ? 'yellow' : 'white'}-${brand.name}-${i}`}
                  to={`/products?brand=${encodeURIComponent(brand.name)}`}
                  className="shrink-0 h-16 sm:h-20 px-8 sm:px-12 rounded-[2rem] flex items-center justify-center bg-white/95 dark:bg-slate-900 border border-border/40 hover:border-orange-500 shadow-sm hover:scale-105 transition-all duration-300 mx-4"
                  aria-label={brand.name}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={brand.name}
                      loading="lazy"
                      className="max-h-10 sm:max-h-12 w-auto object-contain"
                    />
                  ) : (
                    <span className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wide text-foreground">{brand.name}</span>
                  )}
                </Link>
              );
            };

            const trackItemsYellow = [...list, ...list, ...list];
            const shiftedList = list.length > 2 ? [...list.slice(2), ...list.slice(0, 2)] : list;
            const trackItemsWhite = [...shiftedList, ...shiftedList, ...shiftedList];
            
            return (
              <div className="relative overflow-hidden py-12 flex flex-col gap-8 w-full" dir="ltr">
                {/* Track 1: Yellow slanted ribbon, moving left */}
                <div 
                  className="w-[110%] -left-[5%] relative overflow-hidden bg-[#FCD34D] py-5 shadow-lg -rotate-2 transform scale-102"
                  style={{ 
                    maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', 
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' 
                  }}
                >
                  <div className="flex w-max animate-brand-marquee" style={{ animationTimingFunction: 'linear' }}>
                    <div className="flex shrink-0">
                      {trackItemsYellow.map((b, i) => renderBrand(b, i, true))}
                    </div>
                    <div className="flex shrink-0" aria-hidden="true">
                      {trackItemsYellow.map((b, i) => renderBrand(b, i + trackItemsYellow.length, true))}
                    </div>
                  </div>
                </div>

                {/* Track 2: White slanted ribbon, moving right (opposite direction) */}
                <div 
                  className="w-[110%] -left-[5%] relative overflow-hidden bg-card border-y border-border/80 py-5 shadow-md rotate-2 transform scale-102"
                  style={{ 
                    maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', 
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' 
                  }}
                >
                  <div className="flex w-max animate-brand-marquee-reverse" style={{ animationTimingFunction: 'linear' }}>
                    <div className="flex shrink-0">
                      {trackItemsWhite.map((b, i) => renderBrand(b, i, false))}
                    </div>
                    <div className="flex shrink-0" aria-hidden="true">
                      {trackItemsWhite.map((b, i) => renderBrand(b, i + trackItemsWhite.length, false))}
                    </div>
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
                  {txt('ts_tag', 'Protection fiable', 'حماية موثوقة')}
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight mb-3">
                  {txt('ts_title', 'Politique de garantie', 'سياسة الضمان')}
                </h2>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-display text-5xl sm:text-6xl font-black bg-gradient-to-br from-[hsl(var(--grad-teal))] to-[hsl(var(--grad-amber))] bg-clip-text text-transparent">
                    {txt('ts_months', '12', '12')}
                  </span>
                  <span className="text-lg font-semibold text-muted-foreground">
                    {txt('ts_months_suffix', 'mois à compter de l’achat', 'شهرًا من تاريخ الشراء')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {txt('ts_desc', 'Cette garantie couvre les défauts de fabrication pendant toute la période indiquée, selon les conditions applicables.', 'يغطي هذا الضمان عيوب التصنيع خلال الفترة المذكورة وفق الشروط المعمول بها.')}
                </p>
              </div>

              {/* Terms column */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: RefreshCw,
                    tag: txt('ts_card1_tag', 'Les 7 premiers jours', 'أول 7 أيام'),
                    title: txt('ts_card1_title', 'Remplacement complet', 'استبدال كامل'),
                    desc: txt('ts_card1_desc', 'Remplacement complet de l’appareil pendant les sept premiers jours si un défaut de fabrication est confirmé.', 'استبدال كامل للجهاز خلال الأيام السبعة الأولى في حال تأكيد عيب تصنيع.'),
                    color: 'grad-teal',
                  },
                  {
                    icon: Wrench,
                    tag: txt('ts_card2_tag', 'Après la période de remplacement', 'بعد فترة الاستبدال'),
                    title: txt('ts_card2_title', 'Réparation et pièces', 'إصلاح وقطع غيار'),
                    desc: txt('ts_card2_desc', 'La garantie couvre la réparation des pannes dues à un défaut de fabrication, avec pièces détachées si nécessaire.', 'يشمل الضمان إصلاح الأعطال الناتجة عن عيوب التصنيع مع توفير قطع الغيار عند الحاجة.'),
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
                    {txt('ts_coverage', 'La garantie couvre uniquement les défauts de fabrication et ne couvre pas les dommages causés par une mauvaise utilisation ou un accident.', 'يغطي الضمان عيوب التصنيع فقط ولا يشمل الأعطال الناتجة عن سوء الاستخدام أو الحوادث.')}
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
