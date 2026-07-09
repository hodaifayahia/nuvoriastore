import { useState, useMemo, useEffect, Fragment } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';
import { Search, Plus, Minus, Trash2, ShoppingCart, Tag, Loader2, ArrowRight, User, MapPin, Package, CreditCard, CheckCircle } from 'lucide-react';
import { ALGERIA_WILAYAS } from '@/data/algeria-wilayas';
import { useTranslation } from '@/i18n';

interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  variationId?: string;
  variationLabel?: string;
  image?: string;
  stock: number;
}

const STEPS = [
  { key: 'customer', icon: User, label: 'معلومات العميل' },
  { key: 'products', icon: Package, label: 'المنتجات' },
  { key: 'summary', icon: CheckCircle, label: 'ملخص الطلب' },
];

export default function AdminCreateOrderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFastMode = searchParams.get('fast') === '1';
  const fastFixedPrice = Number(searchParams.get('fixedUnitPrice') || 0);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState(isFastMode ? 1 : 0);

  // Customer fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedWilayaId, setSelectedWilayaId] = useState('');
  const [selectedBaladiya, setSelectedBaladiya] = useState('');
  const [deliveryType, setDeliveryType] = useState('office');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  // Products
  const [productSearch, setProductSearch] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const { data: wilayas } = useQuery({
    queryKey: ['wilayas-for-order'],
    queryFn: async () => {
      const { data } = await supabase.from('wilayas').select('*').eq('is_active', true).order('code', { ascending: true, nullsFirst: false });
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-for-order'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: variations } = useQuery({
    queryKey: ['variations-for-order'],
    queryFn: async () => {
      const { data } = await supabase.from('product_variations').select('*').eq('is_active', true);
      return data || [];
    },
  });

  // New variant system
  const { data: productVariants } = useQuery({
    queryKey: ['product-variants-for-order'],
    queryFn: async () => {
      const { data } = await supabase.from('product_variants').select('*').eq('is_active', true);
      return data || [];
    },
  });

  // Track selected variant per product for new variant system
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, string>>({});

  const selectedWilaya = wilayas?.find(w => w.id === selectedWilayaId);
  const wilayaName = selectedWilaya?.name || '';

  useEffect(() => {
    const name = searchParams.get('customerName');
    const phone = searchParams.get('customerPhone');
    if (name) setCustomerName(name);
    if (phone) setCustomerPhone(phone);
  }, [searchParams]);

  useEffect(() => {
    if (!wilayas?.length || selectedWilayaId) return;

    const requestedWilaya = searchParams.get('wilaya')?.trim();
    if (requestedWilaya) {
      const byRequested = wilayas.find(w =>
        String(w.name || '').toLowerCase().includes(requestedWilaya.toLowerCase())
      );
      if (byRequested?.id) {
        setSelectedWilayaId(byRequested.id);
        return;
      }
    }

    const ghardaia = wilayas.find(w => {
      const name = String(w.name || '').toLowerCase();
      return name.includes('غرداية') || name.includes('ghardaia');
    });
    if (ghardaia?.id) setSelectedWilayaId(ghardaia.id);
  }, [wilayas, selectedWilayaId, searchParams]);

  const baladiyat = useMemo(() => {
    if (!wilayaName) return [];
    const cleanName = wilayaName.split(' - ')[1]?.trim() || wilayaName;
    const wilayaData = ALGERIA_WILAYAS.find(w => w.name === cleanName || wilayaName.includes(w.name));
    return wilayaData?.baladiyat || [];
  }, [wilayaName]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!productSearch) return products;
    return products.filter(p => p.name.includes(productSearch) || p.sku?.includes(productSearch));
  }, [products, productSearch]);

  const getProductVariations = (productId: string) => {
    return variations?.filter(v => v.product_id === productId) || [];
  };

  const getProductVariantRows = (productId: string) => {
    return productVariants?.filter(v => v.product_id === productId) || [];
  };

  const normalizeOptionValues = (raw: any): Record<string, string> => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.entries(raw).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        acc[key] = String(value);
      }
      return acc;
    }, {});
  };

  const getVariantLabel = (variant: any) => {
    const vals = normalizeOptionValues(variant.option_values);
    return Object.entries(vals).map(([k, v]) => `${k}: ${v}`).join(' / ');
  };

  const isNewVariantProduct = (product: any) => {
    return getProductVariantRows(product.id).length > 0;
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const shippingCost = useMemo(() => {
    if (!selectedWilaya) return 0;
    return deliveryType === 'home' ? Number(selectedWilaya.shipping_price_home) : Number(selectedWilaya.shipping_price);
  }, [selectedWilaya, deliveryType]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const raw = appliedCoupon.discount_type === 'percentage'
      ? Math.round(subtotal * appliedCoupon.discount_value / 100)
      : appliedCoupon.discount_value;
    return Math.min(raw, subtotal);
  }, [appliedCoupon, subtotal]);

  const total = subtotal + shippingCost - discountAmount;

  const addProduct = (product: any, variation?: any) => {
    const existingIndex = orderItems.findIndex(
      i => i.productId === product.id && i.variationId === (variation?.id || undefined)
    );
    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity++;
      setOrderItems(updated);
      return;
    }
    const price = fastFixedPrice > 0 ? fastFixedPrice : Number(product.price) + (variation ? Number(variation.price_adjustment || 0) : 0);
    setOrderItems(prev => [...prev, {
      productId: product.id,
      productName: product.name + (variation ? ` (${variation.variation_value})` : ''),
      price,
      quantity: 1,
      variationId: variation?.id,
      variationLabel: variation?.variation_value,
      image: product.images?.[0],
      stock: product.stock ?? 0,
    }]);
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...orderItems];
    updated[index].quantity = Math.max(1, updated[index].quantity + delta);
    setOrderItems(updated);
  };

  const removeItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim())
        .eq('is_active', true)
        .single();
      if (error || !data) {
        toast({ title: 'كود الخصم غير صالح', variant: 'destructive' });
        return;
      }
      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        toast({ title: 'كود الخصم منتهي الصلاحية', variant: 'destructive' });
        return;
      }
      setAppliedCoupon({ code: data.code, discount_type: data.discount_type, discount_value: Number(data.discount_value) });
      toast({ title: 'تم تطبيق كود الخصم بنجاح ✅' });
    } catch {
      toast({ title: 'خطأ في التحقق من الكود', variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  };

  const submitOrder = useMutation({
    mutationFn: async () => {
      if (!customerName.trim()) throw new Error('اسم العميل مطلوب');
      if (!customerPhone.trim()) throw new Error('رقم الهاتف مطلوب');
      if (orderItems.length === 0) throw new Error('أضف منتج واحد على الأقل');

      const { data: maxOrder } = await supabase
        .from('orders')
        .select('order_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNum = 1;
      if (maxOrder?.order_number) {
        const num = parseInt(maxOrder.order_number.replace('ORD-', ''));
        if (!isNaN(num)) nextNum = num + 1;
      }
      const orderNumber = `ORD-${String(nextNum).padStart(3, '0')}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          wilaya_id: selectedWilayaId || null,
          baladiya: selectedBaladiya || null,
          delivery_type: deliveryType,
          address: deliveryType === 'home' ? address.trim() : null,
          payment_method: paymentMethod,
          subtotal,
          shipping_cost: shippingCost,
          discount_amount: discountAmount,
          coupon_code: appliedCoupon?.code || null,
          total_amount: total,
          status: 'جديد',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const items = orderItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        variant_id: item.variationId || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(items);
      if (itemsError) throw itemsError;

      // Deduct stock
      for (const item of orderItems) {
        const { data: prod } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.productId)
          .single();
        if (prod) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, (prod.stock || 0) - item.quantity) })
            .eq('id', item.productId);
        }
      }

      return order;
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: `تم إنشاء الطلب ${order.order_number} بنجاح ✅` });
      navigate('/admin/orders');
    },
    onError: (error: any) => {
      toast({ title: error.message || 'حدث خطأ', variant: 'destructive' });
    },
  });

  const canProceedStep0 = customerName.trim() && customerPhone.trim();
  const canProceedStep1 = orderItems.length > 0;

  const canSubmitFast = customerName.trim() && customerPhone.trim() && selectedWilayaId && orderItems.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')} className="font-cairo gap-1">
          <ArrowRight className="w-4 h-4" /> {t('common.back')}
        </Button>
        <h1 className="font-cairo font-bold text-xl">{isFastMode ? 'طلب سريع' : 'إنشاء طلب جديد'}</h1>
      </div>

      {isFastMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b">
                <User className="w-5 h-5 text-primary" />
                <h2 className="font-cairo font-bold text-lg">بيانات العميل السريعة</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="font-cairo text-sm font-semibold">الاسم *</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم العميل" className="mt-1.5 font-cairo h-11" />
                </div>
                <div>
                  <Label className="font-cairo text-sm font-semibold">الهاتف *</Label>
                  <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="05XXXXXXXX" className="mt-1.5 font-roboto h-11" dir="ltr" />
                </div>
                <div>
                  <Label className="font-cairo text-sm font-semibold">الولاية *</Label>
                  <Select value={selectedWilayaId} onValueChange={(v) => { setSelectedWilayaId(v); setSelectedBaladiya(''); }}>
                    <SelectTrigger className="mt-1.5 font-cairo h-11"><SelectValue placeholder="اختر الولاية" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {wilayas?.map(w => (
                        <SelectItem key={w.id} value={w.id} className="font-cairo">{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="font-cairo font-bold text-lg">المنتجات</h2>
              </div>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="ابحث عن منتج..." className="pr-10 font-cairo h-11" />
              </div>

              <div className="max-h-[500px] overflow-y-auto border rounded-xl divide-y">
                {filteredProducts.map(product => {
                  const prodVariations = getProductVariations(product.id);
                  const prodVariantRows = getProductVariantRows(product.id);
                  const hasNewVariants = isNewVariantProduct(product);
                  const hasLegacyVariations = prodVariations.length > 0;
                  const hasAnyVariants = product.has_variants || hasNewVariants || hasLegacyVariations;

                  return (
                    <div key={product.id} className="p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.name} className="w-14 h-14 rounded-xl object-cover border flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-cairo text-sm font-semibold truncate">{product.name}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="font-roboto text-sm font-bold text-primary">{formatPrice(Number(product.price))}</span>
                            <span className={`font-cairo text-xs px-2 py-0.5 rounded-full ${(product.stock ?? 0) > 5 ? 'bg-primary/10 text-primary' : (product.stock ?? 0) > 0 ? 'bg-orange-500/10 text-orange-600' : 'bg-destructive/10 text-destructive'}`}>
                              {product.stock ?? 0} في المخزون
                            </span>
                            {hasAnyVariants && (
                              <span className="font-cairo text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                                يحتوي متغيرات
                              </span>
                            )}
                          </div>
                        </div>
                        {!hasAnyVariants && (
                          <Button size="sm" variant="outline" className="font-cairo text-xs h-9 gap-1 rounded-lg flex-shrink-0" onClick={() => addProduct(product)}>
                            <Plus className="w-3.5 h-3.5" /> أضف
                          </Button>
                        )}
                      </div>

                      {/* Legacy variations */}
                      {hasLegacyVariations && !hasNewVariants && (
                        <div className="mt-2 mr-[68px] flex flex-wrap gap-1">
                          {prodVariations.map(v => (
                            <Button key={v.id} size="sm" variant="outline" className="font-cairo text-[11px] h-7 px-2 rounded-lg" onClick={() => addProduct(product, v)}>
                              {v.variation_value} — {formatPrice(fastFixedPrice > 0 ? fastFixedPrice : Number(product.price) + Number(v.price_adjustment || 0))}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* New variant system */}
                      {hasNewVariants && (
                        <div className="mt-2 mr-0 sm:mr-[68px] space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {prodVariantRows.map(variant => {
                              const label = getVariantLabel(variant);
                              const isSelected = selectedVariantMap[product.id] === variant.id;
                              const variantPrice = fastFixedPrice > 0 ? fastFixedPrice : Number(variant.price || product.price);
                              return (
                                <Button
                                  key={variant.id}
                                  size="sm"
                                  variant={isSelected ? 'default' : 'outline'}
                                  className={`font-cairo text-[11px] h-auto py-1 px-2 rounded-lg ${isSelected ? '' : ''}`}
                                  onClick={() => {
                                    if (isSelected) {
                                      // Add to order
                                      addProduct(product, { ...variant, variation_value: label, price_adjustment: Number(variant.price || 0) - Number(product.price) });
                                      setSelectedVariantMap(prev => { const n = { ...prev }; delete n[product.id]; return n; });
                                    } else {
                                      setSelectedVariantMap(prev => ({ ...prev, [product.id]: variant.id }));
                                    }
                                  }}
                                >
                                  <span className="block">{label}</span>
                                  <span className="block font-roboto font-bold mr-1">{formatPrice(variantPrice)}</span>
                                  {variant.quantity != null && <span className="block text-[10px] opacity-70">({variant.quantity})</span>}
                                </Button>
                              );
                            })}
                          </div>
                          {selectedVariantMap[product.id] && (
                            <p className="font-cairo text-xs text-primary animate-pulse">⬆ اضغط مرة أخرى لإضافة المتغير المحدد</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground font-cairo">لا توجد منتجات</p>
                )}
              </div>

              {orderItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-cairo text-sm font-bold text-foreground flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    المنتجات المختارة ({orderItems.length})
                  </h3>
                  <div className="space-y-2">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/40 rounded-xl p-3 border">
                        {item.image && <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover border" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-cairo text-sm font-medium truncate">{item.productName}</p>
                          <p className="font-roboto text-xs text-muted-foreground">{formatPrice(item.price)} × {item.quantity} = <span className="font-bold text-foreground">{formatPrice(item.price * item.quantity)}</span></p>
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(idx, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-roboto font-bold text-sm w-8 text-center">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(idx, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive rounded-lg" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card border rounded-2xl p-5 sticky top-20 space-y-4">
              <h3 className="font-cairo font-bold text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                ملخص الطلب السريع
              </h3>

              {orderItems.length === 0 ? (
                <p className="font-cairo text-sm text-muted-foreground text-center py-6">أضف منتجًا واحدًا على الأقل</p>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between font-cairo text-sm">
                      <span className="truncate flex-1">{item.productName} ×{item.quantity}</span>
                      <span className="font-roboto font-semibold mr-2">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}

              <hr />

              <div className="space-y-2 font-cairo text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span className="font-roboto font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">التوصيل</span>
                  <span className="font-roboto font-semibold">{formatPrice(shippingCost)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-bold text-base">
                  <span>الإجمالي</span>
                  <span className="font-roboto text-primary text-lg">{formatPrice(total)}</span>
                </div>
              </div>

              <Button
                onClick={() => submitOrder.mutate()}
                disabled={submitOrder.isPending || !canSubmitFast}
                className="w-full font-cairo gap-2 h-12 text-base"
              >
                {submitOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                تأكيد الطلب السريع
              </Button>
            </div>
          </div>
        </div>
      ) : (
      <>
      {/* Step Indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => {
              if (i === 0) setStep(0);
              else if (i === 1 && canProceedStep0) setStep(1);
              else if (i === 2 && canProceedStep0 && canProceedStep1) setStep(2);
            }}
            className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
              step === i ? 'border-primary bg-primary/5' : step > i ? 'border-primary/30 bg-primary/5' : 'border-border'
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              step >= i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {step > i ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
            </div>
            <div className="text-right hidden sm:block">
              <p className={`font-cairo text-xs ${step >= i ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                خطوة {i + 1}
              </p>
              <p className="font-cairo text-sm font-medium">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 0: Customer Info */}
          {step === 0 && (
            <div className="bg-card border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b">
                <User className="w-5 h-5 text-primary" />
                <h2 className="font-cairo font-bold text-lg">معلومات العميل</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="font-cairo text-sm font-semibold">الاسم الكامل *</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم العميل" className="mt-1.5 font-cairo h-11" />
                </div>
                <div>
                  <Label className="font-cairo text-sm font-semibold">رقم الهاتف *</Label>
                  <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="05XXXXXXXX" className="mt-1.5 font-roboto h-11" dir="ltr" />
                </div>
                <div>
                  <Label className="font-cairo text-sm font-semibold">الولاية</Label>
                  <Select value={selectedWilayaId} onValueChange={(v) => { setSelectedWilayaId(v); setSelectedBaladiya(''); }}>
                    <SelectTrigger className="mt-1.5 font-cairo h-11"><SelectValue placeholder="اختر الولاية" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {wilayas?.map(w => (
                        <SelectItem key={w.id} value={w.id} className="font-cairo">{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-cairo text-sm font-semibold">البلدية</Label>
                  <Select value={selectedBaladiya} onValueChange={setSelectedBaladiya} disabled={!selectedWilayaId}>
                    <SelectTrigger className="mt-1.5 font-cairo h-11"><SelectValue placeholder="اختر البلدية" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {baladiyat.map(b => (
                        <SelectItem key={b} value={b} className="font-cairo">{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-cairo text-sm font-semibold">نوع التوصيل</Label>
                <RadioGroup value={deliveryType} onValueChange={setDeliveryType} className="flex gap-4">
                  <div className={`flex-1 flex items-center gap-3 border-2 rounded-xl p-4 cursor-pointer transition-all ${deliveryType === 'office' ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setDeliveryType('office')}>
                    <RadioGroupItem value="office" id="office-r" />
                    <div>
                      <Label htmlFor="office-r" className="font-cairo text-sm font-semibold cursor-pointer">مكتب (بريد)</Label>
                      {selectedWilaya && <p className="font-roboto text-xs text-muted-foreground">{formatPrice(Number(selectedWilaya.shipping_price))}</p>}
                    </div>
                  </div>
                  <div className={`flex-1 flex items-center gap-3 border-2 rounded-xl p-4 cursor-pointer transition-all ${deliveryType === 'home' ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setDeliveryType('home')}>
                    <RadioGroupItem value="home" id="home-r" />
                    <div>
                      <Label htmlFor="home-r" className="font-cairo text-sm font-semibold cursor-pointer">توصيل للمنزل</Label>
                      {selectedWilaya && <p className="font-roboto text-xs text-muted-foreground">{formatPrice(Number(selectedWilaya.shipping_price_home))}</p>}
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {deliveryType === 'home' && (
                <div>
                  <Label className="font-cairo text-sm font-semibold">العنوان</Label>
                  <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="العنوان الكامل" className="mt-1.5 font-cairo" rows={2} />
                </div>
              )}

              <div>
                <Label className="font-cairo text-sm font-semibold">طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1.5 font-cairo h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod" className="font-cairo">الدفع عند الاستلام</SelectItem>
                    <SelectItem value="baridimob" className="font-cairo">بريدي موب</SelectItem>
                    <SelectItem value="flexy" className="font-cairo">فليكسي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep(1)} disabled={!canProceedStep0} className="font-cairo gap-2 h-11 px-8">
                  التالي: المنتجات
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Products */}
          {step === 1 && (
            <div className="bg-card border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="font-cairo font-bold text-lg">اختيار المنتجات</h2>
              </div>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="ابحث عن منتج..." className="pr-10 font-cairo h-11" />
              </div>

              <div className="max-h-[500px] overflow-y-auto border rounded-xl divide-y">
                {filteredProducts.map(product => {
                  const prodVariations = getProductVariations(product.id);
                  const prodVariantRows = getProductVariantRows(product.id);
                  const hasNewVariants = isNewVariantProduct(product);
                  const hasLegacyVariations = prodVariations.length > 0;
                  const hasAnyVariants = product.has_variants || hasNewVariants || hasLegacyVariations;

                  return (
                    <div key={product.id} className="p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.name} className="w-14 h-14 rounded-xl object-cover border flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-cairo text-sm font-semibold truncate">{product.name}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="font-roboto text-sm font-bold text-primary">{formatPrice(Number(product.price))}</span>
                            <span className={`font-cairo text-xs px-2 py-0.5 rounded-full ${(product.stock ?? 0) > 5 ? 'bg-primary/10 text-primary' : (product.stock ?? 0) > 0 ? 'bg-orange-500/10 text-orange-600' : 'bg-destructive/10 text-destructive'}`}>
                              {product.stock ?? 0} في المخزون
                            </span>
                            {hasAnyVariants && (
                              <span className="font-cairo text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                                يحتوي متغيرات
                              </span>
                            )}
                          </div>
                        </div>
                        {!hasAnyVariants && (
                          <Button size="sm" variant="outline" className="font-cairo text-xs h-9 gap-1 rounded-lg flex-shrink-0" onClick={() => addProduct(product)}>
                            <Plus className="w-3.5 h-3.5" /> أضف
                          </Button>
                        )}
                      </div>

                      {/* Legacy variations */}
                      {hasLegacyVariations && !hasNewVariants && (
                        <div className="mt-2 mr-[68px] flex flex-wrap gap-1">
                          {prodVariations.map(v => (
                            <Button key={v.id} size="sm" variant="outline" className="font-cairo text-[11px] h-7 px-2 rounded-lg" onClick={() => addProduct(product, v)}>
                              {v.variation_value} — {formatPrice(fastFixedPrice > 0 ? fastFixedPrice : Number(product.price) + Number(v.price_adjustment || 0))}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* New variant system */}
                      {hasNewVariants && (
                        <div className="mt-2 mr-0 sm:mr-[68px] space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {prodVariantRows.map(variant => {
                              const label = getVariantLabel(variant);
                              const isSelected = selectedVariantMap[product.id] === variant.id;
                              const variantPrice = fastFixedPrice > 0 ? fastFixedPrice : Number(variant.price || product.price);
                              return (
                                <Button
                                  key={variant.id}
                                  size="sm"
                                  variant={isSelected ? 'default' : 'outline'}
                                  className={`font-cairo text-[11px] h-auto py-1 px-2 rounded-lg`}
                                  onClick={() => {
                                    if (isSelected) {
                                      addProduct(product, { ...variant, variation_value: label, price_adjustment: Number(variant.price || 0) - Number(product.price) });
                                      setSelectedVariantMap(prev => { const n = { ...prev }; delete n[product.id]; return n; });
                                    } else {
                                      setSelectedVariantMap(prev => ({ ...prev, [product.id]: variant.id }));
                                    }
                                  }}
                                >
                                  <span className="block">{label}</span>
                                  <span className="block font-roboto font-bold mr-1">{formatPrice(variantPrice)}</span>
                                  {variant.quantity != null && <span className="block text-[10px] opacity-70">({variant.quantity})</span>}
                                </Button>
                              );
                            })}
                          </div>
                          {selectedVariantMap[product.id] && (
                            <p className="font-cairo text-xs text-primary animate-pulse">⬆ اضغط مرة أخرى لإضافة المتغير المحدد</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground font-cairo">لا توجد منتجات</p>
                )}
              </div>

              {/* Selected Items */}
              {orderItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-cairo text-sm font-bold text-foreground flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    المنتجات المختارة ({orderItems.length})
                  </h3>
                  <div className="space-y-2">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/40 rounded-xl p-3 border">
                        {item.image && <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover border" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-cairo text-sm font-medium truncate">{item.productName}</p>
                          <p className="font-roboto text-xs text-muted-foreground">{formatPrice(item.price)} × {item.quantity} = <span className="font-bold text-foreground">{formatPrice(item.price * item.quantity)}</span></p>
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(idx, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-roboto font-bold text-sm w-8 text-center">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(idx, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive rounded-lg" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(0)} className="font-cairo gap-2 h-11">
                  <ArrowRight className="w-4 h-4" /> السابق
                </Button>
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="font-cairo gap-2 h-11 px-8">
                  التالي: المراجعة
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Summary */}
          {step === 2 && (
            <div className="bg-card border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b">
                <CheckCircle className="w-5 h-5 text-primary" />
                <h2 className="font-cairo font-bold text-lg">مراجعة الطلب</h2>
              </div>

              {/* Customer Summary */}
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <h3 className="font-cairo font-semibold text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> العميل
                </h3>
                <div className="grid grid-cols-2 gap-2 font-cairo text-sm">
                  <div><span className="text-muted-foreground">الاسم:</span> {customerName}</div>
                  <div><span className="text-muted-foreground">الهاتف:</span> <span className="font-roboto">{customerPhone}</span></div>
                  {selectedWilaya && <div><span className="text-muted-foreground">الولاية:</span> {selectedWilaya.name}</div>}
                  {selectedBaladiya && <div><span className="text-muted-foreground">البلدية:</span> {selectedBaladiya}</div>}
                  <div><span className="text-muted-foreground">التوصيل:</span> {deliveryType === 'home' ? 'منزل' : 'مكتب'}</div>
                  <div><span className="text-muted-foreground">الدفع:</span> {paymentMethod === 'cod' ? 'عند الاستلام' : paymentMethod === 'baridimob' ? 'بريدي موب' : 'فليكسي'}</div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                <h3 className="font-cairo font-semibold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> المنتجات
                </h3>
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                    {item.image && <img src={item.image} alt="" className="w-10 h-10 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-cairo text-sm truncate">{item.productName}</p>
                    </div>
                    <span className="font-roboto text-sm">×{item.quantity}</span>
                    <span className="font-roboto font-bold text-sm">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="كود الخصم"
                    className="pr-10 font-cairo h-11"
                    disabled={!!appliedCoupon}
                  />
                </div>
                {appliedCoupon ? (
                  <Button variant="outline" className="font-cairo h-11" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>
                    إزالة
                  </Button>
                ) : (
                  <Button variant="outline" className="font-cairo h-11" onClick={applyCoupon} disabled={couponLoading}>
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تطبيق'}
                  </Button>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="font-cairo gap-2 h-11">
                  <ArrowRight className="w-4 h-4" /> السابق
                </Button>
                <Button
                  onClick={() => submitOrder.mutate()}
                  disabled={submitOrder.isPending}
                  className="font-cairo gap-2 h-12 px-10 text-base"
                >
                  {submitOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                  تأكيد الطلب
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Live Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-2xl p-5 sticky top-20 space-y-4">
            <h3 className="font-cairo font-bold text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              ملخص الطلب
            </h3>

            {orderItems.length === 0 ? (
              <p className="font-cairo text-sm text-muted-foreground text-center py-6">لم يتم اختيار منتجات بعد</p>
            ) : (
              <div className="space-y-2">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between font-cairo text-sm">
                    <span className="truncate flex-1">{item.productName} ×{item.quantity}</span>
                    <span className="font-roboto font-semibold mr-2">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            <hr />

            <div className="space-y-2 font-cairo text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="font-roboto font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">التوصيل</span>
                <span className="font-roboto font-semibold">{formatPrice(shippingCost)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>الخصم {appliedCoupon && `(${appliedCoupon.code})`}</span>
                  <span className="font-roboto font-semibold">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between font-bold text-base">
                <span>الإجمالي</span>
                <span className="font-roboto text-primary text-lg">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
