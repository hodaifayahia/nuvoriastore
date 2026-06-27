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
import MinimalTemplate from '@/components/templates/MinimalTemplate';
import BoldTemplate from '@/components/templates/BoldTemplate';
import LiquidTemplate from '@/components/templates/LiquidTemplate';
import DigitalTemplate from '@/components/templates/DigitalTemplate';
import heroImage from '@/assets/hero-tech-collection.jpg';

const ICON_MAP: Record<string, LucideIcon> = {
  Smartphone, Laptop, Headphones, Mouse, Keyboard, Cable, Watch, Camera,
  BatteryCharging, Cpu, Gamepad2, HardDrive, Monitor, Speaker,
};

const DEFAULT_CATEGORIES = [
  { name: 'Phone Cases',   icon: Smartphone,        accent: 'from-indigo-500/30 to-violet-500/10', tag: 'phone' },
  { name: 'Chargers',      icon: BatteryCharging,   accent: 'from-fuchsia-500/30 to-indigo-500/10', tag: 'charger' },
  { name: 'Headphones',    icon: Headphones,        accent: 'from-blue-500/30 to-indigo-500/10', tag: 'headphone' },
  { name: 'Keyboards',     icon: Keyboard,          accent: 'from-violet-500/30 to-fuchsia-500/10', tag: 'keyboard' },
  { name: 'Mice',          icon: Mouse,             accent: 'from-cyan-500/25 to-indigo-500/10', tag: 'mouse' },
  { name: 'Laptops',       icon: Laptop,            accent: 'from-indigo-500/30 to-purple-500/10', tag: 'laptop' },
  { name: 'Cables',        icon: Cable,             accent: 'from-sky-500/25 to-violet-500/10', tag: 'cable' },
  { name: 'Gaming',        icon: Gamepad2,          accent: 'from-purple-500/30 to-fuchsia-500/10', tag: 'gaming' },
];

export default function IndexPage() {
  const { data: categoriesData } = useCategories();
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

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ────── HERO ────── */}
      <section className="relative px-3 sm:px-6 lg:px-8 pt-6 pb-10">
        <div className="relative max-w-7xl mx-auto rounded-[2rem] border border-border/60 overflow-hidden bg-gradient-to-br from-[#0b0820] via-[#140a2e] to-[#1a0c3a] shadow-[0_30px_80px_-20px_rgba(120,80,255,0.35)]">
          {/* Background image */}
          <img
            src={heroImage}
            alt="Tech accessories collection"
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            width={1600}
            height={1024}
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0820]/95 via-[#140a2e]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0820] via-transparent to-transparent" />
          <div className="pointer-events-none absolute -top-32 -left-20 w-[480px] h-[480px] rounded-full bg-primary/30 blur-[120px]" />
          <div className="pointer-events-none absolute top-20 right-1/3 w-[360px] h-[360px] rounded-full bg-accent/25 blur-[120px]" />

          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative grid lg:grid-cols-2 gap-8 p-8 sm:p-12 lg:p-16 min-h-[560px] lg:min-h-[620px] items-center">
            {/* Left: copy */}
            <div className="text-white">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 backdrop-blur-md text-white border border-white/20 mb-6">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                Free shipping over 5,000 DA
              </span>
              <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
                Gear up. <br />
                <span className="bg-gradient-to-r from-fuchsia-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
                  Power on.
                </span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-white/70 max-w-lg leading-relaxed">
                Laptops, phones, audio and peripherals — curated, original, and delivered fast across Algeria.
              </p>

              <form onSubmit={handleSearch} className="mt-7 flex items-center gap-2 max-w-md p-1.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md">
                <Search className="w-4 h-4 text-white/60 ms-3 shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search MacBook, AirPods, Logitech…"
                  className="flex-1 border-0 bg-transparent h-10 text-sm text-white placeholder:text-white/50 focus-visible:ring-0"
                />
                <Button type="submit" size="sm" className="h-10 px-4 rounded-xl bg-white text-[#140a2e] hover:bg-white/90">
                  Search
                </Button>
              </form>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/products">
                  <Button size="lg" className="rounded-full gap-2 bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white border-0 shadow-[0_10px_30px_-5px_rgba(217,70,239,0.5)]">
                    Shop now <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/products?category=Laptops">
                  <Button size="lg" variant="outline" className="rounded-full bg-white/5 text-white border-white/20 hover:bg-white/15 hover:text-white">
                    Browse laptops
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-fuchsia-300" /> 100% Authentic</span>
                <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4 text-violet-300" /> 58 wilayas</span>
                <span className="inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-sky-300" /> 7-day returns</span>
              </div>
            </div>

            {/* Right: floating stat cards layered over the hero image */}
            <div className="hidden lg:flex relative h-full items-center justify-center">
              <div className="absolute top-6 right-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 w-44 animate-fade-in shadow-2xl">
                <div className="flex items-center gap-2 text-white">
                  <Sparkles className="w-4 h-4 text-fuchsia-300" />
                  <span className="text-xs font-medium">Latest drop</span>
                </div>
                <p className="mt-1 text-sm text-white/70">MacBook Pro M3 in stock</p>
              </div>

              <div className="absolute bottom-12 right-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 w-48 shadow-2xl">
                <div className="flex items-center gap-2 text-white">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span className="text-xs font-medium">Express delivery</span>
                </div>
                <p className="mt-1 text-2xl font-display font-bold text-white">24 hours</p>
                <p className="text-[11px] text-white/60">in Algiers</p>
              </div>

              <div className="absolute bottom-2 left-8 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3 flex items-center gap-3 shadow-2xl">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-[#140a2e] bg-gradient-to-br from-fuchsia-400 to-violet-500" />
                  ))}
                </div>
                <div className="text-white">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-300 text-yellow-300" />)}
                  </div>
                  <p className="text-[11px] text-white/70">2,300+ happy customers</p>
                </div>
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
              <p className="font-display font-bold text-3xl">24h</p>
              <p className="text-xs text-muted-foreground mt-1">Express delivery in Algiers</p>
            </div>
          </div>
          <div className="col-span-6 lg:col-span-3 rounded-3xl border border-border/60 bg-card p-5 flex flex-col justify-between">
            <Cpu className="w-5 h-5 text-primary" />
            <div>
              <p className="font-display font-bold text-3xl">{allProducts?.length ?? '500+'}</p>
              <p className="text-xs text-muted-foreground mt-1">Accessories in stock</p>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 rounded-3xl border border-border/60 bg-gradient-to-r from-secondary/60 to-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
              <BatteryCharging className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold">Bundle & save up to 25%</p>
              <p className="text-xs text-muted-foreground">Charger + cable + case combos</p>
            </div>
            <Link to="/products" className="shrink-0">
              <Button variant="outline" size="sm" className="rounded-full">Explore</Button>
            </Link>
          </div>
        </div>
      </section>

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
      <section className="px-3 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Shop by category</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">Everything for your devices</h2>
            </div>
            <Link to="/categories" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {categoryCards.map((cat, i) => {
              const Icon = cat.icon as LucideIcon;
              return (
                <Link
                  key={cat.name + i}
                  to={`/products?category=${encodeURIComponent(cat.name)}`}
                  className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${cat.accent} bg-card p-5 h-32 sm:h-36 flex flex-col justify-between hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_hsl(244_76%_60%/0.4)]`}
                >
                  <div className="w-10 h-10 rounded-xl bg-background/60 backdrop-blur flex items-center justify-center border border-border/40">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm sm:text-base group-hover:text-primary transition-colors">{cat.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                      Shop <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────── TRENDING ────── */}
      {trendingProducts.length > 0 && (
        <section className="px-3 sm:px-6 lg:px-8 pb-14">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-primary" /> Trending now
                </p>
                <h2 className="font-display font-bold text-3xl sm:text-4xl">Most-loved this week</h2>
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
      <section className="px-3 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Fresh arrivals</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">New in store</h2>
            </div>
            <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              All products <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <ProductGridSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {(allProducts?.slice(0, 8) || []).map((p, i) => (
                  <div key={p.id} style={{ animationDelay: `${i * 0.05}s` }} className="animate-fade-in opacity-0 [animation-fill-mode:forwards]">
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
                <div className="mt-8 flex justify-center">
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                  >
                    View all products <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ────── DEALS OF THE DAY ────── */}
      {dealsProducts.length > 0 && (
        <section className="px-3 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-7xl mx-auto rounded-3xl border border-border/60 bg-gradient-to-br from-destructive/10 via-card to-primary/5 p-6 sm:p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-destructive/20 blur-3xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-destructive font-semibold mb-2 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5" /> Deals of the day
                </p>
                <h2 className="font-display font-bold text-3xl sm:text-4xl">Limited-time savings</h2>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Ends in</span>
                {(['h', 'm', 's'] as const).map((k, i) => (
                  <div key={k} className="flex items-center gap-1">
                    <span className="font-display font-bold text-base bg-background border border-border/60 rounded-lg px-2.5 py-1 tabular-nums">
                      {String(countdown[k]).padStart(2, '0')}
                    </span>
                    {i < 2 && <span className="text-muted-foreground">:</span>}
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
      <section className="px-3 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Trusted brands</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl">Shop the world's best</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
            {['Apple','Dell','HP','Lenovo','ASUS','Logitech','Razer','Anker','Sony','JBL','Samsung','Bose'].slice(0, 8).map(brand => (
              <div
                key={brand}
                className="aspect-[3/2] rounded-2xl border border-border/60 bg-card flex items-center justify-center font-display font-bold text-lg text-muted-foreground hover:text-primary hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── TESTIMONIALS ────── */}
      <section className="px-3 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Loved by customers</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">What people say</h2>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
              <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <span className="ms-2">4.9 / 5 · 2,300+ reviews</span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { name: 'Yacine B.', city: 'Algiers', text: 'Got my MacBook charger next day. Original product, sealed box. Will buy again.', rating: 5 },
              { name: 'Lina K.',   city: 'Oran',    text: 'The Keychron keyboard is amazing. Great prices and fast delivery to Oran.', rating: 5 },
              { name: 'Omar S.',   city: 'Constantine', text: 'Smooth checkout, real support over the phone, and packaging was perfect.', rating: 5 },
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

      {/* ────── NEWSLETTER ────── */}
      <section className="px-3 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto rounded-3xl border border-border/60 bg-gradient-to-br from-primary/20 via-card to-accent/15 p-8 sm:p-12 relative overflow-hidden text-center">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-primary/20 blur-3xl" />
          <div className="relative max-w-xl mx-auto">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 items-center justify-center mb-5">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl">Get 10% off your first order</h2>
            <p className="mt-3 text-muted-foreground">
              Subscribe for new arrivals, exclusive deals and tech tips. No spam, unsubscribe anytime.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); alert('Thanks! Check your inbox for your coupon.'); }}
              className="mt-6 flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-2xl bg-background/70 border border-border/60 backdrop-blur"
            >
              <Input type="email" required placeholder="you@example.com" className="flex-1 border-0 bg-transparent h-11 focus-visible:ring-0" />
              <Button type="submit" className="h-11 px-6 rounded-xl">Subscribe</Button>
            </form>
          </div>
        </div>
      </section>

      {/* ────── TRUST STRIP ────── */}
      <section className="px-3 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto rounded-3xl border border-border/60 bg-gradient-to-br from-card via-secondary/30 to-card p-6 sm:p-10 grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Truck,      label: 'Fast shipping',  desc: 'Across all 58 wilayas' },
            { icon: Shield,     label: '7-day returns',  desc: 'No questions asked' },
            { icon: BadgeCheck, label: 'Authentic',      desc: '100% original products' },
            { icon: Headphones, label: 'Real support',   desc: 'Chat with our team' },
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
