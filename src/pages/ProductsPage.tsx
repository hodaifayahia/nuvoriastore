import { useState, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, SlidersHorizontal, X, ShoppingBag, Zap, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import ProductCard from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/LoadingSkeleton';
import { useCategories } from '@/hooks/useCategories';
import { formatPrice } from '@/lib/format';
import { useCart } from '@/contexts/CartContext';
import AnimatedSection from '@/components/AnimatedSection';
import { useTranslation } from '@/i18n';

export default function ProductsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const [sort, setSort] = useState('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { items, subtotal } = useCart();
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const { data: categoriesData } = useCategories();
  const categoryNames = categoriesData?.map(c => c.name) || [];
  const sortOptions = [
    { value: 'newest', label: t('productsPage.sort.newest') },
    { value: 'cheapest', label: t('productsPage.sort.cheapest') },
    { value: 'expensive', label: t('productsPage.sort.expensive') },
  ];

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', sort],
    queryFn: async () => {
      let query = supabase.from('products').select('*').eq('is_active', true);
      if (sort === 'newest') query = query.order('created_at', { ascending: false });
      else if (sort === 'cheapest') query = query.order('price', { ascending: true });
      else if (sort === 'expensive') query = query.order('price', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Compute max price for slider
  const maxPrice = useMemo(() => {
    if (!products) return 100000;
    return Math.max(...products.map(p => Number(p.price)), 10000);
  }, [products]);

  // Client-side filtering
  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      if (search) {
        const normalize = (s: string) => s.toLowerCase().replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '');
        if (!normalize(p.name).includes(normalize(search))) return false;
      }
      if (selectedCategories.length > 0) {
        const pCats = p.category || [];
        if (!selectedCategories.some(sc => pCats.includes(sc))) return false;
      }
      const price = Number(p.price);
      if (price < priceRange[0] || price > priceRange[1]) return false;
      if (inStockOnly && (p.stock ?? 0) <= 0) return false;
      return true;
    });
  }, [products, search, selectedCategories, priceRange, inStockOnly]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const selectSingleCategory = (cat: string) => {
    if (selectedCategories.length === 1 && selectedCategories[0] === cat) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([cat]);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategories([]);
    setPriceRange([0, maxPrice]);
    setInStockOnly(false);
    setSort('newest');
    searchParams.delete('category');
    setSearchParams(searchParams);
  };

  const activeFilterCount = [
    selectedCategories.length > 0,
    priceRange[0] > 0 || priceRange[1] < maxPrice,
    inStockOnly,
    search.length > 0,
  ].filter(Boolean).length;

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200;
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <Label className="font-cairo font-semibold text-sm mb-2 block">{t('productsPage.filters.search')}</Label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('productsPage.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10 font-cairo"
          />
        </div>
      </div>

      {/* Categories */}
      {categoryNames.length > 0 && (
        <div>
          <Label className="font-cairo font-semibold text-sm mb-3 block">{t('productsPage.filters.categories')}</Label>
          <div className="space-y-2.5">
            {categoryNames.map(cat => (
              <label key={cat} className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={selectedCategories.includes(cat)}
                  onCheckedChange={() => toggleCategory(cat)}
                />
                <span className="font-cairo text-sm">{cat}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div>
        <Label className="font-cairo font-semibold text-sm mb-3 block">{t('productsPage.filters.priceRange')}</Label>
        <Slider
          min={0}
          max={maxPrice}
          step={100}
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          className="mb-3"
        />
        <div className="flex items-center justify-between text-xs font-roboto text-muted-foreground">
          <span>{formatPrice(priceRange[0])}</span>
          <span>{formatPrice(priceRange[1])}</span>
        </div>
      </div>

      {/* In Stock */}
      <div className="flex items-center justify-between">
        <Label className="font-cairo font-semibold text-sm">{t('productsPage.filters.inStockOnly')}</Label>
        <Switch checked={inStockOnly} onCheckedChange={setInStockOnly} />
      </div>

      {/* Sort */}
      <div>
        <Label className="font-cairo font-semibold text-sm mb-2 block">{t('productsPage.filters.sort')}</Label>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="font-cairo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(o => (
              <SelectItem key={o.value} value={o.value} className="font-cairo">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear */}
      {activeFilterCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full font-cairo gap-2 rounded-xl">
          <X className="w-4 h-4" />
          {t('productsPage.clearAll')}
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* ─── Hero Header ─── */}
      <section className="relative bg-primary border-b border-primary/20">
        <div className="container relative z-10 py-12 md:py-16">
          <AnimatedSection>
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary bg-primary-foreground rounded-full px-5 py-2">
                <Sparkles className="w-4 h-4" />
                {t('productsPage.hero.badge')}
              </div>
              <h1 className="font-cairo font-black text-4xl md:text-5xl lg:text-6xl text-primary-foreground leading-tight">
                {t('productsPage.hero.title')}
              </h1>
              <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto">
                {t('productsPage.hero.subtitle')}
              </p>

              {/* Search Bar in Hero */}
              <div className="max-w-xl mx-auto pt-4">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('productsPage.searchPlaceholder')}
                    className="w-full pr-12 pl-4 py-4 rounded-2xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-all duration-300 text-right"
                  />
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>


      {/* ─── Category Tabs ─── */}
      {categoryNames.length > 0 && (
        <section className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50">
          <div className="container py-4">
            <div className="relative">
              {/* Scroll buttons */}
              <button
                onClick={() => scrollCategories('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card shadow-lg border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollCategories('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card shadow-lg border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Category pills */}
              <div
                ref={categoryScrollRef}
                className="flex items-center gap-3 overflow-x-auto scrollbar-hide px-12 py-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <button
                  onClick={() => setSelectedCategories([])}
                  className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    selectedCategories.length === 0
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                  }`}
                >
                  {t('productsPage.allCategories')}
                </button>
                {categoryNames.map(cat => (
                  <button
                    key={cat}
                    onClick={() => selectSingleCategory(cat)}
                    className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                      selectedCategories.includes(cat)
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Main Content ─── */}
      <div className="container py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 bg-card/80 backdrop-blur-sm rounded-2xl px-5 py-4 border border-border/50">
          <div className="flex items-center gap-4">
            <p className="font-cairo text-sm text-muted-foreground">
              <span className="font-bold text-foreground text-lg">{filtered.length}</span> {t('productsPage.productCountLabel')}
            </p>

            {/* Mobile filter trigger */}
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden font-cairo gap-2 rounded-xl border-violet-500/20 hover:border-violet-500/40">
                  <SlidersHorizontal className="w-4 h-4" />
                  {t('productsPage.filter')}
                  {activeFilterCount > 0 && (
                    <Badge className="font-roboto text-[10px] h-5 w-5 p-0 flex items-center justify-center bg-violet-600">{activeFilterCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="font-cairo">{t('productsPage.filters.title')}</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-cairo text-xs text-muted-foreground hidden sm:inline">{t('productsPage.sortLabel')}:</span>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="font-cairo w-32 h-9 text-sm rounded-xl border-border/50 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(o => (
                  <SelectItem key={o.value} value={o.value} className="font-cairo">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filters badges */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategories.map(cat => (
              <Badge key={cat} variant="secondary" className="font-cairo gap-1.5 cursor-pointer hover:bg-destructive/10 rounded-full px-4 py-1.5 transition-colors bg-violet-500/10 text-violet-400 border border-violet-500/20" onClick={() => toggleCategory(cat)}>
                {cat}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            {inStockOnly && (
              <Badge variant="secondary" className="font-cairo gap-1.5 cursor-pointer hover:bg-destructive/10 rounded-full px-4 py-1.5 transition-colors" onClick={() => setInStockOnly(false)}>
                {t('productsPage.filters.inStockOnly')}
                <X className="w-3 h-3" />
              </Badge>
            )}
            {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
              <Badge variant="secondary" className="font-cairo gap-1.5 cursor-pointer hover:bg-destructive/10 rounded-full px-4 py-1.5 transition-colors" onClick={() => setPriceRange([0, maxPrice])}>
                {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                <X className="w-3 h-3" />
              </Badge>
            )}
            {search && (
              <Badge variant="secondary" className="font-cairo gap-1.5 cursor-pointer hover:bg-destructive/10 rounded-full px-4 py-1.5 transition-colors" onClick={() => setSearch('')}>
                "{search}"
                <X className="w-3 h-3" />
              </Badge>
            )}
            <button onClick={clearFilters} className="text-sm text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              {t('productsPage.clearAll')}
            </button>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24 bg-card/90 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
              <h2 className="font-cairo font-bold text-lg mb-6 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 flex items-center justify-center border border-violet-500/20">
                  <SlidersHorizontal className="w-4 h-4 text-violet-400" />
                </div>
                {t('productsPage.filters.title')}
              </h2>
              <FilterContent />
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <ProductGridSkeleton />
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {filtered.map((p, i) => (
                  <div key={p.id} style={{ animationDelay: `${i * 0.04}s` }} className="animate-fade-in opacity-0 [animation-fill-mode:forwards]">
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
            ) : (
              <div className="text-center py-24 bg-card rounded-3xl border border-dashed border-border/50">
                <ShoppingBag className="w-16 h-16 text-muted-foreground/20 mx-auto mb-5" />
                <p className="font-cairo text-foreground text-xl font-bold mb-2">{t('productsPage.empty.title')}</p>
                <p className="font-cairo text-muted-foreground text-sm">{t('productsPage.empty.description')}</p>
                <Button variant="outline" onClick={clearFilters} className="font-cairo mt-6 rounded-xl gap-2 border-violet-500/20 hover:border-violet-500/40">
                  <X className="w-4 h-4" />
                  {t('productsPage.clearFilters')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Floating Cart Bar ─── */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
          <div className="container flex items-center gap-3 py-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/25">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-cairo font-bold text-sm">{items.length} {t('productsPage.cart.itemsInCart')}</p>
                <p className="font-roboto font-bold text-violet-400 text-sm">{formatPrice(subtotal)}</p>
              </div>
            </div>
            <Link to="/cart">
              <Button variant="outline" className="font-cairo text-sm rounded-xl h-11 shrink-0 border-violet-500/20 hover:border-violet-500/40">
                {t('productsPage.cart.viewCart')}
              </Button>
            </Link>
            <Link to="/checkout">
              <Button className="font-cairo font-semibold text-sm gap-2 rounded-xl h-11 shrink-0 shadow-lg shadow-violet-500/25 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500">
                <Zap className="w-4 h-4" />
                {t('productsPage.cart.checkout')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
