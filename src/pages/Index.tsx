import { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Laptop, Smartphone, Sparkles, ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/LoadingSkeleton';
import { useCategories } from '@/hooks/useCategories';
import MinimalTemplate from '@/components/templates/MinimalTemplate';
import BoldTemplate from '@/components/templates/BoldTemplate';
import LiquidTemplate from '@/components/templates/LiquidTemplate';
import DigitalTemplate from '@/components/templates/DigitalTemplate';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

function ProductRail({ title, products }: { title: string; products: any[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: 'smooth' });

  return (
    <section className="px-4 sm:px-6 lg:px-12 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">{title}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => scrollBy(-320)} aria-label="prev"
              className="w-8 h-8 rounded-full border border-border/60 bg-card/60 hover:bg-card text-foreground/80 grid place-items-center">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scrollBy(320)} aria-label="next"
              className="w-8 h-8 rounded-full border border-border/60 bg-card/60 hover:bg-card text-foreground/80 grid place-items-center">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div ref={scroller}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-2 px-2">
          {products.map((p) => (
            <div key={p.id} className="snap-start shrink-0 w-[46%] sm:w-[30%] lg:w-[22%]">
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
  );
}

export default function IndexPage() {
  const { data: categoriesData } = useCategories();
  const navigate = useNavigate();
  const [searchQuery] = useState('');

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

  const newArrivals = useMemo(() => (allProducts || []).slice(0, 8), [allProducts]);
  const bestSellers = useMemo(
    () => [...(allProducts || [])].sort((a, b) => Number(b.price) - Number(a.price)).slice(0, 8),
    [allProducts]
  );
  const heroProduct = newArrivals[0];
  const bannerProduct = newArrivals[1] || heroProduct;
  const innovationProduct = bestSellers[0] || heroProduct;

  if (storeTemplate === 'minimal') return <MinimalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} />;
  if (storeTemplate === 'bold') return <BoldTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'liquid') return <LiquidTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;
  if (storeTemplate === 'digital') return <DigitalTemplate products={allProducts} isLoading={isLoading} categories={categoriesData} heroSlides={heroSlides} />;

  const features = [
    { icon: Laptop, title: 'Premium Laptops', desc: 'Minimal laptops with elegant performance for serious work.' },
    { icon: Smartphone, title: 'Flagship Phones', desc: 'Latest flagship phones with industry leading cameras.' },
    { icon: Sparkles, title: 'Essential Accessories', desc: 'Curated tech accessories to complete your setup.' },
  ];

  const faqs = [
    { q: 'What is Sifar Certified?', a: 'Every Sifar Certified device is tested by our engineers for performance, battery health, and cosmetics before shipping.' },
    { q: 'Warranty and Support?', a: 'All products include a 12-month limited warranty and lifetime customer support from our team.' },
    { q: 'What is Free support?', a: 'Free chat and phone support is available 7 days a week to help with setup, returns and questions.' },
    { q: 'What is Premium Certified?', a: 'Premium Certified products go through an extended 50-point inspection and ship in protective packaging.' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative px-4 sm:px-6 lg:px-12 pt-10 pb-14">
        <div className="pointer-events-none absolute -top-32 left-1/3 w-[520px] h-[520px] rounded-full bg-primary/15 blur-[140px]" />
        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.02] text-primary">
              Next-Gen<br />Tech
            </h1>
            <p className="mt-5 text-base text-muted-foreground max-w-md">
              Premium Devices for the Modern User.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <Button
                onClick={() => navigate('/products')}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 h-10 font-semibold"
              >
                Shop Now
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/categories')}
                className="border-primary/60 text-primary hover:bg-primary/10 hover:text-primary rounded-md px-6 h-10 font-semibold bg-transparent"
              >
                Discover
              </Button>
            </div>
          </div>
          <div className="relative h-[280px] sm:h-[360px] flex items-center justify-center">
            <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent blur-2xl" />
            {heroProduct?.images?.[0] ? (
              <img
                src={heroProduct.images[0]}
                alt={heroProduct.name}
                className="relative max-h-full max-w-full object-contain drop-shadow-[0_25px_45px_rgba(212,176,114,0.25)]"
              />
            ) : (
              <div className="relative flex items-center gap-4">
                <Smartphone className="w-32 h-44 text-primary/70" />
                <Laptop className="w-56 h-44 text-primary/70" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section className="px-4 sm:px-6 lg:px-12 pb-14">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title}
              className="rounded-xl bg-card/70 border border-border/50 p-6 text-center hover:border-primary/40 transition-colors">
              <div className="mx-auto mb-4 w-14 h-14 rounded-lg grid place-items-center text-primary">
                <f.icon className="w-9 h-9" strokeWidth={1.5} />
              </div>
              <h3 className="font-display font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px] mx-auto">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── NEW ARRIVALS ── */}
      {isLoading ? (
        <div className="px-4 sm:px-6 lg:px-12 pb-10 max-w-6xl mx-auto"><ProductGridSkeleton /></div>
      ) : (
        newArrivals.length > 0 && <ProductRail title="New Arrivals" products={newArrivals} />
      )}

      {/* ── PROMO BANNER ── */}
      <section className="px-4 sm:px-6 lg:px-12 pb-14">
        <div className="max-w-6xl mx-auto rounded-2xl bg-card/70 border border-border/50 overflow-hidden grid sm:grid-cols-2 items-center">
          <div className="h-56 sm:h-64 bg-gradient-to-br from-secondary/60 to-background flex items-center justify-center p-6">
            {bannerProduct?.images?.[0] ? (
              <img src={bannerProduct.images[0]} alt={bannerProduct.name}
                className="max-h-full object-contain drop-shadow-[0_15px_30px_rgba(212,176,114,0.2)]" />
            ) : <Smartphone className="w-32 h-44 text-primary/60" />}
          </div>
          <div className="p-7 sm:p-9">
            <h3 className="font-display font-semibold text-xl sm:text-2xl leading-snug">
              The Latest Smartphone<br />
              <span className="text-foreground/90">Giftset Camera</span>
            </h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md">
              High zoom, computational night photography and pro-grade video. The smartphone that brings the studio to your pocket.
            </p>
            <Button
              onClick={() => bannerProduct && navigate(`/product/${bannerProduct.id}`)}
              className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md h-9 px-5 text-sm font-semibold"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* ── BEST SELLERS ── */}
      {bestSellers.length > 0 && <ProductRail title="Best Sellers" products={bestSellers} />}

      {/* ── FLAGSHIP INNOVATIONS ── */}
      <section className="px-4 sm:px-6 lg:px-12 pb-14">
        <div className="max-w-6xl mx-auto rounded-2xl bg-card/70 border border-border/50 p-6 sm:p-8 grid sm:grid-cols-2 items-center gap-6">
          <div>
            <h3 className="font-display font-semibold text-xl sm:text-2xl mb-3">Flagship Innovations</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Silent-but-deep displays calibrated end-to-end. A flagship laptop for innovators at home and away.
            </p>
            <Button
              onClick={() => navigate('/products')}
              className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md h-9 px-5 text-sm font-semibold"
            >
              Learn More
            </Button>
          </div>
          <div className="h-44 sm:h-52 flex items-center justify-center">
            {innovationProduct?.images?.[0] ? (
              <img src={innovationProduct.images[0]} alt={innovationProduct.name}
                className="max-h-full object-contain drop-shadow-[0_18px_30px_rgba(212,176,114,0.25)]" />
            ) : <Laptop className="w-48 h-40 text-primary/60" />}
          </div>
        </div>
      </section>

      {/* ── TECHNICAL FAQ ── */}
      <section className="px-4 sm:px-6 lg:px-12 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display font-semibold text-xl sm:text-2xl mb-5">Technical FAQ</h2>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`f-${i}`}
                className="rounded-md border border-primary/40 bg-card/40 px-4 [&>h3]:m-0"
              >
                <AccordionTrigger className="text-primary text-sm font-semibold hover:no-underline py-3 [&[data-state=open]>svg]:rotate-180">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
