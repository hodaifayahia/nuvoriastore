import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Smartphone, Laptop, Headphones, Mouse, Keyboard, Cable, Watch, Camera,
  BatteryCharging, Cpu, Gamepad2, HardDrive, Monitor, Speaker,
  ArrowLeft, Search, Sparkles, Shield, Truck, BadgeCheck, Zap,
  ChevronLeft, Star, Tag, Headset, Lock, Clock,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/LoadingSkeleton';
import { useCategories } from '@/hooks/useCategories';
import MinimalTemplate from '@/components/templates/MinimalTemplate';
import BoldTemplate from '@/components/templates/BoldTemplate';
import LiquidTemplate from '@/components/templates/LiquidTemplate';
import DigitalTemplate from '@/components/templates/DigitalTemplate';
import heroTech from '@/assets/hero-tech-amber.jpg';
import heroLaptop from '@/assets/hero-laptop-amber.jpg';

const ICON_MAP: Record<string, LucideIcon> = {
  Smartphone, Laptop, Headphones, Mouse, Keyboard, Cable, Watch, Camera,
  BatteryCharging, Cpu, Gamepad2, HardDrive, Monitor, Speaker,
};

const DEFAULT_CATEGORIES = [
  { name: 'اللابتوب',     icon: Laptop },
  { name: 'هواتف ذكية',   icon: Smartphone },
  { name: 'سماعاتك',      icon: Headphones },
];

/* ───────── Countdown hook ───────── */
function useCountdown(seconds: number) {
  const [t, setT] = useState(seconds);
  useEffect(() => {
    const id = setInterval(() => setT(v => (v > 0 ? v - 1 : seconds)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  const h = String(Math.floor(t / 3600)).padStart(2, '0');
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const s = String(t % 60).padStart(2, '0');
  return { h, m, s };
}

function CountdownPills({ seconds }: { seconds: number }) {
  const { h, m, s } = useCountdown(seconds);
  return (
    <div className="flex items-center gap-1.5 text-foreground font-mono">
      {[s, m, h].map((v, i) => (
        <div key={i} className="px-2 py-1 rounded-md bg-background/60 border border-primary/30 text-xs font-bold tabular-nums min-w-[28px] text-center">
          {v}
        </div>
      ))}
    </div>
  );
}

export default function IndexPage() {
  const { data: categoriesData } = useCategories();
  const navigate = useNavigate();
  const [visibleProductsCount, setVisibleProductsCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { data: allProducts, isLoading } = useQuery({
    queryKey: ['all-active-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products').select('*').eq('is_active', true)
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
  const featured = useMemo(
    () => [...(allProducts || [])].slice(0, 4),
    [allProducts],
  );
  const flashProducts = useMemo(() => (allProducts || []).slice(0, 2), [allProducts]);
  const hasMore = (allProducts?.length || 0) > newestProducts.length;

  const [emblaRef] = useEmblaCarousel({ direction: 'rtl', loop: true }, [Autoplay({ delay: 5500 })]);

  useEffect(() => { setVisibleProductsCount(12); }, [allProducts?.length]);

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

  const categoryCards = useMemo(() => {
    const fromDb = (categoriesData || []).filter((c: any) => c?.name).slice(0, 6).map((c: any, i: number) => ({
      name: c.name as string,
      icon: (c.icon && ICON_MAP[c.icon]) || DEFAULT_CATEGORIES[i % DEFAULT_CATEGORIES.length].icon,
    }));
    return fromDb.length > 0 ? fromDb : DEFAULT_CATEGORIES;
  }, [categoriesData]);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground overflow-x-hidden font-[Cairo]">

      {/* ════════ HERO ════════ */}
      <section className="relative px-3 sm:px-6 lg:px-8 pt-6 pb-12">
        <div className="max-w-7xl mx-auto relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-background to-card">
          {/* glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 right-1/3 w-[520px] h-[520px] rounded-full bg-primary/25 blur-[140px]" />
            <div className="absolute bottom-0 left-0 w-[360px] h-[360px] rounded-full bg-accent/15 blur-[120px]" />
          </div>

          <div className="relative grid lg:grid-cols-2 items-center gap-6 p-6 sm:p-10 lg:p-14 min-h-[460px]">
            {/* Image */}
            <div className="order-2 lg:order-1 relative">
              <img
                src={heroLaptop}
                alt="Laptop premium"
                width={1024} height={768}
                className="w-full h-auto object-contain drop-shadow-[0_30px_80px_hsl(38_75%_50%/0.35)]"
              />
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2 text-center lg:text-right">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                مجموعة بريميوم حصرية
              </span>
              <h1 className="font-bold leading-[1.1] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
                اكتشف{' '}
                <span className="bg-gradient-to-l from-primary via-accent to-primary bg-clip-text text-transparent">
                  الفخامة
                </span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-md mx-auto lg:mx-0 lg:ms-auto">
                منتجات سيفار بريميوم — لابتوبات، هواتف، سماعات وكل ما تحتاجه لإعدادك المثالي.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3 justify-center lg:justify-start">
                <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold shadow-[0_10px_30px_-10px_hsl(38_75%_50%/0.6)] hover:shadow-[0_15px_40px_-10px_hsl(38_75%_50%/0.8)]">
                  <Link to="/products"><Tag className="w-4 h-4 ms-2" />عروض خاصة</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-primary/40 text-foreground hover:bg-primary/10">
                  <Link to="/products">تسوق الآن<ChevronLeft className="w-4 h-4 me-2" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ CATEGORIES ════════ */}
      <section className="px-3 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-bold text-2xl sm:text-3xl mb-8">اختر عالمك</h2>
          <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto">
            {categoryCards.slice(0, 3).map((cat, i) => {
              const Icon = (cat as any).icon as LucideIcon;
              return (
                <Link
                  key={cat.name + i}
                  to={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="group flex flex-col items-center gap-3 p-5 sm:p-7 rounded-3xl border border-primary/20 bg-gradient-to-b from-card to-background hover:border-primary/60 hover:-translate-y-1 transition-all hover:shadow-[0_20px_50px_-20px_hsl(38_75%_50%/0.45)]"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                  </div>
                  <p className="font-semibold text-sm sm:text-base">{cat.name}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════ NEWEST PRODUCTS ════════ */}
      <section className="px-3 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-bold text-2xl sm:text-3xl mb-8">أحدث المنتجات</h2>
          {isLoading ? (
            <ProductGridSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {newestProducts.map((p, i) => (
                  <div key={p.id} style={{ animationDelay: `${i * 0.04}s` }} className="animate-fade-in opacity-0 [animation-fill-mode:forwards]">
                    <ProductCard
                      id={p.id} name={p.name}
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
              {hasMore && (
                <>
                  <div ref={loadMoreRef} className="h-12" />
                  <div className="text-center mt-6">
                    <Link to="/products">
                      <Button variant="outline" className="rounded-full border-primary/40 text-primary hover:bg-primary/10">
                        تصفح الكل
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* ════════ FEATURED CAROUSEL ════════ */}
      {featured.length > 0 && (
        <section className="px-3 sm:px-6 lg:px-8 pb-14">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-center font-bold text-2xl sm:text-3xl mb-8">وصل حديثاً</h2>

            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-background to-card mb-8">
              <div className="absolute -top-20 left-1/3 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                  {featured.map(p => (
                    <div key={p.id} className="flex-[0_0_100%] min-w-0 grid md:grid-cols-2 items-center gap-8 p-6 sm:p-10 lg:p-14 min-h-[340px]">
                      <div className="text-center md:text-right">
                        <span className="inline-block text-xs font-semibold text-primary mb-3 tracking-wider">جديد</span>
                        <h3 className="font-bold text-3xl sm:text-4xl leading-tight mb-3">{p.name}</h3>
                        <p className="text-muted-foreground mb-5 line-clamp-2">{p.description || 'وصل حديثاً إلى المتجر — جودة عالية وسعر مميز.'}</p>
                        <Link to={`/product/${p.id}`}>
                          <Button className="rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold">
                            تسوق الآن
                          </Button>
                        </Link>
                      </div>
                      <div className="flex items-center justify-center">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="max-h-64 object-contain drop-shadow-[0_20px_40px_hsl(38_75%_50%/0.4)]" loading="lazy" />
                        ) : (
                          <Laptop className="w-32 h-32 text-primary/40" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mini featured grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {featured.map(p => (
                <ProductCard
                  key={p.id}
                  id={p.id} name={p.name}
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

      {/* ════════ FLASH SALE ════════ */}
      {flashProducts.length > 0 && (
        <section className="px-3 sm:px-6 lg:px-8 pb-14">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-center font-bold text-2xl sm:text-3xl mb-8">عروض خاصة</h2>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              {flashProducts.map((p, i) => (
                <div key={p.id} className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card to-background p-5 sm:p-6 flex items-center gap-4 sm:gap-6 shadow-[0_10px_40px_-15px_hsl(38_75%_50%/0.3)]">
                  <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-2xl bg-background/40 border border-primary/20 flex items-center justify-center overflow-hidden">
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain p-2" loading="lazy" />
                      : <Smartphone className="w-12 h-12 text-primary/60" />}
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <span className="font-bold text-xl sm:text-2xl text-primary">Flash Sale</span>
                      <span className="text-xs text-muted-foreground">عرض {i === 0 ? 'الكبار' : 'الأسبوع'}</span>
                    </div>
                    <p className="font-semibold text-sm sm:text-base truncate mb-1">{p.name}</p>
                    <p className="text-primary font-bold text-lg mb-3">{Number(p.price).toLocaleString()} <span className="text-xs text-muted-foreground">د.ج</span></p>
                    <div className="flex items-center justify-between gap-2">
                      <CountdownPills seconds={3600 * (i + 2) + 1234} />
                      <Link to={`/product/${p.id}`}>
                        <Button size="sm" className="rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-xs h-8">اشتري الآن</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════ WHY US ════════ */}
      <section className="px-3 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-bold text-2xl sm:text-3xl mb-8">لماذا تختار سيفار</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              { icon: Truck,      title: 'شحن مجاني',          desc: 'لجميع الطلبات فوق مبلغ معين عبر كافة الولايات' },
              { icon: BadgeCheck, title: 'ضمان لمدة 12 شهر',   desc: 'ضمان شامل على جميع المنتجات الإلكترونية' },
              { icon: Headset,    title: 'دعم فني 24/7',       desc: 'فريق دعم محترف جاهز للإجابة على استفساراتك' },
              { icon: Lock,       title: 'دفع آمن',            desc: 'طرق دفع متعددة وآمنة عند الاستلام وأكثر' },
            ].map(f => (
              <div key={f.title} className="rounded-3xl border border-primary/15 bg-card p-5 sm:p-6 text-center hover:border-primary/40 transition-colors">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-bold text-sm sm:text-base mb-1.5">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ ECOSYSTEM (image) ════════ */}
      <section className="px-3 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-7xl mx-auto relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-background to-card p-8 sm:p-12 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/15 blur-[140px]" />
          </div>
          <div className="relative">
            <p className="text-primary text-xs uppercase tracking-[0.3em] font-semibold mb-3">Ecosystem</p>
            <h2 className="font-bold text-2xl sm:text-3xl mb-6">منظومة التكنولوجيا</h2>
            <img src={heroTech} alt="Tech ecosystem" width={1280} height={896} loading="lazy"
              className="mx-auto max-h-[420px] w-auto object-contain rounded-2xl" />
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-xs sm:text-sm">
              {[
                { i: Zap, t: 'Seamless Sync' },
                { i: Cpu, t: 'Unified Experience' },
                { i: Watch, t: 'Smartwatch' },
                { i: HardDrive, t: 'Tech Connection' },
              ].map(({ i: I, t }) => (
                <div key={t} className="flex items-center justify-center gap-2 text-muted-foreground">
                  <I className="w-4 h-4 text-primary" /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ TESTIMONIALS ════════ */}
      <section className="px-3 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-bold text-2xl sm:text-3xl mb-8">آراء العملاء</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              { n: 'محمد ع.',  c: 'منتجات أصلية وتوصيل سريع جداً. تجربة ممتازة!' },
              { n: 'أمينة ر.', c: 'الخدمة احترافية والأسعار في المتناول. أنصح بهم.' },
              { n: 'يوسف ب.',  c: 'جودة عالية وضمان حقيقي. سأعود للتسوق قريباً.' },
              { n: 'سارة ك.',  c: 'فريق الدعم رد بسرعة وساعدني في اختيار اللابتوب.' },
            ].map(r => (
              <div key={r.n} className="rounded-3xl border border-primary/15 bg-card p-5 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="w-3.5 h-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{r.c}</p>
                <p className="font-semibold text-sm">{r.n}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
