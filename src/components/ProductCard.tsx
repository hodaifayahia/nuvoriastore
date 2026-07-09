import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Zap, ChevronLeft, ChevronRight, Truck, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/format';
import ProductImage from '@/components/ProductImage';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { useTranslation } from '@/i18n';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  priceText?: string | null;
  image: string;
  images?: string[];
  mainImageIndex?: number;
  category: string | string[];
  stock: number;
  shippingPrice?: number;
}

export default function ProductCard({ id, name, price, oldPrice, priceText, image, images, mainImageIndex, category, stock, shippingPrice }: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const outOfStock = stock <= 0;

  const { data: variationTypes } = useQuery({
    queryKey: ['product-variation-types', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variations')
        .select('variation_type, variation_value')
        .eq('product_id', id)
        .eq('is_active', true);
      if (!data || data.length === 0) return null;
      const grouped: Record<string, number> = {};
      data.forEach(v => { grouped[v.variation_type] = (grouped[v.variation_type] || 0) + 1; });
      return grouped;
    },
  });

  const { data: reviewStats } = useQuery({
    queryKey: ['product-review-stats', id],
    queryFn: async () => {
      const { data } = await supabase.from('reviews').select('rating').eq('product_id', id);
      if (!data || data.length === 0) return null;
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
      return { avg: Math.round(avg * 10) / 10, count: data.length };
    },
    staleTime: 5 * 60 * 1000,
  });

  const allImages = images && images.length > 0 ? images : (image ? [image] : []);
  const initialIndex = mainImageIndex != null && mainImageIndex < allImages.length ? mainImageIndex : 0;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (variationTypes && Object.keys(variationTypes).length > 0) {
      navigate(`/product/${id}`);
      return;
    }
    addItem({ id, name, price, image: allImages[0] || '', stock, shippingPrice });
    toast({ title: t('pc.addedToCart'), description: t('pc.addedToCartDesc').replace('{name}', name) });
  };

  const handleDirectOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (variationTypes && Object.keys(variationTypes).length > 0) {
      navigate(`/product/${id}`);
      return;
    }
    addItem({ id, name, price, image: allImages[0] || '', stock, shippingPrice });
    navigate('/checkout');
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(i => (i === 0 ? allImages.length - 1 : i - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(i => (i === allImages.length - 1 ? 0 : i + 1));
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(index);
  };

  const discount = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;

  return (
    <>
    <Link to={`/product/${id}`} className="group block animate-fade-in h-full">
      <div className="bg-card rounded-3xl border border-border/50 overflow-hidden hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <ProductImage
            src={allImages[currentIndex]}
            alt={name}
            width={400}
            intrinsicWidth={400}
            intrinsicHeight={300}
            className="group-hover:scale-105 transition-transform duration-700 ease-out"
          />


          {allImages.length > 1 && (
            <>
              <button onClick={handlePrev} className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm">
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button onClick={handleNext} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm">
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {allImages.map((_, i) => (
                  <button key={i} onClick={(e) => handleDotClick(e, i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-background w-3' : 'bg-background/60'}`} />
                ))}
              </div>
            </>
          )}

          {outOfStock && (
            <div className="absolute inset-0 bg-foreground/50 backdrop-blur-[3px] flex items-center justify-center">
              <Badge variant="destructive" className="font-cairo text-sm px-5 py-2 rounded-full shadow-lg">{t('pc.outOfStock')}</Badge>
            </div>
          )}

          {/* Top-left badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {discount > 0 && (
              <Badge className="font-cairo text-[11px] bg-gradient-to-l from-red-500 to-red-600 text-white border-0 rounded-full px-3 py-1 shadow-md shadow-red-500/20">
                {t('pc.discount').replace('{n}', String(discount))}
              </Badge>
            )}
            <Badge className="font-cairo text-[11px] bg-foreground/60 backdrop-blur-md text-background border-0 rounded-full px-3 py-1">
              {Array.isArray(category) ? category[0] : category}
            </Badge>
          </div>



          {/* Hover add-to-cart overlay (desktop only) */}
          <div className="hidden md:block absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/70 via-foreground/40 to-transparent p-3.5 pt-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <Button size="sm" onClick={handleAdd} disabled={outOfStock} className="w-full font-cairo font-bold text-xs gap-1.5 rounded-xl h-9 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <ShoppingCart className="w-3.5 h-3.5" />
              {t('pc.addToCart')}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pt-3.5 space-y-2.5 flex-1 flex flex-col">
          <h3 className="font-cairo font-bold text-foreground text-sm leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors duration-300">
            {name}
          </h3>

          {/* Star rating */}
          {reviewStats && (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5" dir="ltr">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 transition-colors ${s <= Math.round(reviewStats.avg) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`} />
                ))}
              </div>
              <span className="font-cairo text-[10px] text-muted-foreground font-medium">({reviewStats.count})</span>
            </div>
          )}

          {/* Variation badges */}
          {variationTypes && Object.keys(variationTypes).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(variationTypes).map(([type, count]) => (
                <span key={type} className="font-cairo text-[10px] bg-primary/5 text-primary/70 px-2.5 py-0.5 rounded-full border border-primary/10">
                  {count} {type}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2.5 pt-0.5 mt-auto">
            <div className="flex flex-col gap-0.5 min-h-[2.75rem]">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                <span className="font-roboto font-extrabold text-primary text-base sm:text-lg tracking-tight whitespace-nowrap">
                  {formatPrice(price)}
                </span>
                {oldPrice && oldPrice > price && (
                  <span className="font-roboto text-[11px] text-muted-foreground/60 line-through decoration-destructive/40 whitespace-nowrap">
                    {formatPrice(oldPrice)}
                  </span>
                )}
              </div>
              {priceText && (
                <span className="font-cairo text-[10px] text-muted-foreground/80 leading-tight truncate">
                  {priceText}
                </span>
              )}
              {(shippingPrice ?? 0) > 0 && (
                <p className="font-cairo text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  <Truck className="w-3 h-3" /> {formatPrice(shippingPrice!)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 w-full">
              <Button size="sm" variant="outline" disabled={outOfStock} onClick={handleAdd} aria-label={t('pc.addToCart')} className="hidden sm:flex font-cairo text-[11px] rounded-lg h-8 w-8 p-0 shrink-0 border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 items-center justify-center">
                <ShoppingCart className="w-3.5 h-3.5 text-foreground" />
              </Button>
              <Button size="sm" disabled={outOfStock} onClick={handleDirectOrder} className="font-cairo font-bold text-[11px] gap-1 rounded-lg h-8 flex-1 shadow-sm hover:shadow-md hover:shadow-emerald-500/30 transition-all duration-300 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Zap className="w-3 h-3" />
                {t('pc.orderNow')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Link>

    </>
  );
}
