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
import { useTranslation } from '@/i18n';
import MinimalTemplate from '@/components/templates/MinimalTemplate';
import BoldTemplate from '@/components/templates/BoldTemplate';
import LiquidTemplate from '@/components/templates/LiquidTemplate';
import DigitalTemplate from '@/components/templates/DigitalTemplate';
import heroImage from '@/assets/hero-tech-collection.jpg';
import trustedTechImage from '@/assets/trusted-tech-algeria.jpg';

const ICON_MAP: Record<string, LucideIcon> = {
  Smartphone, Laptop, Headphones, Mouse, Keyboard, Cable, Watch, Camera,
  BatteryCharging, Cpu, Gamepad2, HardDrive, Monitor, Speaker,
};

const DEFAULT_CATEGORIES = [
  { name: 'Phone Cases',   icon: Smartphone,        accent: 'from-sky-400/30 to-blue-500/10', tag: 'phone' },
  { name: 'Chargers',      icon: BatteryCharging,   accent: 'from-cyan-400/30 to-sky-500/10', tag: 'charger' },
  { name: 'Headphones',    icon: Headphones,        accent: 'from-blue-400/30 to-sky-500/10', tag: 'headphone' },
  { name: 'Keyboards',     icon: Keyboard,          accent: 'from-sky-500/30 to-cyan-400/10', tag: 'keyboard' },
  { name: 'Mice',          icon: Mouse,             accent: 'from-cyan-500/25 to-blue-500/10', tag: 'mouse' },
  { name: 'Laptops',       icon: Laptop,            accent: 'from-blue-500/30 to-sky-400/10', tag: 'laptop' },
  { name: 'Cables',        icon: Cable,             accent: 'from-sky-400/25 to-cyan-400/10', tag: 'cable' },
  { name: 'Gaming',        icon: Gamepad2,          accent: 'from-blue-600/30 to-sky-400/10', tag: 'gaming' },
];


export default function IndexPage() {
  const { data: categoriesData } = useCategories();
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
                شحن مجاني للطلبات فوق 5,000 دج
              </span>
              <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
                جهّز عتادك. <br />
                <span className="bg-gradient-to-r from-sky-200 via-cyan-200 to-white bg-clip-text text-transparent">
                  وانطلق.
                </span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-white/70 max-w-lg mx-auto leading-relaxed">
                حواسيب، هواتف، سماعات وملحقات — منتقاة، أصلية، وتُسلَّم بسرعة عبر الجزائر.
              </p>

              <form onSubmit={handleSearch} className="mt-7 mx-auto flex items-center gap-2 max-w-md p-1.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md">
                <Search className="w-4 h-4 text-white/60 ms-3 shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن MacBook أو AirPods أو Logitech…"
                  className="flex-1 border-0 bg-transparent h-10 text-sm text-white placeholder:text-white/50 focus-visible:ring-0"
                />
                <Button type="submit" size="sm" className="h-10 px-4 rounded-xl bg-white text-[#0B3B6F] hover:bg-white/90">
                  بحث
                </Button>
              </form>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link to="/products">
                  <Button size="lg" className="rounded-full gap-2 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white border-0 shadow-[0_10px_30px_-5px_rgba(56,189,248,0.6)]">
                    تسوّق الآن <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/products?category=Laptops">
                  <Button size="lg" variant="outline" className="rounded-full bg-white/5 text-white border-white/20 hover:bg-white/15 hover:text-white">
                    تصفّح الحواسيب
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-white/70">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-fuchsia-300" /> أصلي 100%</span>
                <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4 text-violet-300" /> 58 ولاية</span>
                <span className="inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-sky-300" /> إرجاع خلال 7 أيام</span>
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
              <p className="font-display font-bold text-3xl">24 س</p>
              <p className="text-xs text-muted-foreground mt-1">توصيل سريع في الجزائر العاصمة</p>
            </div>
          </div>
          <div className="col-span-6 lg:col-span-3 rounded-3xl border border-border/60 bg-card p-5 flex flex-col justify-between">
            <Cpu className="w-5 h-5 text-primary" />
            <div>
              <p className="font-display font-bold text-3xl">{allProducts?.length ?? '500+'}</p>
              <p className="text-xs text-muted-foreground mt-1">إكسسوار متوفر</p>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 rounded-3xl border border-border/60 bg-gradient-to-r from-secondary/60 to-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
              <BatteryCharging className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold">عروض الباقات — وفّر حتى 25%</p>
              <p className="text-xs text-muted-foreground">باقات الشاحن + الكابل + الحافظة</p>
            </div>
            <Link to="/products" className="shrink-0">
              <Button variant="outline" size="sm" className="rounded-full">اكتشف</Button>
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
      <div
        style={{ background: DARK_BG }}
        className="text-white [&_h2]:!text-white [&_.text-muted-foreground]:!text-white/60 [&_.bg-card]:!bg-white/[0.04] [&_.border-border\/60]:!border-white/10"
      >
        <Wave fill={LIGHT_BG} flip />

      <section className="px-3 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">تسوّق حسب الفئة</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">كل ما تحتاجه لأجهزتك</h2>
            </div>
            <Link to="/categories" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              عرض الكل <ChevronRight className="w-4 h-4" />
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
                      تسوّق <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
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

      {/* ────── TRENDING ────── */}
      {trendingProducts.length > 0 && (
        <section className="px-3 sm:px-6 lg:px-8 pb-14">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-primary" /> الأكثر رواجاً
                </p>
                <h2 className="font-display font-bold text-3xl sm:text-4xl">الأكثر تفضيلاً هذا الأسبوع</h2>
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
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300 font-semibold mb-2">وصل حديثاً</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">جديد في المتجر</h2>
              <p className="text-sm text-white/60 mt-2 max-w-md">أحدث المنتجات التقنية المختارة بعناية لك.</p>
            </div>
            <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors">
              كل المنتجات <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <ProductGridSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {(allProducts?.slice(0, 8) || []).map((p, i) => (
                  <div
                    key={p.id}
                    style={{ animationDelay: `${i * 0.05}s` }}
                    className="animate-fade-in opacity-0 [animation-fill-mode:forwards]"
                  >

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
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white font-medium hover:from-sky-300 hover:to-blue-500 transition-all shadow-[0_10px_30px_-5px_rgba(56,189,248,0.5)]"
                  >
                    عرض كل المنتجات <ChevronRight className="w-4 h-4" />
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
          <div className="max-w-7xl mx-auto rounded-3xl border border-border/60 bg-gradient-to-br from-destructive/10 via-card to-primary/5 p-6 sm:p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-destructive/20 blur-3xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-destructive font-semibold mb-2 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5" /> عروض اليوم
                </p>
                <h2 className="font-display font-bold text-3xl sm:text-4xl">تخفيضات لفترة محدودة</h2>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">ينتهي خلال</span>
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
      <div
        style={{ background: DARK_BG }}
        className="text-white [&_h2]:!text-white [&_.text-muted-foreground]:!text-white/60 [&_.bg-card]:!bg-white/[0.04] [&_.border-border\/60]:!border-white/10"
      >
        <Wave fill={LIGHT_BG} flip />

      <section className="px-3 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">علامات موثوقة</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl">تسوّق أفضل العلامات العالمية</h2>
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
        <Wave fill={LIGHT_BG} />
      </div>

      {/* ────── TESTIMONIALS ────── */}
      <section className="px-3 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">آراء عملائنا</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">ماذا يقول الناس</h2>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
              <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <span className="ms-2">4.9 / 5 · +2,300 تقييم</span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { name: 'ياسين ب.', city: 'الجزائر', text: 'استلمت شاحن MacBook في اليوم التالي. منتج أصلي وعلبة مغلقة. سأشتري مجدداً.', rating: 5 },
              { name: 'لينا ك.',   city: 'وهران',  text: 'لوحة المفاتيح Keychron رائعة. أسعار ممتازة وتوصيل سريع إلى وهران.', rating: 5 },
              { name: 'عمر س.',   city: 'قسنطينة', text: 'الدفع سلس، دعم حقيقي عبر الهاتف، والتغليف كان مثالياً.', rating: 5 },
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
                موثوق منذ اليوم الأول
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                شريكك التقني{' '}
                <span className="bg-gradient-to-r from-sky-200 via-cyan-200 to-white bg-clip-text text-transparent">
                  الموثوق
                </span>{' '}
                في الجزائر
              </h2>

              <p className="mt-5 text-white/70 text-base sm:text-lg leading-relaxed max-w-lg">
                منتجات أصلية، أسعار منصفة ودعم ودود — توصيل إلى جميع الولايات الـ 58.
                آلاف الجزائريين يثقون بنا لشراء حواسيبهم وهواتفهم وملحقاتها.
              </p>

              <div className="mt-7 grid grid-cols-3 gap-4 max-w-md">
                <div>
                  <p className="font-display font-bold text-2xl sm:text-3xl text-white">+2.3k</p>
                  <p className="text-xs text-white/60 mt-1">عميل سعيد</p>
                </div>
                <div>
                  <p className="font-display font-bold text-2xl sm:text-3xl text-white">58</p>
                  <p className="text-xs text-white/60 mt-1">ولاية مغطّاة</p>
                </div>
                <div>
                  <p className="font-display font-bold text-2xl sm:text-3xl text-white">4.9★</p>
                  <p className="text-xs text-white/60 mt-1">متوسط التقييم</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/products">
                  <Button size="lg" className="rounded-full bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white border-0 shadow-[0_10px_30px_-5px_rgba(56,189,248,0.6)]">
                    تصفّح المتجر <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button size="lg" variant="outline" className="rounded-full bg-white/5 text-white border-white/20 hover:bg-white/15 hover:text-white">
                    من نحن
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
            { icon: Truck,      label: 'شحن سريع',        desc: 'إلى جميع الولايات الـ 58' },
            { icon: Shield,     label: 'إرجاع خلال 7 أيام', desc: 'بدون أسئلة' },
            { icon: BadgeCheck, label: 'منتجات أصلية',     desc: 'أصلية 100%' },
            { icon: Headphones, label: 'دعم حقيقي',        desc: 'تواصل مع فريقنا' },
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
