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
              price: p.price ? `${Number(p.price).toLocaleString('fr-DZ')} DZD` : '',
              oldPrice: p.old_price ? `${Number(p.old_price).toLocaleString('fr-DZ')} DZD` : '',
              link: `/product/${p.id}`,
              badge: p.is_featured ? (isAr ? 'مميّز' : 'Sélection') : (isAr ? 'جديد' : 'Nouveau'),
              cta: isAr ? 'اشترِ الآن' : 'Acheter maintenant',
            };
          })
          .filter(Boolean) as any[];

        const customSlides = (heroSlides && heroSlides.length > 0 ? heroSlides : []) as any[];
        const slides = customSlides.length > 0
          ? customSlides
          : (productSlides.length > 0 ? productSlides : DEFAULT_HERO_SLIDES as any[]);
        const count = slideCount || slides.length;
        const active = slides[selectedSlide] || slides[0] || {};
        const activeTitle: string = active.title || active.alt || (isAr ? 'أجهزة موثوقة لكل البيت' : 'Des appareils fiables pour toute la maison');
        const activeSubtitle: string =
          active.subtitle ||
          (isAr
            ? 'اكتشف تشكيلة من الأجهزة الأنيقة عالية الأداء مع توصيل سريع لكل الجزائر.'
            : 'Découvrez une sélection d’appareils performants, élégants et livrés rapidement partout en Algérie.');
        const activeBadge: string = active.badge || (isAr ? 'جديد' : 'Nouveau');
        const activePrice: string = active.price || '';
        const activeOldPrice: string = active.oldPrice || '';
        const activeCta: string = active.cta || (isAr ? 'اشترِ الآن' : 'Acheter maintenant');

        const activeCtaHref: string = active.link || '/products';

        // Split title on <br/> or newline for two-line reveal (second line gets gradient)
        const titleParts = activeTitle.split(/<br\s*\/?>|\n/).map((s) => s.trim()).filter(Boolean);
        const lineOne = titleParts[0] || activeTitle;
        const lineTwo = titleParts[1] || '';

        return (
          <section className="relative px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-10">
            <div className="relative max-w-7xl mx-auto group">
              {/* Colored hero panel */}
              <div
                className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] text-white shadow-[0_40px_100px_-40px_hsl(var(--primary)/0.55)] ring-1 ring-white/10"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.88) 55%, hsl(var(--primary) / 0.75) 100%)',
                }}
              >
                {/* Decorative ambient */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[80%] rounded-full blur-[130px] opacity-40 bg-white" />
                  <div className="absolute -bottom-[25%] -right-[10%] w-[55%] h-[70%] rounded-full blur-[120px] opacity-25 bg-black" />
                  {/* subtle diagonal noise */}
                  <div
                    className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
                      backgroundSize: '22px 22px',
                    }}
                  />
                  {/* corner arc */}
                  <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full border border-white/15" />
                  <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full border border-white/10" />
                </div>

                {/* Corner wordmark */}
                <div aria-hidden className="hidden md:block absolute bottom-6 left-8 opacity-[0.10] select-none">
                  <span className="font-display text-5xl font-black tracking-tighter">NUVORIA</span>
                </div>

                {/* Embla viewport (invisible, drives autoplay + swipe) */}
                <div className="absolute inset-0 opacity-0 pointer-events-none" ref={emblaRef}>
                  <div className="flex h-full">
                    {slides.map((_, i) => (<div key={i} className="flex-[0_0_100%] min-w-0 h-full" />))}
                  </div>
                </div>

                <div
                  className="relative z-10 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-8 md:gap-6 items-center p-6 sm:p-10 md:p-14 lg:p-16 min-h-[540px] md:min-h-[560px] lg:min-h-[600px]"
                  dir="ltr"
                >
                  {/* ── Image column (left in RTL visual thanks to order) ── */}
                  <div className="relative order-1 md:order-2 flex items-center justify-center">
                    <div key={`img-${selectedSlide}`} className="relative w-full max-w-[420px] aspect-square animate-scale-in">
                      {/* decorative rings */}
                      <div aria-hidden className="absolute -inset-2 rounded-full border border-white/25" />
                      <div aria-hidden className="absolute -inset-6 rounded-full border border-white/15" />
                      <div aria-hidden className="absolute -inset-12 rounded-full border border-white/10" />

                      {/* Circular product mask */}
                      <Link
                        to={activeCtaHref}
                        className="group/img relative flex items-center justify-center w-full h-full rounded-full overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] ring-4 ring-white/25 bg-white/10 backdrop-blur-sm"
                      >
                        <img
                          src={active.url}
                          alt={active.alt || activeTitle}
                          width={800}
                          height={800}
                          loading="eager"
                          fetchPriority="high"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105"
                        />
                        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-black/25 via-transparent to-white/10" />
                      </Link>

                      {/* Rating chip (top) */}
                      <div
                        className="absolute top-2 -right-2 z-20 bg-white text-slate-900 px-3 py-2 rounded-2xl shadow-xl flex items-center gap-1.5 animate-fade-in"
                        style={{ animationDelay: '220ms', animationFillMode: 'both' }}
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold">4.9</span>
                        <span className="text-[10px] text-slate-400 font-medium">/5</span>
                      </div>

                      {/* Energy chip (bottom-left) */}
                      <div
                        className="absolute -bottom-2 -left-2 z-20 bg-white/95 backdrop-blur-lg text-slate-900 px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 animate-fade-in"
                        style={{ animationDelay: '280ms', animationFillMode: 'both' }}
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 ring-2 ring-emerald-100">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="text-left leading-tight">
                          <div className="text-[10px] text-slate-400 font-medium">
                            {txt('hero_energy_label', 'Économie d’énergie', 'توفير الطاقة')}
                          </div>
                          <div className="text-xs font-bold">{txt('hero_energy_value', 'Classe A+++', 'فئة +++A')}</div>
                        </div>
                      </div>

                      {/* Delivery chip (top-left) */}
                      <div
                        className="hidden sm:flex absolute top-10 -left-3 z-20 bg-slate-900/85 backdrop-blur-lg text-white px-3 py-2 rounded-2xl shadow-xl items-center gap-2 animate-fade-in ring-1 ring-white/10"
                        style={{ animationDelay: '340ms', animationFillMode: 'both' }}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold">{txt('hero_delivery_value', '24-48h', '24-48 ساعة')}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Text column ── */}
                  <div key={`text-${selectedSlide}`} className="flex flex-col justify-center gap-5 md:gap-6 order-2 md:order-1 text-left">
                    {/* Eyebrow */}
                    <div
                      className="flex items-center gap-3 justify-start animate-fade-in"
                    >
                      <span className="h-px w-10 bg-white/60" />
                      <span className="text-[11px] sm:text-xs font-cairo font-bold uppercase tracking-[0.2em] text-white/90">
                        {activeBadge}
                      </span>
                    </div>

                    {/* Title */}
                    <h1
                      className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight animate-fade-in drop-shadow-[0_6px_24px_rgba(0,0,0,0.15)]"
                      style={{ animationDelay: '80ms', animationFillMode: 'both' }}
                    >
                      <span className="block">{lineOne}</span>
                      {lineTwo && (
                        <span className="block text-white/85">{lineTwo}</span>
                      )}
                    </h1>

                    {/* Subtitle */}
                    <p
                      className="text-sm sm:text-base md:text-lg text-white/85 max-w-xl leading-relaxed animate-fade-in"
                      style={{ animationDelay: '180ms', animationFillMode: 'both' }}
                    >
                      {activeSubtitle}
                    </p>

                    {/* Price */}
                    {(activePrice || activeOldPrice) && (
                      <div
                        className="flex items-baseline gap-3 animate-fade-in"
                        style={{ animationDelay: '240ms', animationFillMode: 'both' }}
                      >
                        {activePrice && (
                          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                            {activePrice}
                          </span>
                        )}
                        {activeOldPrice && (
                          <span className="text-sm text-white/60 line-through">{activeOldPrice}</span>
                        )}
                      </div>
                    )}

                    {/* CTAs */}
                    <div
                      className="flex flex-wrap items-center gap-3 pt-1 animate-fade-in"
                      style={{ animationDelay: '300ms', animationFillMode: 'both' }}
                    >
                      <Link
                        to={activeCtaHref}
                        className="group/cta relative inline-flex items-center gap-2 px-7 sm:px-8 py-3.5 font-bold rounded-full bg-white text-primary overflow-hidden transition-all hover:scale-[1.03] active:scale-95 shadow-xl shadow-black/20"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-700" />
                        <span className="relative text-sm sm:text-base">{activeCta}</span>
                        <ArrowRight className="relative w-4 h-4 transition-transform group-hover/cta:translate-x-1" />
                      </Link>
                      <Link
                        to="/products"
                        className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 font-bold rounded-full border-2 border-white/70 text-white hover:bg-white hover:text-primary transition-all text-sm sm:text-base"
                      >
                        <Grid3X3 className="w-4 h-4" />
                        {txt('hero_explore_cta', 'Découvrir les catégories', 'اكتشف التصنيفات')}
                      </Link>
                    </div>

                    {/* Trust row */}
                    <div
                      className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 animate-fade-in"
                      style={{ animationDelay: '380ms', animationFillMode: 'both' }}
                    >
                      {[
                        { icon: Truck, label: txt('hero_trust_shipping', 'Livraison rapide dans toutes les wilayas', 'شحن سريع لكل الولايات') },
                        { icon: Shield, label: txt('hero_trust_warranty', 'Garantie 1 an', 'ضمان سنة كاملة') },
                        { icon: BadgeCheck, label: txt('hero_trust_payment', 'Paiement à la livraison', 'الدفع عند الاستلام') },
                      ].map((tt, i) => (
                        <div key={i} className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-white/85 font-medium">
                          <span className="w-6 h-6 rounded-full bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
                            <tt.icon className="w-3 h-3" />
                          </span>
                          {tt.label}
                        </div>
                      ))}
                    </div>

                    {/* Thumbnails */}
                    {slides.length > 1 && (
                      <div className="flex items-center gap-2 pt-2">
                        {slides.slice(0, 5).map((s: any, i: number) => {
                          const active = selectedSlide === i;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => scrollTo(i)}
                              aria-label={`Diapositive ${i + 1}`}
                              className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
                                active
                                  ? 'w-14 h-14 ring-2 ring-white shadow-lg scale-105'
                                  : 'w-11 h-11 ring-1 ring-white/40 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={s.url} alt="" className="w-full h-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Prev / Next */}
              <button
                type="button"
                onClick={scrollPrev}
                aria-label="Précédent"
                className="absolute top-1/2 -translate-y-1/2 left-3 sm:left-5 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 backdrop-blur-md text-slate-900 shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-300"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                aria-label="Suivant"
                className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-5 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 backdrop-blur-md text-slate-900 shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-300"
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
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/60 mb-1.5 font-semibold">{txt('cat_tag', 'Catégorie', 'فئة')}</p>
                <h3 className={`font-display font-extrabold tracking-tight ${titleSize} drop-shadow-lg`}>
                  {cat.name}
                </h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  {txt('cat_shop_now', 'Acheter maintenant', 'تسوق الآن')}
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
                  {txt('cat_kicker', 'Acheter par catégorie', 'تسوق حسب الفئة')}
                </p>
                <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight">
                  {txt('cat_title', 'Conçu pour chaque foyer', 'مصمّم لكل بيت')}
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
              {/* Gradient overlay — stronger on left for French text */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a1e3a]/95 via-[#0a1e3a]/70 to-transparent" />
              <div className="relative h-full flex items-center justify-start p-6 sm:p-12 lg:p-16 min-h-[260px] sm:min-h-[340px]">
                <div className="max-w-md text-left text-white">
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




      {/* ─────────── LIMITED EDITION ─────────── */}
      {showSection('limited') && (hp?.limited.title || hp?.limited.image) && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto glass-card neon-border rounded-3xl overflow-hidden grid md:grid-cols-2 gap-0 relative">
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[hsl(var(--grad-teal)/0.25)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[hsl(var(--grad-violet)/0.25)] blur-3xl" />
            <div className="relative p-6 sm:p-10 flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.3em] font-semibold border border-white/10 glass-panel mb-4">
                <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--grad-teal))]" /> Édition limitée
              </span>
              <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl tracking-tight">{hp?.limited.title}</h2>
              {hp?.limited.subtitle && (
                <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">{hp.limited.subtitle}</p>
              )}
              <div className="mt-6">
                <Link to={hp?.limited.link || '/products'}>
                  <Button size="lg" className="btn-neon rounded-full gap-2 min-h-[48px] border-0">
                    {hp?.limited.cta || (isAr ? 'اشترِ الآن' : 'Acheter maintenant')} <ArrowRight className="w-4 h-4" />
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
              <p className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--grad-teal))] font-semibold mb-2">{txt('brands_kicker', 'Marques fiables', 'علامات موثوقة')}</p>
              <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl tracking-tight">{txt('brands_title', 'Sélection des meilleures marques', 'اختيار من أفضل العلامات')}</h2>
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
