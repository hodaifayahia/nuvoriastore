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
  ArrowLeft, ArrowRight, Search, Sparkles, Shield, Truck, BadgeCheck, Zap,
  ChevronRight, Star, Flame, Mail, Clock, Quote,
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
import heroImage from '@/assets/hero-tech-collection.jpg';
import trustedTechImage from '@/assets/trusted-tech-algeria.jpg';
import catPhoneCases from '@/assets/cat-phone-cases.jpg';
import catChargers from '@/assets/cat-chargers.jpg';
import catHeadphones from '@/assets/cat-headphones.jpg';
import catKeyboards from '@/assets/cat-keyboards.jpg';
import catMice from '@/assets/cat-mice.jpg';
import catLaptops from '@/assets/cat-laptops.jpg';
import catCables from '@/assets/cat-cables.jpg';
import catGaming from '@/assets/cat-gaming.jpg';

const ICON_MAP: Record<string, LucideIcon> = {
  Smartphone, Laptop, Headphones, Mouse, Keyboard, Cable, Watch, Camera,
  BatteryCharging, Cpu, Gamepad2, HardDrive, Monitor, Speaker,
};

const DEFAULT_CATEGORIES = [
  { name: 'Phone Cases',   icon: Smartphone,      accent: 'from-sky-400/30 to-blue-500/10',  image: catPhoneCases },
  { name: 'Chargers',      icon: BatteryCharging, accent: 'from-cyan-400/30 to-sky-500/10',  image: catChargers },
  { name: 'Headphones',    icon: Headphones,      accent: 'from-blue-400/30 to-sky-500/10',  image: catHeadphones },
  { name: 'Keyboards',     icon: Keyboard,        accent: 'from-sky-500/30 to-cyan-400/10',  image: catKeyboards },
  { name: 'Mice',          icon: Mouse,           accent: 'from-cyan-500/25 to-blue-500/10', image: catMice },
  { name: 'Laptops',       icon: Laptop,          accent: 'from-blue-500/30 to-sky-400/10',  image: catLaptops },
  { name: 'Cables',        icon: Cable,           accent: 'from-sky-400/25 to-cyan-400/10',  image: catCables },
  { name: 'Gaming',        icon: Gamepad2,        accent: 'from-blue-600/30 to-sky-400/10',  image: catGaming },
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
  const sectionTitle = (s: 'categories'|'trending'|'newest'|'deals'|'brands'|'testimonials'|'trusted', def: string) => hp?.title?.[s] || def;
  const sectionSubtitle = (s: 'categories'|'trending'|'newest'|'deals'|'brands'|'testimonials'|'trusted', def: string) => hp?.subtitle?.[s] || def;

  const newestProducts = useMemo(() => allProducts?.slice(0, visibleProductsCount) || [], [allProducts, visibleProductsCount]);
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
  const heroProduct = trendingProducts[0];
  const hasMore = (allProducts?.length || 0) > newestProducts.length;

  // Countdown to end of day for Deals
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

  const [emblaRef] = useEmblaCarousel({ direction: 'rtl', loop: true }, [Autoplay({ delay: 5000 })]);

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

  // Template routing (kept intact)
  if (storeTemplate === 'minimal') return <MinimalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} />;
  if (storeTemplate === 'bold')    return <BoldTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'liquid')  return <LiquidTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'digital') return <DigitalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;

  const categoryCards = useMemo(() => {
    const fromDb = (categoriesData || [])
      .filter((c: any) => c?.name)
      .slice(0, 8)
      .map((c: any, i: number) => ({
        name: c.name as string,
        icon: (c.icon && ICON_MAP[c.icon]) || DEFAULT_CATEGORIES[i % DEFAULT_CATEGORIES.length].icon,
        accent: DEFAULT_CATEGORIES[i % DEFAULT_CATEGORIES.length].accent,
        image: c.image as string | undefined,
      }));
    return fromDb.length > 0 ? fromDb : DEFAULT_CATEGORIES.map(c => ({ ...c, image: undefined }));
  }, [categoriesData]);

  // Section background tones — alternating light & dark
  const LIGHT_BG = '#EAF4FF';
  const DARK_BG = '#0B3B6F';


  // Wavy SVG divider — fill should match the NEXT section's background
  const Wave = ({ fill, flip = false }: { fill: string; flip?: boolean }) => (
    <div className="relative leading-[0] block" aria-hidden="true" style={{ marginBottom: -2, marginTop: flip ? -2 : 0 }}>
      <svg
        viewBox="0 0 1440 102"
        preserveAspectRatio="none"
        className={`block w-full h-[60px] sm:h-[90px] ${flip ? 'rotate-180' : ''}`}
        style={{ display: 'block' }}
      >
        <path
          d="M0,50 C180,100 360,0 540,40 C720,80 900,10 1080,40 C1260,70 1380,30 1440,50 L1440,102 L0,102 Z"
          fill={fill}
        />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden" style={{ background: LIGHT_BG }}>
      <SEO
        title={t('idx.seo.title')}
        description={t('idx.seo.description')}
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Akram Mobile',
          url: 'https://souq-dzair-express.lovable.app/',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://souq-dzair-express.lovable.app/products?search={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }}
      />



      {/* ────── HERO ────── */}
      {showSection('hero') && (
      <section className="relative px-3 sm:px-6 lg:px-8 pt-6 pb-10">
        <div className="relative max-w-7xl mx-auto rounded-[2rem] border border-border/60 overflow-hidden bg-gradient-to-br from-[#0B3B6F] via-[#0E5BA8] to-[#1E88E5] shadow-[0_30px_80px_-20px_rgba(30,136,229,0.35)]">
          {/* Background image */}
          <img
            src={heroImage}
            alt="Tech accessories collection"
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            width={1600}
            height={1024}
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B3B6F]/95 via-[#0E5BA8]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B3B6F] via-transparent to-transparent" />

          <div className="pointer-events-none absolute -top-32 -left-20 w-[480px] h-[480px] rounded-full bg-primary/30 blur-[120px]" />
          <div className="pointer-events-none absolute top-20 right-1/3 w-[360px] h-[360px] rounded-full bg-accent/25 blur-[120px]" />

          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative flex items-center justify-center p-8 sm:p-12 lg:p-16 min-h-[520px] lg:min-h-[580px]">
            {/* Centered copy */}
            <div className="text-white text-center max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 backdrop-blur-md text-white border border-white/20 mb-6">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                {t('idx.hero.badge')}
              </span>
              <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
                {t('idx.hero.title1')} <br />
                <span className="bg-gradient-to-r from-sky-200 via-cyan-200 to-white bg-clip-text text-transparent">
                  {t('idx.hero.title2')}
                </span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-white/70 max-w-lg mx-auto leading-relaxed">
                {t('idx.hero.subtitle')}
              </p>

              <form onSubmit={handleSearch} className="mt-7 mx-auto flex items-center gap-2 max-w-md p-1.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md">
                <Search className="w-4 h-4 text-white/60 ms-3 shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('idx.hero.searchPlaceholder')}
                  className="flex-1 border-0 bg-transparent h-10 text-sm text-white placeholder:text-white/50 focus-visible:ring-0"
                />
                <Button type="submit" size="sm" className="h-10 px-4 rounded-xl bg-white text-[#0B3B6F] hover:bg-white/90">
                  {t('idx.hero.searchBtn')}
                </Button>
              </form>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link to="/products">
                  <Button size="lg" className="rounded-full gap-2 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white border-0 shadow-[0_10px_30px_-5px_rgba(56,189,248,0.6)]">
                    {t('idx.hero.shopNow')} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/products?category=Laptops">
                  <Button size="lg" variant="outline" className="rounded-full bg-white/5 text-white border-white/20 hover:bg-white/15 hover:text-white">
                    {t('idx.hero.browseLaptops')}
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-white/70">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-fuchsia-300" /> {t('idx.hero.original')}</span>
                <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4 text-violet-300" /> {t('idx.hero.wilayas')}</span>
                <span className="inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-sky-300" /> {t('idx.hero.returns')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bento promo strip */}
        <div className="relative max-w-7xl mx-auto mt-3 sm:mt-4 grid grid-cols-12 gap-3 sm:gap-4">

          {/* Stats / promo strip */}
          <div className="col-span-6 lg:col-span-3 rounded-3xl border border-border/60 bg-card p-5 flex flex-col justify-between">
            <Zap className="w-5 h-5 text-primary" />
            <div>
              <p className="font-display font-bold text-3xl">{t('idx.bento.fastDeliveryHours')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('idx.bento.fastDeliveryDesc')}</p>
            </div>
          </div>
          <div className="col-span-6 lg:col-span-3 rounded-3xl border border-border/60 bg-card p-5 flex flex-col justify-between">
            <Cpu className="w-5 h-5 text-primary" />
            <div>
              <p className="font-display font-bold text-3xl">{allProducts?.length ?? '500+'}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('idx.bento.accessoriesAvailable')}</p>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 rounded-3xl border border-border/60 bg-gradient-to-r from-secondary/60 to-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
              <BatteryCharging className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold">{t('idx.bento.bundlesTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('idx.bento.bundlesDesc')}</p>
            </div>
            <Link to="/products" className="shrink-0">
              <Button variant="outline" size="sm" className="rounded-full">{t('idx.bento.discover')}</Button>
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* ────── HERO SLIDES (optional) ────── */}
      {heroSlides && heroSlides.length > 0 && (
        <section className="relative px-3 sm:px-6 lg:px-8 pb-10" ref={emblaRef}>
          <div className="max-w-7xl mx-auto overflow-hidden rounded-3xl border border-border/60">
            <div className="flex">
              {heroSlides.map((slide, i) => (
                <div key={i} className="flex-[0_0_100%] min-w-0">
                  {slide.link ? (
                    <Link to={slide.link}>
                      <img src={slide.url} alt={slide.alt || `Slide ${i + 1}`} className="w-full h-[280px] sm:h-[360px] lg:h-[440px] object-cover" />
                    </Link>
                  ) : (
                    <img src={slide.url} alt={slide.alt || `Slide ${i + 1}`} className="w-full h-[280px] sm:h-[360px] lg:h-[440px] object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ────── CATEGORIES BENTO ────── */}
      {showSection('categories') && (
      <div
        style={{ background: DARK_BG }}
        className="text-white [&_h2]:!text-white [&_.text-muted-foreground]:!text-white/60 [&_.bg-card]:!bg-white/[0.04] [&_.border-border\/60]:!border-white/10"
      >
        <Wave fill={LIGHT_BG} flip />

      <section className="px-3 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">{t('idx.categories.kicker')}</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">{t('idx.categories.title')}</h2>
            </div>
            <Link to="/categories" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('idx.categories.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {categoryCards.map((cat, i) => {
              const Icon = cat.icon as LucideIcon;
              const img = (cat as any).image as string | undefined;
              return (
                <Link
                  key={cat.name + i}
                  to={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card h-52 sm:h-60 flex flex-col items-center justify-center text-center hover:border-primary/60 transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_hsl(244_76%_60%/0.5)]"
                >
                  {img ? (
                    <img src={img} alt={cat.name} loading="lazy" width={768} height={768} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.accent}`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent" />

                  <div className="relative flex flex-col items-center justify-end h-full w-full pb-4 px-3 gap-1">
                    {!img && (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-background/95 backdrop-blur flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-transform duration-300 mb-2">
                        <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-primary" strokeWidth={1.75} />
                      </div>
                    )}
                    <p className="font-display font-bold text-base sm:text-lg text-background drop-shadow-md text-center">{cat.name}</p>
                    <p className="text-[11px] text-background/90 inline-flex items-center gap-1">
                      {t('idx.categories.shop')} <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
        <Wave fill={LIGHT_BG} />
      </div>
      )}

      {/* ────── TRENDING ────── */}
      {trendingProducts.length > 0 && (
        <section className="px-3 sm:px-6 lg:px-8 pb-14">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-primary" /> {t('idx.trending.kicker')}
                </p>
                <h2 className="font-display font-bold text-3xl sm:text-4xl">{t('idx.trending.title')}</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {trendingProducts.map(p => (
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
          </div>
        </section>
      )}

      {/* ────── ALL PRODUCTS ────── */}
      <div
        style={{ background: DARK_BG }}
        className="text-white [&_h2]:!text-white"
      >
        <Wave fill={LIGHT_BG} flip />

      <section className="px-3 sm:px-6 lg:px-8 pb-20 pt-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300 font-semibold mb-2">{t('idx.newest.kicker')}</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">{t('idx.newest.title')}</h2>
              <p className="text-sm text-white/60 mt-2 max-w-md">{t('idx.newest.desc')}</p>
            </div>
            <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors">
              {t('idx.newest.allProducts')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <ProductGridSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {(allProducts?.slice(0, 8) || []).map((p) => (
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
              {(allProducts?.length || 0) > 8 && (
                <div className="mt-10 flex justify-center">
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white font-medium hover:from-sky-300 hover:to-blue-500 transition-all shadow-[0_10px_30px_-5px_rgba(56,189,248,0.5)]"
                  >
                    {t('idx.newest.viewAll')} <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>
        <Wave fill={LIGHT_BG} />
      </div>


      {/* ────── DEALS OF THE DAY ────── */}
      {dealsProducts.length > 0 && (
        <section className="px-3 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-7xl mx-auto rounded-3xl border border-destructive/15 bg-gradient-to-br from-destructive/8 via-card to-card p-5 sm:p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-destructive/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-destructive font-semibold mb-2 flex items-center gap-2">
                  <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-destructive/10">
                    <Flame className="w-3.5 h-3.5" />
                  </span>
                  {t('idx.deals.kicker')}
                </p>
                <h2 className="font-display font-bold text-2xl sm:text-4xl leading-tight">{t('idx.deals.title')}</h2>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto rounded-2xl border border-border/60 bg-background/70 backdrop-blur px-3 py-2 shadow-sm">
                <Clock className="w-4 h-4 text-destructive" />
                <span className="text-[11px] text-muted-foreground hidden sm:inline">{t('idx.deals.endsIn')}</span>
                {(['h', 'm', 's'] as const).map((k, i) => (
                  <div key={k} className="flex items-center gap-1">
                    <span className="font-display font-bold text-sm sm:text-base bg-destructive/10 text-destructive rounded-lg px-2 py-1 tabular-nums min-w-[2.25rem] text-center">
                      {String(countdown[k]).padStart(2, '0')}
                    </span>
                    {i < 2 && <span className="text-muted-foreground/60">:</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {dealsProducts.map(p => (
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
          </div>
        </section>
      )}

      {/* ────── BRANDS ────── */}
      <div
        style={{ background: DARK_BG }}
        className="text-white [&_h2]:!text-white [&_.text-muted-foreground]:!text-white/60 [&_.bg-card]:!bg-white/[0.04] [&_.border-border\/60]:!border-white/10"
      >
        <Wave fill={LIGHT_BG} flip />

      <section className="px-3 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">{t('idx.brands.kicker')}</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl">{t('idx.brands.title')}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {(brandsData && brandsData.length > 0
              ? brandsData
              : [{name:'Apple'},{name:'Samsung'},{name:'Dell'},{name:'HP'},{name:'Lenovo'},{name:'ASUS'},{name:'Logitech'},{name:'Sony'},{name:'JBL'},{name:'Anker'},{name:'Razer'},{name:'Bose'}]
            ).slice(0, 12).map(brand => {
              const img = ('image' in brand && brand.image) ? (brand.image as string) : null;
              return (
                <Link
                  key={brand.name}
                  to={`/products?brand=${encodeURIComponent(brand.name)}`}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-primary/60 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300"
                >
                  {img ? (
                    <img src={img} alt={brand.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-center">
                    <span className="font-display font-bold text-base sm:text-lg !text-white drop-shadow-lg">{brand.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
        <Wave fill={LIGHT_BG} />
      </div>

      {/* ────── TESTIMONIALS ────── */}
      <section className="px-3 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">{t('idx.testimonials.kicker')}</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">{t('idx.testimonials.title')}</h2>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
              <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <span className="ms-2">{t('idx.testimonials.ratingSuffix')}</span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { name: t('idx.testimonials.t1.name'), city: t('idx.testimonials.t1.city'), text: t('idx.testimonials.t1.text'), rating: 5 },
              { name: t('idx.testimonials.t2.name'), city: t('idx.testimonials.t2.city'), text: t('idx.testimonials.t2.text'), rating: 5 },
              { name: t('idx.testimonials.t3.name'), city: t('idx.testimonials.t3.city'), text: t('idx.testimonials.t3.text'), rating: 5 },
            ].map(t => (
              <div key={t.name} className="rounded-2xl border border-border/60 bg-card p-6 relative">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/15" />
                <div className="flex mb-3">
                  {[...Array(t.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-background font-display font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── TRUSTED TECHNOLOGY IN ALGERIA ────── */}
      <div
        style={{ background: DARK_BG }}
        className="text-white"
      >
        <Wave fill={LIGHT_BG} flip />

      <section className="px-3 sm:px-6 lg:px-8 pb-16 pt-4">
        <div className="max-w-5xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/15 via-white/[0.03] to-blue-500/15 p-5 sm:p-7 lg:p-9 relative overflow-hidden">

          <div className="pointer-events-none absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full bg-sky-400/25 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-32 -right-20 w-[420px] h-[420px] rounded-full bg-blue-500/25 blur-[120px]" />

          <div className="relative">
            {/* Copy */}
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 backdrop-blur-md text-white border border-white/20 mb-5">
                <BadgeCheck className="w-3.5 h-3.5 text-sky-300" />
                {t('idx.trusted.badge')}
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                {t('idx.trusted.title1')}{' '}
                <span className="bg-gradient-to-r from-sky-200 via-cyan-200 to-white bg-clip-text text-transparent">
                  {t('idx.trusted.title2')}
                </span>{' '}
                {t('idx.trusted.title3')}
              </h2>

              <p className="mt-5 text-white/70 text-base sm:text-lg leading-relaxed max-w-lg">
                {t('idx.trusted.desc')}
              </p>

              <div className="mt-7 grid grid-cols-3 gap-4 max-w-md">
                <div>
                  <p className="font-display font-bold text-2xl sm:text-3xl text-white">+2.3k</p>
                  <p className="text-xs text-white/60 mt-1">{t('idx.trusted.customers')}</p>
                </div>
                <div>
                  <p className="font-display font-bold text-2xl sm:text-3xl text-white">58</p>
                  <p className="text-xs text-white/60 mt-1">{t('idx.trusted.wilayas')}</p>
                </div>
                <div>
                  <p className="font-display font-bold text-2xl sm:text-3xl text-white">4.9★</p>
                  <p className="text-xs text-white/60 mt-1">{t('idx.trusted.rating')}</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/products">
                  <Button size="lg" className="rounded-full bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white border-0 shadow-[0_10px_30px_-5px_rgba(56,189,248,0.6)]">
                    {t('idx.trusted.browse')} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button size="lg" variant="outline" className="rounded-full bg-white/5 text-white border-white/20 hover:bg-white/15 hover:text-white">
                    {t('idx.trusted.about')}
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

        <Wave fill={LIGHT_BG} />
      </div>


      {/* ────── TRUST STRIP ────── */}
      <section className="px-3 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto rounded-3xl border border-border/60 bg-gradient-to-br from-card via-secondary/30 to-card p-6 sm:p-10 grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Truck,      label: t('idx.trust.delivery'),  desc: t('idx.trust.deliveryDesc') },
            { icon: Shield,     label: t('idx.trust.returns'),   desc: t('idx.trust.returnsDesc') },
            { icon: BadgeCheck, label: t('idx.trust.original'),  desc: t('idx.trust.originalDesc') },
            { icon: Headphones, label: t('idx.trust.support'),   desc: t('idx.trust.supportDesc') },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-display font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
