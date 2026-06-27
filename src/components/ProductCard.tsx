import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Zap, ChevronLeft, ChevronRight, Truck, Star, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import QuickViewModal from '@/components/QuickViewModal';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  images?: string[];
  mainImageIndex?: number;
  category: string | string[];
  stock: number;
  shippingPrice?: number;
}

export default function ProductCard({ id, name, price, oldPrice, image, images, mainImageIndex, category, stock, shippingPrice }: ProductCardProps) {
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toast } = useToast();
  const navigate = useNavigate();
  const outOfStock = stock <= 0;
  const wishlisted = isInWishlist(id);

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
    toast({ title: 'تمت الإضافة', description: `تمت إضافة "${name}" إلى السلة` });
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
    <Link to={`/product/${id}`} className="group block animate-fade-in">
      <div className="bg-card rounded-3xl border border-border/50 overflow-hidden hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {allImages.length > 0 ? (
            <img
              src={allImages[currentIndex]}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
              <ShoppingCart className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}

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
              <Badge variant="destructive" className="font-cairo text-sm px-5 py-2 rounded-full shadow-lg">غير متوفر</Badge>
            </div>
          )}

          {/* Top-left badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {discount > 0 && (
              <Badge className="font-cairo text-[11px] bg-gradient-to-l from-red-500 to-red-600 text-white border-0 rounded-full px-3 py-1 shadow-md shadow-red-500/20">
                خصم {discount}%
              </Badge>
            )}
            <Badge className="font-cairo text-[11px] bg-foreground/60 backdrop-blur-md text-background border-0 rounded-full px-3 py-1">
              {Array.isArray(category) ? category[0] : category}
            </Badge>
          </div>

          {/* Wishlist button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist({ id, name, price, image: allImages[0] || '' });
              toast({
                title: wishlisted ? 'تمت الإزالة' : 'تمت الإضافة',
                description: wishlisted ? `تم إزالة "${name}" من المفضلة` : `تمت إضافة "${name}" إلى المفضلة`,
              });
            }}
            className={`absolute top-3 left-3 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-300 ${
              wishlisted
                ? 'bg-destructive/90 text-white scale-110 shadow-md shadow-destructive/30'
                : 'bg-background/70 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive hover:scale-110'
            }`}
            aria-label={wishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          >
            <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
          </button>

          {/* Quick View button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewOpen(true);
            }}
            className="absolute bottom-3 left-3 w-9 h-9 rounded-full bg-background/70 backdrop-blur-md flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-background hover:text-foreground hover:scale-110 shadow-md"
            aria-label="عرض سريع"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Hover add-to-cart overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/70 via-foreground/40 to-transparent p-3.5 pt-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <Button size="sm" onClick={handleAdd} disabled={outOfStock} className="w-full font-cairo text-xs gap-1.5 rounded-xl h-9 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30">
              <ShoppingCart className="w-3.5 h-3.5" />
              أضف للسلة
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pt-3.5 space-y-2.5">
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

          <div className="space-y-2.5 pt-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-roboto font-extrabold text-primary text-lg tracking-tight">
                  {formatPrice(price)}
                </span>
                {oldPrice && oldPrice > price && (
                  <span className="font-roboto text-[11px] text-muted-foreground/60 line-through decoration-destructive/40">
                    {formatPrice(oldPrice)}
                  </span>
                )}
              </div>
              {(shippingPrice ?? 0) > 0 && (
                <p className="font-cairo text-[10px] text-muted-foreground flex items-center gap-0.5 bg-muted/50 px-1.5 py-0.5 rounded-md">
                  <Truck className="w-3 h-3" /> {formatPrice(shippingPrice!)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 w-full">
              <Button size="sm" variant="outline" disabled={outOfStock} onClick={handleAdd} className="font-cairo text-xs gap-1 rounded-xl h-9 px-3 shrink-0 border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-300">
                <ShoppingCart className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" disabled={outOfStock} onClick={handleDirectOrder} className="font-cairo text-xs gap-1 rounded-xl h-9 flex-1 shadow-sm hover:shadow-md hover:shadow-primary/20 transition-all duration-300 bg-gradient-to-l from-primary to-primary/90">
                <Zap className="w-3.5 h-3.5" />
                اطلب الآن
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Link>

    {/* Quick View Modal */}
    {quickViewOpen && (
      <QuickViewModal
        product={{
          id,
          name,
          price,
          old_price: oldPrice,
          images: allImages,
          category,
          stock,
          shipping_price: shippingPrice,
        }}
        reviewStats={reviewStats ?? undefined}
        onClose={() => setQuickViewOpen(false)}
      />
    )}
    </>
  );
}
