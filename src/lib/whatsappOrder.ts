import { supabase } from '@/integrations/supabase/client';

let cachedNumber: string | null | undefined = undefined;

export async function getStoreWhatsAppNumber(): Promise<string | null> {
  if (cachedNumber !== undefined) return cachedNumber;
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['whatsapp_number', 'whatsapp_enabled']);
  const map = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
  const raw = (map.whatsapp_number || '').toString().replace(/[^0-9]/g, '');
  cachedNumber = raw || null;
  return cachedNumber;
}

export interface WhatsAppOrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  variation_label?: string;
}

export interface WhatsAppOrderPayload {
  customer_name: string;
  customer_phone: string;
  wilaya_name?: string;
  baladiya?: string;
  address?: string;
  delivery_type?: string;
  payment_method?: string;
  items: WhatsAppOrderItem[];
  subtotal?: number;
  shipping_cost?: number;
  discount?: number;
  coupon_code?: string;
  total: number;
  note?: string;
}

const money = (n: number) => `${Math.round(n).toLocaleString()} د.ج`;

const deliveryLabel = (t?: string) =>
  t === 'home' ? '🏠 توصيل للمنزل' : t === 'office' ? '🏢 مكتب التوصيل' : t === 'pickup' ? '📍 نقطة استلام' : t === 'digital' ? '💻 رقمي' : (t || '—');

const paymentLabel = (p?: string) => {
  switch (p) {
    case 'cod': return '💵 الدفع عند التسليم';
    case 'baridimob': return '🏦 بريدي موب';
    case 'flexy': return '📱 فليكسي';
    case 'binance': return '🪙 Binance Pay';
    case 'vodafone': return '📱 Vodafone Cash';
    case 'redotpay': return '💳 RedotPay';
    default: return p || '—';
  }
};

export function buildWhatsAppOrderMessage(o: WhatsAppOrderPayload): string {
  const L: string[] = [];
  L.push('🛒 *طلب جديد عبر واتساب*');
  L.push('━━━━━━━━━━━━━━━━');
  L.push('👤 *معلومات العميل*');
  L.push(`• الاسم: ${o.customer_name || '—'}`);
  L.push(`• الهاتف: ${o.customer_phone || '—'}`);
  if (o.wilaya_name) L.push(`• الولاية: ${o.wilaya_name}`);
  if (o.baladiya) L.push(`• البلدية: ${o.baladiya}`);
  if (o.address) L.push(`• العنوان: ${o.address}`);
  L.push(`• التوصيل: ${deliveryLabel(o.delivery_type)}`);
  L.push(`• الدفع: ${paymentLabel(o.payment_method)}`);
  L.push('');
  L.push('📦 *المنتجات*');
  o.items.forEach(it => {
    const line = `• ${it.name}${it.variation_label ? ` (${it.variation_label})` : ''} × ${it.quantity} = ${money(it.unit_price * it.quantity)}`;
    L.push(line);
  });
  L.push('');
  L.push('💰 *الحساب*');
  if (o.subtotal !== undefined) L.push(`• المجموع الفرعي: ${money(o.subtotal)}`);
  if (o.shipping_cost !== undefined) L.push(`• الشحن: ${o.shipping_cost > 0 ? money(o.shipping_cost) : 'مجاني'}`);
  if (o.discount && o.discount > 0) L.push(`• الخصم${o.coupon_code ? ` (${o.coupon_code})` : ''}: -${money(o.discount)}`);
  L.push(`• *الإجمالي: ${money(o.total)}*`);
  if (o.note) { L.push(''); L.push(`📝 ملاحظة: ${o.note}`); }
  L.push('━━━━━━━━━━━━━━━━');
  L.push('شكراً لكم 🙏');
  return L.join('\n');
}

export async function openWhatsAppOrder(payload: WhatsAppOrderPayload): Promise<{ ok: boolean; reason?: string }> {
  const number = await getStoreWhatsAppNumber();
  if (!number) return { ok: false, reason: 'no_number' };
  const msg = encodeURIComponent(buildWhatsAppOrderMessage(payload));
  const url = `https://wa.me/${number}?text=${msg}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return { ok: true };
}
