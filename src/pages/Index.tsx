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
  ArrowRight, Search, Sparkles, Shield, Truck, BadgeCheck, Zap,
  ChevronRight, Star, Flame, Clock, Quote,
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

const ICON_MAP: Record<string, LucideIcon> = {
  Smartphone, Laptop, Headphones, Mouse, Keyboard, Cable, Watch, Camera,
  BatteryCharging, Cpu, Gamepad2, HardDrive, Monitor, Speaker,
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

  if (storeTemplate === 'minimal') return <MinimalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} />;
  if (storeTemplate === 'bold')    return <BoldTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'liquid')  return <LiquidTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'digital') return <DigitalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;

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


      {/* ─────────── HERO ─────────── */}
      {showSection('hero') && (
        <section className="relative px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-12 sm:pb-20">
          <div className="relative max-w-6xl mx-auto text-center">
            <div className="pointer-events-none absolute inset-x-0 -top-10 mx-auto h-72 w-[80%] rounded-full blur-[120px] opacity-60"
              style={{ background: 'radial-gradient(50% 50% at 50% 50%, hsl(180 88% 55% / 0.4), transparent 60%), radial-gradient(50% 50% at 70% 50%, hsl(270 85% 65% / 0.35), transparent 60%)' }}
            />

            <span className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold text-foreground/80 glass-panel neon-border">
              <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--grad-teal))]" />
              {txt('hero_badge', 'مجموعة جديدة 2026')}
            </span>

            <h1 className="relative mt-6 font-display font-extrabold uppercase leading-[0.95] tracking-tight text-[2.5rem] sm:text-6xl lg:text-7xl xl:text-8xl">
              {txt('hero_title1', 'منظومتك التقنية،')} <br />
              <span className="text-gradient-neon">{txt('hero_title2', 'بأسلوبك.')}</span>
            </h1>

            <p className="relative mt-6 text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {txt('hero_subtitle', 'حواسيب محمولة وهواتف ذكية وإكسسوارات مختارة — مصممة للأداء وللحياة اليومية.')}
            </p>

            <form onSubmit={handleSearch} className="relative mt-8 mx-auto flex items-center gap-2 max-w-xl p-1.5 rounded-2xl glass-panel neon-border">
              <Search className="w-4 h-4 text-muted-foreground ms-3 shrink-0" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={txt('hero_searchPh', 'ابحث عن حواسيب، هواتف، إكسسوارات...')}
                className="flex-1 border-0 bg-transparent h-11 sm:h-12 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0"
              />
              <Button type="submit" size="sm" className="btn-neon h-11 sm:h-12 min-h-[48px] px-5 rounded-xl border-0">
                {txt('hero_searchBtn', 'بحث')}
              </Button>
            </form>

            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/products">
                <Button size="lg" className="btn-neon rounded-full gap-2 min-h-[48px] border-0">
                  {txt('hero_shopNow', 'تسوق الآن')} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/products?category=Laptops">
                <Button size="lg" variant="outline" className="rounded-full min-h-[48px] glass-panel border-white/15 text-foreground hover:bg-white/10">
                  {txt('hero_browseLaptops', 'تصفح الحواسيب')}
                </Button>
              </Link>
            </div>

            <div className="relative mt-10 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-[hsl(var(--grad-teal))]" /> {txt('hero_original', 'منتجات أصلية')}</span>
              <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4 text-[hsl(var(--grad-violet))]" /> {txt('hero_wilayas', 'توصيل لـ 58 ولاية')}</span>
              <span className="inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-[hsl(var(--grad-teal))]" /> {txt('hero_returns', 'إرجاع خلال 7 أيام')}</span>
            </div>

          </div>

          {/* Stat strip */}
          <div className="relative max-w-6xl mx-auto mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: Zap, label: txt('bento_fastHrs', '24 س'),  desc: txt('bento_fastDesc', 'توصيل سريع') },
              { icon: Cpu, label: String(allProducts?.length ?? '+500'), desc: txt('bento_accessoriesAvail', 'منتج متوفر') },
              { icon: Shield, label: '7 أيام', desc: txt('hero_returns', 'إرجاع خلال 7 أيام') },
              { icon: BadgeCheck, label: '4.9★', desc: 'تقييم موثّق' },

            ].map((s, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
                <div className="w-11 h-11 rounded-xl bg-[hsl(var(--grad-teal)/0.15)] flex items-center justify-center shrink-0 border border-white/10">
                  <s.icon className="w-5 h-5 text-[hsl(var(--grad-teal))]" />
                </div>
                <div>
                  <p className="font-display font-extrabold text-2xl tracking-tight">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────── HERO SLIDES (optional) ─────────── */}
      {heroSlides && heroSlides.length > 0 && (
        <section className="relative px-4 sm:px-6 lg:px-8 pb-12" ref={emblaRef}>
          <div className="max-w-6xl mx-auto overflow-hidden rounded-3xl glass-card neon-border">
            <div className="flex">
              {heroSlides.map((slide, i) => (
                <div key={i} className="flex-[0_0_100%] min-w-0">
                  {slide.link ? (
                    <Link to={slide.link}>
                      <img src={slide.url} alt={slide.alt || `Slide ${i + 1}`} className="w-full h-[260px] sm:h-[360px] lg:h-[440px] object-cover" />
                    </Link>
                  ) : (
                    <img src={slide.url} alt={slide.alt || `Slide ${i + 1}`} className="w-full h-[260px] sm:h-[360px] lg:h-[440px] object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────── CATEGORY SHOWCASE (3 columns) ─────────── */}
      {showSection('categories') && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--grad-teal))] font-semibold mb-3">
                {txt('cat_kicker', 'تسوق حسب الفئة')}
              </p>
              <h2 className="font-display font-extrabold uppercase text-3xl sm:text-5xl tracking-tight">
                {txt('cat_title', 'مصمم لكل إعداد')}
              </h2>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {SHOWCASE.map((c) => {
                const Icon = c.icon;
                return (
                  <Link
                    key={c.key}
                    to={c.href}
                    className={`group relative glass-card neon-border rounded-3xl p-7 sm:p-8 flex flex-col items-center text-center gap-5 hover:-translate-y-2 transition-all duration-300 ${c.aura}`}
                  >
                    <div
                      className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center border border-white/10"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${c.accent}33, transparent 70%), linear-gradient(135deg, hsl(var(--card) / 0.8), hsl(var(--card) / 0.4))`,
                        boxShadow: `0 0 40px -8px ${c.accent}55`,
                      }}
                    >
                      <Icon className="w-14 h-14 sm:w-16 sm:h-16" style={{ color: c.accent }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-display font-extrabold uppercase text-xl sm:text-2xl tracking-tight">{c.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-[28ch] mx-auto">{c.desc}</p>
                    </div>
                    <span className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full text-sm font-semibold border border-white/15 bg-white/[0.03] group-hover:bg-white/10 transition-colors">
                      {c.cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* secondary category chips */}
            <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
              {extraCats.map((c) => {
                const Icon = c.icon as LucideIcon;
                return (
                  <Link
                    key={c.name}
                    to={`/products?category=${encodeURIComponent(c.name)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-full glass-panel border border-white/10 text-sm hover:border-[hsl(var(--grad-teal))]/50 hover:text-[hsl(var(--grad-teal))] transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {c.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

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

      {/* ─────────── TESTIMONIALS ─────────── */}
      {showSection('testimonials') && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--grad-violet))] font-semibold mb-2">{txt('tst_kicker', 'آراء')}</p>
                <h2 className="font-display font-extrabold uppercase text-3xl sm:text-4xl tracking-tight">{txt('tst_title', 'موثوق من قِبل المهتمين')}</h2>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <span className="ms-2">{txt('tst_ratingSuffix', '4.9 / 5')}</span>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
              {[
                { name: t('idx.testimonials.t1.name'), city: t('idx.testimonials.t1.city'), text: t('idx.testimonials.t1.text'), rating: 5 },
                { name: t('idx.testimonials.t2.name'), city: t('idx.testimonials.t2.city'), text: t('idx.testimonials.t2.text'), rating: 5 },
                { name: t('idx.testimonials.t3.name'), city: t('idx.testimonials.t3.city'), text: t('idx.testimonials.t3.text'), rating: 5 },
              ].map(ts => (
                <div key={ts.name} className="glass-card neon-border rounded-2xl p-6 relative">
                  <Quote className="absolute top-4 right-4 w-8 h-8 text-[hsl(var(--grad-teal)/0.25)]" />
                  <div className="flex mb-3">
                    {[...Array(ts.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed mb-4">"{ts.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full btn-neon flex items-center justify-center font-display font-bold text-sm">
                      {ts.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-display font-semibold text-sm">{ts.name}</p>
                      <p className="text-xs text-muted-foreground">{ts.city}</p>
                    </div>
                  </div>
                </div>
              ))}
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
