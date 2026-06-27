import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingCart, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/format';
import { useTranslation } from '@/i18n';

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const { t } = useTranslation();

  const totalShipping = items.reduce((sum, item) => {
    const rate = item.shippingPrice ?? 0;
    return sum + rate * item.quantity;
  }, 0);

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="font-cairo font-bold text-2xl mb-2">{t('cart.emptyTitle')}</h1>
        <p className="font-cairo text-muted-foreground mb-6">{t('cart.emptySubtitle')}</p>
        <Link to="/products">
          <Button className="font-cairo font-semibold">{t('cart.browseProducts')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="font-cairo font-bold text-3xl mb-6">{t('cart.title')}</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => {
            const itemPrice = item.price + (item.variation?.priceAdjustment || 0);
            const itemShipping = item.shippingPrice ?? 0;
            return (
              <div key={`${item.id}${item.variation ? `__${item.variation.type}:${item.variation.value}` : ''}`} className="flex gap-4 bg-card border rounded-lg p-4 animate-fade-in">
                <div className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ShoppingCart className="w-6 h-6 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.id}`} className="font-cairo font-semibold text-foreground hover:text-primary line-clamp-1">{item.name}</Link>
              {item.variantOptionValues && (
                    <p className="font-cairo text-xs text-muted-foreground mt-0.5">
                      {Object.entries(item.variantOptionValues).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                    </p>
                  )}
                  {!item.variantOptionValues && item.variation && (
                    <p className="font-cairo text-xs text-muted-foreground mt-0.5">
                      {item.variation.type}: {item.variation.value}
                    </p>
                  )}
                  <p className="font-roboto font-bold text-primary mt-1">{formatPrice(itemPrice)}</p>
                  {itemShipping > 0 && (
                    <p className="font-cairo text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Truck className="w-3 h-3" />
                      {t('cart.shippingLabel')}: {formatPrice(itemShipping)} × {item.quantity} = {formatPrice(itemShipping * item.quantity)}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border rounded-md">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1, item.variation, item.variantId)}><Minus className="w-3 h-3" /></Button>
                      <span className="w-8 text-center font-roboto text-sm font-bold">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1, item.variation, item.variantId)}><Plus className="w-3 h-3" /></Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-roboto font-bold text-sm">{formatPrice(itemPrice * item.quantity)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeItem(item.id, item.variation, item.variantId)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-card border rounded-lg p-6 h-fit sticky top-20">
          <h2 className="font-cairo font-bold text-xl mb-4">{t('cart.summary')}</h2>
          <div className="space-y-2 mb-4 font-cairo text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('cart.subtotal')}</span>
              <span className="font-roboto font-bold">{formatPrice(subtotal)}</span>
            </div>
            {totalShipping > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {t('cart.delivery')}</span>
                <span className="font-roboto font-bold">{formatPrice(totalShipping)}</span>
              </div>
            )}
            <hr className="border-border my-2" />
            <div className="flex justify-between font-bold text-base">
              <span>{t('cart.estTotal')}</span>
              <span className="font-roboto text-primary">{formatPrice(subtotal + totalShipping)}</span>
            </div>
          </div>
          <p className="font-cairo text-xs text-muted-foreground mb-4">{t('cart.shippingNote')}</p>
          <Link to="/checkout">
            <Button className="w-full font-cairo font-semibold">{t('cart.checkout')}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
