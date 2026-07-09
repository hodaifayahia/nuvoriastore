import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';
import { Search, Plus, Minus, Trash2, ShoppingCart, Tag, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ALGERIA_WILAYAS } from '@/data/algeria-wilayas';

interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  variationId?: string;
  variationLabel?: string;
  image?: string;
}

interface ManualOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManualOrderDialog({ open, onOpenChange }: ManualOrderDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Customer fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedWilayaId, setSelectedWilayaId] = useState('');
  const [selectedBaladiya, setSelectedBaladiya] = useState('');
  const [deliveryType, setDeliveryType] = useState('office');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  // Product selection
  const [productSearch, setProductSearch] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  // Track which product is expanded (for variant selection)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  // Track selected options per product for the new variant system
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, string>>>({});

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Queries
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

  // Legacy variations
  const { data: variations } = useQuery({
    queryKey: ['variations-for-order'],
    queryFn: async () => {
      const { data } = await supabase.from('product_variations').select('*').eq('is_active', true);
      return data || [];
    },
  });

  // New variant system: option groups with their values
  const { data: optionGroups } = useQuery({
    queryKey: ['option-groups-for-order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_option_groups')
        .select('*, product_option_values(*)');
      if (error) console.error(error);
      return data || [];
    },
  });

  // New variant system: product variants
  const { data: productVariants } = useQuery({
    queryKey: ['product-variants-for-order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('is_active', true);
      if (error) console.error(error);
      return data || [];
    },
  });

  // Computed
  const selectedWilaya = wilayas?.find(w => w.id === selectedWilayaId);
  const wilayaName = selectedWilaya?.name || '';

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

  // Get legacy variations for a product
  const getProductVariations = (productId: string) => {
    return variations?.filter(v => v.product_id === productId) || [];
  };

  // Get new-system option groups for a product
  const getProductOptionGroups = (productId: string) => {
    return optionGroups?.filter(g => g.product_id === productId) || [];
  };

  // Get new-system variants for a product
  const getProductVariants = (productId: string) => {
    return productVariants?.filter(v => v.product_id === productId) || [];
  };

  // Match selected options to a variant
  const findMatchingVariant = (productId: string, opts: Record<string, string>) => {
    const groups = getProductOptionGroups(productId);
    const variants = getProductVariants(productId);
    if (Object.keys(opts).length < groups.length) return null;
    return variants.find(v => {
      const ov = v.option_values as Record<string, string>;
      return groups.every(g => ov[g.name] === opts[g.name]);
    }) || null;
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

  // Add product to order
  const addProduct = (product: any, variation?: any, variant?: any) => {
    const varId = variant?.id || variation?.id || undefined;
    const existingIndex = orderItems.findIndex(
      i => i.productId === product.id && i.variationId === varId
    );

    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity++;
      setOrderItems(updated);
      return;
    }

    let price: number;
    let label = '';
    if (variant) {
      // New variant system
      price = Number(variant.price);
      const ov = variant.option_values as Record<string, string>;
      label = Object.values(ov).join(' / ');
    } else if (variation) {
      // Legacy variation system
      price = Number(product.price) + Number(variation.price_adjustment || 0);
      label = variation.variation_value;
    } else {
      price = Number(product.price);
    }

    setOrderItems(prev => [...prev, {
      productId: product.id,
      productName: product.name + (label ? ` (${label})` : ''),
      price,
      quantity: 1,
      variationId: varId,
      variationLabel: label || undefined,
      image: variant?.image_url || product.images?.[0],
    }]);

    // Collapse after adding
    setExpandedProductId(null);
    setSelectedOptions(prev => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
  };

  // Add variant product (new system) with option validation
  const addVariantProduct = (product: any) => {
    const groups = getProductOptionGroups(product.id);
    const opts = selectedOptions[product.id] || {};

    if (Object.keys(opts).length < groups.length) {
      toast({ title: 'يرجى اختيار جميع الخيارات أولاً', variant: 'destructive' });
      return;
    }

    const matchedVariant = findMatchingVariant(product.id, opts);
    if (!matchedVariant) {
      toast({ title: 'هذا الخيار غير متوفر', variant: 'destructive' });
      return;
    }

    addProduct(product, undefined, matchedVariant);
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...orderItems];
    updated[index].quantity = Math.max(1, updated[index].quantity + delta);
    setOrderItems(updated);
  };

  const removeItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  // Apply coupon
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
      toast({ title: 'تم تطبيق كود الخصم بنجاح' });
    } catch {
      toast({ title: 'خطأ في التحقق من الكود', variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  };

  // Submit order
  const submitOrder = useMutation({
    mutationFn: async () => {
      if (!customerName.trim()) throw new Error('اسم العميل مطلوب');
      if (!customerPhone.trim()) throw new Error('رقم الهاتف مطلوب');
      if (orderItems.length === 0) throw new Error('أضف منتج واحد على الأقل');

      // Generate order number
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

      // Insert order
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

      // Insert order items
      const items = orderItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        variant_id: item.variationId || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(items);
      if (itemsError) throw itemsError;

      // Deduct stock properly
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
      toast({ title: `تم إنشاء الطلب ${order.order_number} بنجاح` });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: error.message || 'حدث خطأ', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setSelectedWilayaId('');
    setSelectedBaladiya('');
    setDeliveryType('office');
    setAddress('');
    setPaymentMethod('cod');
    setProductSearch('');
    setOrderItems([]);
    setCouponCode('');
    setAppliedCoupon(null);
    setExpandedProductId(null);
    setSelectedOptions({});
  };

  // Render product row in list
  const renderProductRow = (product: any) => {
    const legacyVars = getProductVariations(product.id);
    const newGroups = getProductOptionGroups(product.id);
    const hasNewVariants = newGroups.length > 0;
    const hasLegacyVariations = !hasNewVariants && legacyVars.length > 0;
    const hasAnyVariation = hasNewVariants || hasLegacyVariations;
    const isExpanded = expandedProductId === product.id;

    return (
      <div key={product.id} className="border-b last:border-b-0">
        <div className="p-2.5 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            {product.images?.[0] && (
              <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded object-cover border flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-cairo text-sm font-medium truncate">{product.name}</p>
              <p className="font-roboto text-xs text-muted-foreground">
                {formatPrice(Number(product.price))} · المخزون: {product.stock || 0}
              </p>
            </div>

            {/* No variations: simple add button */}
            {!hasAnyVariation && (
              <Button size="sm" variant="outline" className="font-cairo text-xs h-7" onClick={() => addProduct(product)}>
                <Plus className="w-3 h-3 ml-1" /> أضف
              </Button>
            )}

            {/* Has legacy variations: show inline buttons */}
            {hasLegacyVariations && (
              <div className="flex flex-wrap gap-1">
                {legacyVars.map(v => (
                  <Button key={v.id} size="sm" variant="outline" className="font-cairo text-[10px] h-6 px-2" onClick={() => addProduct(product, v)}>
                    {v.variation_value}
                  </Button>
                ))}
              </div>
            )}

            {/* Has new variant system: toggle expand */}
            {hasNewVariants && (
              <Button
                size="sm"
                variant={isExpanded ? "default" : "outline"}
                className="font-cairo text-xs h-7 gap-1"
                onClick={() => {
                  setExpandedProductId(isExpanded ? null : product.id);
                  if (!isExpanded) {
                    // Reset selection for this product
                    setSelectedOptions(prev => ({ ...prev, [product.id]: {} }));
                  }
                }}
              >
                اختر الخيارات
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded variant selection for new system */}
        {hasNewVariants && isExpanded && (
          <div className="px-3 pb-3 bg-muted/20 border-t space-y-3 pt-3">
            {newGroups
              .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
              .map((group: any) => {
                const values = (group.product_option_values || []).sort(
                  (a: any, b: any) => (a.position || 0) - (b.position || 0)
                );
                const currentSelection = selectedOptions[product.id]?.[group.name];

                return (
                  <div key={group.id}>
                    <Label className="font-cairo text-xs font-semibold mb-1.5 block">
                      {group.name} <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {values.map((val: any) => {
                        const isSelected = currentSelection === val.label;
                        const isColor = group.display_type === 'color';

                        return (
                          <button
                            key={val.id}
                            type="button"
                            onClick={() => {
                              setSelectedOptions(prev => ({
                                ...prev,
                                [product.id]: {
                                  ...(prev[product.id] || {}),
                                  [group.name]: val.label,
                                },
                              }));
                            }}
                            className={`
                              transition-all duration-150 font-cairo
                              ${isColor
                                ? `w-8 h-8 rounded-full border-2 ${isSelected ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-border hover:border-primary/50'}`
                                : `px-3 py-1.5 rounded-md text-xs border ${isSelected ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50'}`
                              }
                            `}
                            style={isColor ? { backgroundColor: val.color_hex || '#888' } : undefined}
                            title={val.label}
                          >
                            {!isColor && val.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {/* Show matched variant price & add button */}
            {(() => {
              const opts = selectedOptions[product.id] || {};
              const allSelected = Object.keys(opts).length >= newGroups.length;
              const matchedVariant = allSelected ? findMatchingVariant(product.id, opts) : null;

              return (
                <div className="flex items-center justify-between pt-2 border-t border-dashed">
                  <div className="font-cairo text-sm">
                    {allSelected && matchedVariant ? (
                      <span className="font-bold text-primary">{formatPrice(Number(matchedVariant.price))}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">اختر جميع الخيارات لعرض السعر</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="font-cairo text-xs h-8 gap-1"
                    disabled={!allSelected || !matchedVariant}
                    onClick={() => addVariantProduct(product)}
                  >
                    <Plus className="w-3 h-3" /> إضافة للطلب
                  </Button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cairo text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            إنشاء طلب يدوي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="font-cairo font-semibold text-sm border-b pb-2">معلومات العميل</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="font-cairo text-xs">الاسم الكامل *</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم العميل" className="mt-1 font-cairo" />
              </div>
              <div>
                <Label className="font-cairo text-xs">رقم الهاتف *</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="05XXXXXXXX" className="mt-1 font-roboto" dir="ltr" />
              </div>
              <div>
                <Label className="font-cairo text-xs">الولاية</Label>
                <Select value={selectedWilayaId} onValueChange={(v) => { setSelectedWilayaId(v); setSelectedBaladiya(''); }}>
                  <SelectTrigger className="mt-1 font-cairo"><SelectValue placeholder="اختر الولاية" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {wilayas?.map(w => (
                      <SelectItem key={w.id} value={w.id} className="font-cairo">{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-cairo text-xs">البلدية</Label>
                <Select value={selectedBaladiya} onValueChange={setSelectedBaladiya} disabled={!selectedWilayaId}>
                  <SelectTrigger className="mt-1 font-cairo"><SelectValue placeholder="اختر البلدية" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {baladiyat.map(b => (
                      <SelectItem key={b} value={b} className="font-cairo">{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-cairo text-xs">نوع التوصيل</Label>
              <RadioGroup value={deliveryType} onValueChange={setDeliveryType} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="office" id="office" />
                  <Label htmlFor="office" className="font-cairo text-sm cursor-pointer">مكتب (بريد)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="home" id="home" />
                  <Label htmlFor="home" className="font-cairo text-sm cursor-pointer">توصيل للمنزل</Label>
                </div>
              </RadioGroup>
            </div>

            {deliveryType === 'home' && (
              <div>
                <Label className="font-cairo text-xs">العنوان</Label>
                <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="العنوان الكامل" className="mt-1 font-cairo" rows={2} />
              </div>
            )}

            <div>
              <Label className="font-cairo text-xs">طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1 font-cairo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod" className="font-cairo">الدفع عند الاستلام</SelectItem>
                  <SelectItem value="baridimob" className="font-cairo">بريدي موب</SelectItem>
                  <SelectItem value="flexy" className="font-cairo">فليكسي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-3">
            <h3 className="font-cairo font-semibold text-sm border-b pb-2">المنتجات</h3>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="ابحث عن منتج..." className="pr-10 font-cairo" />
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {filteredProducts.map(product => renderProductRow(product))}
              {filteredProducts.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground font-cairo">لا توجد منتجات</p>
              )}
            </div>

            {/* Selected Items */}
            {orderItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-cairo text-xs font-semibold text-muted-foreground">المنتجات المختارة ({orderItems.length})</h4>
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                    {item.image && <img src={item.image} alt="" className="w-8 h-8 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-cairo text-xs truncate">{item.productName}</p>
                      <p className="font-roboto text-[10px] text-muted-foreground">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(idx, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="font-roboto text-sm w-6 text-center">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(idx, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="font-roboto text-xs font-medium w-16 text-left">{formatPrice(item.price * item.quantity)}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coupon */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="font-cairo text-xs">كود الخصم</Label>
              <div className="flex gap-2 mt-1">
                <Input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="أدخل كود الخصم" className="font-roboto" disabled={!!appliedCoupon} />
                {appliedCoupon ? (
                  <Button variant="outline" size="sm" className="font-cairo" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>
                    <X className="w-3 h-3 ml-1" /> إزالة
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="font-cairo" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                    {couponLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3 ml-1" />}
                    تطبيق
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-cairo font-semibold text-sm">ملخص الطلب</h3>
            <div className="flex justify-between font-cairo text-sm">
              <span>المجموع الفرعي</span>
              <span className="font-roboto">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between font-cairo text-sm">
              <span>الشحن {selectedWilaya ? `(${selectedWilaya.name})` : ''}</span>
              <span className="font-roboto">{formatPrice(shippingCost)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between font-cairo text-sm text-primary">
                <span>الخصم ({appliedCoupon?.code})</span>
                <span className="font-roboto">-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <hr />
            <div className="flex justify-between font-cairo font-bold text-base">
              <span>الإجمالي</span>
              <span className="font-roboto text-primary">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full font-cairo gap-2"
            size="lg"
            onClick={() => submitOrder.mutate()}
            disabled={submitOrder.isPending || orderItems.length === 0 || !customerName.trim() || !customerPhone.trim()}
          >
            {submitOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            إنشاء الطلب
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
