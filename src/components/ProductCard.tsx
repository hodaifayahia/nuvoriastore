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
    navigate(`/product/${id}`);
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

  const brand = Array.isArray(category) ? category[0] : category;
  const savings = oldPrice && oldPrice > price ? oldPrice - price : 0;

  return (
    <>
    <Link to={`/product/${id}`} className="group block animate-fade-in h-full">
      <div className="h-full flex flex-col">
        {/* Image tile */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted/40">
          <ProductImage
            src={allImages[currentIndex]}
            alt={name}
            width={500}
            intrinsicWidth={500}
            intrinsicHeight={500}
            className="w-full h-full object-contain p-4 group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          />

          {allImages.length > 1 && (
            <>
              <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm">
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm">
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </>
          )}

          {/* Top-left status pill */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5" dir="ltr">
            {outOfStock ? (
              <span className="font-cairo text-[11px] font-medium bg-muted text-muted-foreground rounded-full px-3 py-1 shadow-sm">
                {t('pc.outOfStock')}
              </span>
            ) : savings > 0 ? (
              <span className="font-cairo text-[11px] font-semibold bg-destructive text-destructive-foreground rounded-full px-3 py-1 shadow-sm">
                {t('pc.save') || 'Épargnez'} {formatPrice(savings)}
              </span>
            ) : null}
          </div>

          {/* Top-right rating */}
          {reviewStats && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm" dir="ltr">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-cairo text-[11px] font-semibold text-foreground">{reviewStats.avg.toFixed(1)}</span>
            </div>
          )}

          {/* Floating cart FAB */}
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={t('pc.addToCart')}
            className="absolute bottom-3 end-3 w-11 h-11 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-1 pt-3 pb-1 flex-1 flex flex-col gap-1.5">
          {brand && (
            <span className="font-cairo text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium truncate">
              {brand}
            </span>
          )}

          <h3 className="font-cairo font-bold text-foreground text-sm sm:text-[15px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {name}
          </h3>

          {variationTypes && Object.keys(variationTypes).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(variationTypes).map(([type, count]) => (
                <span key={type} className="font-cairo text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {count} {type}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-baseline gap-2 mt-auto pt-1" dir="ltr">
            <span className={`font-roboto font-bold tracking-tight whitespace-nowrap ${savings > 0 ? 'text-destructive text-[15px] sm:text-base' : 'text-foreground text-[15px] sm:text-base'}`}>
              {formatPrice(price)}
            </span>
            {oldPrice && oldPrice > price && (
              <span className="font-roboto text-xs text-muted-foreground/70 line-through whitespace-nowrap">
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
            <p className="font-cairo text-[10px] text-muted-foreground flex items-center gap-1">
              <Truck className="w-3 h-3" /> {formatPrice(shippingPrice!)}
            </p>
          )}
        </div>
      </div>
    </Link>

    </>
  );
}
