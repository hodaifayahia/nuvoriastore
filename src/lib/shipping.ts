import type { CartItem } from '@/contexts/CartContext';

interface ProductShippingInfo {
  id: string;
  shipping_price: number | null;
}

/**
 * Calculate total shipping cost for an order.
 * Each product has its own shipping_price. Total = sum of (shipping_price * quantity) for each item.
 * If a product has no shipping_price (null/0), the wilaya base rate is used for that item.
 * deliveryType: 'office' uses wilayaBaseRate, 'home' uses wilayaHomeRate
 */
export function calculateShippingForOrder(
  cartItems: CartItem[],
  productShippingMap: Map<string, number>,
  wilayaBaseRate: number,
  wilayaHomeRate?: number,
  deliveryType?: string
): number {
  const baseRate = deliveryType === 'home' && wilayaHomeRate != null ? wilayaHomeRate : wilayaBaseRate;
  return cartItems.reduce((total, item) => {
    const productShipping = productShippingMap.get(item.id);
    if (productShipping === -1) return total; // free delivery product
    const rate = (productShipping && productShipping > 0) ? productShipping : baseRate;
    return total + rate * item.quantity;
  }, 0);
}

/**
 * Get shipping breakdown per item for display purposes.
 */
export function getShippingBreakdown(
  cartItems: CartItem[],
  productShippingMap: Map<string, number>,
  wilayaBaseRate: number,
  wilayaHomeRate?: number,
  deliveryType?: string
): { itemId: string; name: string; quantity: number; shippingPerUnit: number; total: number }[] {
  const baseRate = deliveryType === 'home' && wilayaHomeRate != null ? wilayaHomeRate : wilayaBaseRate;
  return cartItems.map(item => {
    const productShipping = productShippingMap.get(item.id);
    const rate = productShipping === -1 ? 0 : ((productShipping && productShipping > 0) ? productShipping : baseRate);
    return {
      itemId: item.id,
      name: item.name,
      quantity: item.quantity,
      shippingPerUnit: rate,
      total: rate * item.quantity,
    };
  });
}
