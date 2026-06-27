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
  ChevronRight, Star,
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
  const heroProduct = trendingProducts[0];
  const hasMore = (allProducts?.length || 0) > newestProducts.length;

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

      {/* ────── HERO BENTO ────── */}
      <section className="relative px-3 sm:px-6 lg:px-8 pt-6 pb-10">
        {/* Ambient gradient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-20 w-[480px] h-[480px] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute top-40 -right-20 w-[420px] h-[420px] rounded-full bg-accent/15 blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto grid grid-cols-12 grid-rows-[auto_auto] gap-3 sm:gap-4">

          {/* Headline tile */}
          <div className="col-span-12 lg:col-span-7 row-span-1 rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-secondary/40 p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30 mb-6">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                New drops every week
              </span>
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
                Accessories <br />
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  for your devices.
                </span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
                Cases, chargers, audio, peripherals and more — curated gear for your phone, laptop and desk setup.
              </p>

              <form onSubmit={handleSearch} className="mt-7 flex items-center gap-2 max-w-md p-1.5 rounded-2xl bg-background/60 border border-border/60 backdrop-blur">
                <Search className="w-4 h-4 text-muted-foreground ms-3 shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search AirPods, USB-C, RGB keyboard…"
                  className="flex-1 border-0 bg-transparent h-10 text-sm focus-visible:ring-0"
                />
                <Button type="submit" size="sm" className="h-10 px-4 rounded-xl">
                  Search
                </Button>
              </form>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-primary" /> Authentic</span>
                <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4 text-primary" /> 58 wilayas</span>
                <span className="inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> 7-day returns</span>
              </div>
            </div>
          </div>

          {/* Hero product tile */}
          <div className="col-span-12 lg:col-span-5 row-span-1 rounded-3xl border border-border/60 bg-gradient-to-br from-primary/20 via-secondary/40 to-card p-6 sm:p-8 relative overflow-hidden min-h-[280px] flex flex-col justify-between">
            <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full bg-primary/30 blur-3xl" />
            {heroProduct ? (
              <>
                <div className="flex items-center justify-between relative">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold">Featured</span>
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <Link to={`/product/${heroProduct.id}`} className="relative group flex-1 flex items-center justify-center my-4">
                  {heroProduct.images?.[0] ? (
                    <img
                      src={heroProduct.images[0]}
                      alt={heroProduct.name}
                      className="max-h-44 object-contain drop-shadow-[0_20px_30px_hsl(244_76%_60%/0.35)] group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Headphones className="w-20 h-20 text-primary" />
                    </div>
                  )}
                </Link>
                <div className="relative">
                  <h3 className="font-display font-semibold text-lg truncate">{heroProduct.name}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-2xl font-bold font-display">{Number(heroProduct.price).toLocaleString()} <span className="text-xs text-muted-foreground">DA</span></span>
                    <Link to={`/product/${heroProduct.id}`}>
                      <Button size="sm" className="rounded-full gap-1.5">
                        Shop <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <Headphones className="w-24 h-24 opacity-40" />
              </div>
            )}
          </div>

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
                {newestProducts.map((p, i) => (
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
              {hasMore && <div ref={loadMoreRef} className="h-12" />}
            </>
          )}
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
