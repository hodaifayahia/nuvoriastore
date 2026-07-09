import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, X, Star, ChevronRight, ChevronLeft, Zap, Share2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';
import { useTranslation } from '@/i18n';

interface QuickViewProps {
  product: {
    id: string;
    name: string;
    price: number;
    old_price?: number | null;
    images?: string[];
    main_image_index?: number;
    category?: string | string[];
    description?: string;
    short_description?: string;
    stock?: number;
    shipping_price?: number;
  };
  reviewStats?: { avg: number; count: number };
  onClose: () => void;
}

export default function QuickViewModal({ product, reviewStats, onClose }: QuickViewProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState(product.main_image_index ?? 0);
  const images = product.images || [];
  const outOfStock = (product.stock ?? 0) <= 0;
  const discount = product.old_price && product.old_price > product.price
    ? Math.round((1 - product.price / product.old_price) * 100)
    : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: images[0] || '',
      stock: product.stock ?? 0,
      shippingPrice: Number(product.shipping_price) || 0,
    });
    toast({ title: t('qv.addedToCart'), description: t('qv.addedToCartDesc').replace('{name}', product.name) });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/product/${product.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: t('qv.checkOut').replace('{name}', product.name), url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: t('qv.linkCopied') });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border/30 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center hover:bg-background transition-colors shadow-md"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Gallery */}
          <div className="relative aspect-square md:aspect-auto md:min-h-[400px] bg-muted/50 rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none overflow-hidden group">
            {images[selectedImage] ? (
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                <ShoppingCart className="w-16 h-16" />
              </div>
            )}

            {/* Image dots */}
            {images.length > 1 && (
              <>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-foreground/30 backdrop-blur-md rounded-full px-3 py-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === selectedImage ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/70'}`}
                    />
                  ))}
                </div>
                <button onClick={() => setSelectedImage(i => (i === 0 ? images.length - 1 : i - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setSelectedImage(i => (i === images.length - 1 ? 0 : i + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Discount badge */}
            {discount > 0 && (
              <Badge className="absolute top-4 right-4 bg-gradient-to-l from-red-500 to-red-600 text-white border-0 rounded-full px-3 py-1 shadow-md font-cairo text-sm">
                {t('qv.discount').replace('{n}', String(discount))}
              </Badge>
            )}
          </div>

          {/* Product Info */}
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Category */}
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(product.category) ? product.category : [product.category]).filter(Boolean).map((c, i) => (
                  <Badge key={i} className="font-cairo text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5">
                    {c}
                  </Badge>
                ))}
              </div>

              {/* Name */}
              <h2 className="font-cairo font-extrabold text-xl md:text-2xl text-foreground leading-tight">
                {product.name}
              </h2>

              {/* Rating */}
              {reviewStats && reviewStats.count > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5" dir="ltr">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(reviewStats.avg) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`} />
                    ))}
                  </div>
                  <span className="font-roboto text-sm font-bold">{reviewStats.avg.toFixed(1)}</span>
                  <span className="font-cairo text-xs text-muted-foreground">{t('qv.reviewCount').replace('{n}', String(reviewStats.count))}</span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3 bg-gradient-to-l from-primary/5 to-transparent rounded-xl p-3">
                <span className="font-roboto font-extrabold text-2xl text-primary">{formatPrice(product.price)}</span>
                {product.old_price && product.old_price > product.price && (
                  <span className="font-roboto text-sm text-muted-foreground/50 line-through">{formatPrice(product.old_price)}</span>
                )}
              </div>

              {/* Description */}
              {(product.short_description || product.description) && (
                <p className="font-cairo text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {product.short_description || product.description}
                </p>
              )}

              {/* Stock status */}
              {outOfStock ? (
                <Badge variant="destructive" className="font-cairo rounded-full">{t('qv.outOfStockNow')}</Badge>
              ) : product.stock && product.stock <= 5 ? (
                <p className="font-cairo text-sm text-destructive font-bold animate-pulse">{t('qv.onlyLeft').replace('{n}', String(product.stock))}</p>
              ) : null}
            </div>

            {/* Actions */}
            <div className="space-y-3 mt-6 pt-4 border-t border-border/30">
              <div className="flex gap-2">
                <Button
                  onClick={handleAdd}
                  disabled={outOfStock}
                  className="flex-1 font-cairo font-bold gap-2 rounded-2xl h-12 bg-gradient-to-l from-primary to-primary/90 shadow-md shadow-primary/20"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {t('qv.addToCart')}
                </Button>
                <Link to={`/checkout?product=${product.id}`} onClick={onClose}>
                  <Button
                    disabled={outOfStock}
                    variant="outline"
                    className="font-cairo font-bold gap-2 rounded-2xl h-12 px-5 border-primary/30 hover:bg-primary/5"
                  >
                    <Zap className="w-4 h-4" />
                    {t('qv.order')}
                  </Button>
                </Link>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    toggleWishlist({ id: product.id, name: product.name, price: product.price, image: images[0] || '' });
                    toast({ title: wishlisted ? t('qv.removed') : t('qv.addedToWishlist') });
                  }}
                  className={`flex-1 font-cairo text-xs gap-1.5 rounded-xl h-9 ${wishlisted ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
                  {wishlisted ? t('qv.inWishlist') : t('qv.addToWishlist')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="flex-1 font-cairo text-xs gap-1.5 rounded-xl h-9 text-muted-foreground"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {t('qv.share')}
                </Button>
                <Link to={`/product/${product.id}`} onClick={onClose} className="flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full font-cairo text-xs gap-1.5 rounded-xl h-9 text-muted-foreground"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('qv.details')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
