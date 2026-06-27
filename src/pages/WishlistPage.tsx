import { Link } from 'react-router-dom';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/i18n';

export default function WishlistPage() {
  const { t } = useTranslation();
  const { items, removeItem, clearWishlist } = useWishlist();
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (item: typeof items[0]) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      stock: 99,
    });
    toast({
      title: t('wishlist.added'),
      description: t('wishlist.addedDesc').replace('{name}', item.name),
    });
  };

  return (
    <div className="container py-8 min-h-[60vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-destructive fill-destructive" />
          </div>
          <div>
            <h1 className="font-cairo font-bold text-2xl text-foreground">{t('wishlist.title')}</h1>
            <p className="font-cairo text-sm text-muted-foreground">
              {t('wishlist.count').replace('{n}', String(items.length))}
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearWishlist}
            className="font-cairo text-xs text-muted-foreground hover:text-destructive gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('wishlist.clearAll')}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h2 className="font-cairo font-bold text-xl text-foreground mb-2">{t('wishlist.empty.title')}</h2>
          <p className="font-cairo text-muted-foreground mb-6">{t('wishlist.empty.description')}</p>
          <Link to="/products">
            <Button className="font-cairo gap-2">
              <ArrowRight className="w-4 h-4" />
              {t('wishlist.browse')}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
              <Link to={`/product/${item.id}`}>
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
                      <Heart className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeItem(item.id); }}
                    className="absolute top-3 left-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive hover:text-white transition-colors"
                    aria-label={t('wishlist.removeAria')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Link>
              <div className="p-4 space-y-3">
                <Link to={`/product/${item.id}`}>
                  <h3 className="font-cairo font-semibold text-sm text-foreground line-clamp-2 hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                </Link>
                <div className="flex items-center justify-between">
                  <span className="font-roboto font-bold text-primary text-lg">
                    {formatPrice(item.price)}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(item)}
                    className="font-cairo text-xs gap-1.5 rounded-xl h-8"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {t('wishlist.addToCart')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
