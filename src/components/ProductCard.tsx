import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Star } from 'lucide-react';

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
  featured?: boolean;
  isFreeShipping?: boolean;
}

export default function ProductCard({ id, name, price, oldPrice, priceText, image, images, mainImageIndex, category, stock, featured, isFreeShipping }: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const outOfStock = stock <= 0;
  const isAr = language === 'ar';


  const { data: variationTypes } = useQuery({
    queryKey: ['product-variation-types', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variations')
        .select('variation_type')
        .eq('product_id', id)
        .eq('is_active', true);
      if (!data || data.length === 0) return null;
      return Array.from(new Set(data.map(v => v.variation_type)));
    },
  });

  const allImages = images && images.length > 0 ? images : (image ? [image] : []);
  const initialIndex = mainImageIndex != null && mainImageIndex < allImages.length ? mainImageIndex : 0;
  const [currentIndex] = useState(initialIndex);

  const handleOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    if (variationTypes && variationTypes.length > 0) {
      navigate(`/product/${id}`);
      return;
    }
    navigate(`/product/${id}`);
  };

  const brand = Array.isArray(category) ? category[0] : category;
  const discountPct = oldPrice && oldPrice > price
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : 0;

  const orderNowLabel = isAr ? 'اطلب الآن' : (t('pc.orderNow') || 'Commander');
  const featuredLabel = isAr ? 'مميز' : 'Populaire';
  const centimesLabel = isAr ? 'سنتيم' : 'centimes';
  const centimes = Math.round(price * 100).toLocaleString(isAr ? 'ar-DZ' : 'fr-DZ');

  return (
    <Link to={`/product/${id}`} className="group block h-full">
      <article className="relative h-full flex flex-col rounded-2xl border border-border/60 bg-card shadow-[0_2px_8px_rgba(15,27,61,0.04)] overflow-hidden transition-all hover:shadow-[0_8px_24px_rgba(15,27,61,0.08)] hover:-translate-y-0.5">
        {/* Image */}
        <div className="relative aspect-square bg-muted/30">
          <ProductImage
            src={allImages[currentIndex]}
            alt={name}
            width={500}
            intrinsicWidth={500}
            intrinsicHeight={500}
            className="w-full h-full object-contain p-3 group-hover:scale-[1.04] transition-transform duration-500 ease-out"
          />

          {/* Top-start: featured + category stacked */}
          <div className="absolute top-2.5 start-2.5 flex flex-col items-start gap-1.5 max-w-[60%]">
            {featured && (
              <span className="inline-flex items-center gap-1 bg-amber-400 text-black rounded-full px-2.5 py-1 text-[11px] font-cairo font-bold shadow-sm">
                <Star className="w-3 h-3 fill-black" />
                {featuredLabel}
              </span>
            )}
            {brand && (
              <span className="bg-foreground/85 text-background rounded-full px-2.5 py-1 text-[11px] font-cairo font-medium shadow-sm max-w-full truncate">
                {brand}
              </span>
            )}
          </div>

          {/* Top-end: discount only */}
          {discountPct > 0 && (
            <div className="absolute top-2.5 end-2.5">
              <span className="bg-destructive text-destructive-foreground rounded-full px-2.5 py-1 text-[11px] font-cairo font-bold shadow-sm">
                {isAr ? `${discountPct}% خصم` : `-${discountPct}%`}
              </span>
            </div>
          )}

          {isFreeShipping && !outOfStock && (
            <div className="absolute bottom-2.5 start-2.5">
              <span className="inline-flex items-center gap-1 bg-emerald-600 text-white rounded-full px-2.5 py-1 text-[11px] font-cairo font-bold shadow-sm">
                <Truck className="w-3 h-3" />
                {t('products.freeShipping')}
              </span>
            </div>
          )}


          {outOfStock && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px] flex items-center justify-center">
              <span className="bg-foreground text-background text-xs font-cairo font-semibold rounded-full px-3 py-1">
                {t('pc.outOfStock')}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 gap-2">
          <h3 className="font-cairo font-bold text-foreground text-sm sm:text-[15px] leading-snug line-clamp-2 text-center min-h-[2.6rem]">
            {name}
          </h3>

          <div className="mt-auto space-y-1 text-center">
            <div className="flex items-baseline justify-center gap-2 flex-wrap" dir="ltr">
              {oldPrice && oldPrice > price && (
                <span className="font-roboto text-xs text-muted-foreground/70 line-through">
                  {formatPrice(oldPrice)}
                </span>
              )}
              <span className="font-roboto font-extrabold text-primary text-base sm:text-lg tracking-tight">
                {formatPrice(price)}
              </span>
            </div>
            <p className="font-cairo text-[11px] text-muted-foreground/70" dir={isAr ? 'rtl' : 'ltr'}>
              {isAr ? `${centimes} ${centimesLabel}` : `${centimes} ${centimesLabel}`}
            </p>
          </div>

          <button
            onClick={handleOrder}
            disabled={outOfStock}
            className="mt-2 w-full h-10 rounded-xl bg-primary text-primary-foreground font-cairo font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Zap className="w-4 h-4 fill-current" />
            {orderNowLabel}
          </button>
        </div>
      </article>
    </Link>
  );
}
