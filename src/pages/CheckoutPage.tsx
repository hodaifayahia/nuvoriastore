import { useState, useEffect } from 'react';
import { useFacebookPixel } from '@/hooks/useFacebookPixel';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/format';
import { calculateShippingForOrder, getShippingBreakdown } from '@/lib/shipping';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Upload, CheckCircle, LogIn, Truck, Building2, Home, X } from 'lucide-react';
import { parseFormConfig, type CheckoutFormConfig } from '@/components/admin/FormSettingsTab';
import { useTranslation } from '@/i18n';
import { useOrderGuard } from '@/lib/orderGuard';
import GuestLimitDialog from '@/components/GuestLimitDialog';
import { openWhatsAppOrder } from '@/lib/whatsappOrder';
import { Send } from 'lucide-react';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { trackEvent } = useFacebookPixel();
  const { t } = useTranslation();
  const orderGuard = useOrderGuard();

  // Facebook Pixel: InitiateCheckout
  useEffect(() => {
    if (items.length > 0) {
      trackEvent('InitiateCheckout', {
        content_ids: items.map(i => i.id),
        num_items: items.length,
        value: subtotal,
        currency: 'DZD',
      });
    }
  }, []); // fire once on mount

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilayaId, setWilayaId] = useState('');
  const [baladiyaName, setBaladiyaName] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [abandonedSaved, setAbandonedSaved] = useState(false);
  const [guestLimitOpen, setGuestLimitOpen] = useState(false);

  const DRAFT_KEY = 'checkout_draft';

  // Restore draft (e.g., after returning from sign-in)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.name) setName(d.name);
      if (d.phone) setPhone(d.phone);
      if (d.wilayaId) setWilayaId(d.wilayaId);
      if (d.baladiyaName) setBaladiyaName(d.baladiyaName);
      if (d.deliveryType) setDeliveryType(d.deliveryType);
      if (d.address) setAddress(d.address);
      if (d.paymentMethod) setPaymentMethod(d.paymentMethod);
      if (d.couponCode) setCouponCode(d.couponCode);
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, []);

  const saveDraftAndSignIn = () => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        name, phone, wilayaId, baladiyaName, deliveryType, address, paymentMethod, couponCode,
      }));
    } catch {}
    setGuestLimitOpen(false);
    navigate('/auth?redirect=%2Fcheckout');
  };


  const validatePhone = (v: string) => /^0[567]\d{8}$/.test(v);
  const validatePhoneInternational = (v: string) => /^\+?\d{7,15}$/.test(v.replace(/\s/g, ''));

  const handleBlurName = () => {
    setErrors(e => ({ ...e, name: name.trim() ? '' : t('checkout.err.nameRequired') }));
  };
  const handlePhoneChange = (v: string) => {
    setPhone(v);
    if (v && !validatePhone(v)) {
      setErrors(e => ({ ...e, phone: t('checkout.err.phoneInvalid') }));
    } else {
      setErrors(e => ({ ...e, phone: '' }));
    }
  };
  const handleWilayaChange = (v: string) => {
    setWilayaId(v);
    setBaladiyaName('');
    setDeliveryType('');
    setErrors(e => ({ ...e, wilaya: '' }));
  };

  // Receipt file preview
  const handleReceiptFile = (file: File | null) => {
    setReceiptFile(file);
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    } else {
      setReceiptPreview(null);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview(null);
  };

  const { data: wilayas } = useQuery({
    queryKey: ['wilayas'],
    queryFn: async () => {
      const { data } = await supabase.from('wilayas').select('*').eq('is_active', true).order('code', { ascending: true, nullsFirst: false });
      return data || [];
    },
  });

  useEffect(() => {
    if (items.length === 0 && !orderSubmitted) navigate('/cart');
  }, [items, navigate, orderSubmitted]);

  // Debounced abandoned cart capture
  useEffect(() => {
    if (orderSubmitted || submitting) return;
    if (name.trim().length < 2 || phone.length < 10 || items.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const cartSnapshot = items.map(item => ({
          product_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image || null,
          variant_id: item.variantId || null,
          variant_label: item.variantOptionValues ? Object.values(item.variantOptionValues).join(' / ') : item.variation?.value || null,
        }));
        const cartTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

        await supabase.rpc('upsert_abandoned_order', {
          p_name: name.trim(),
          p_phone: phone.trim(),
          p_wilaya: wilayas?.find(w => w.id === wilayaId)?.name || null,
          p_cart_items: cartSnapshot,
          p_cart_total: cartTotal,
          p_item_count: items.length,
        });
        setAbandonedSaved(true);
      } catch {}
    }, 5000);

    return () => clearTimeout(timer);
  }, [name, phone, items, wilayaId, orderSubmitted, submitting, wilayas]);

  const { data: baladiyat } = useQuery({
    queryKey: ['baladiyat', wilayaId],
    queryFn: async () => {
      const { data } = await supabase.from('baladiyat').select('*').eq('wilaya_id', wilayaId).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!wilayaId,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*');
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  // Fetch product types to determine if cart is digital-only
  const { data: productTypesMap } = useQuery({
    queryKey: ['product-types', items.map(i => i.id)],
    queryFn: async () => {
      if (items.length === 0) return new Map<string, string>();
      const { data } = await supabase
        .from('products')
        .select('id, product_type')
        .in('id', items.map(i => i.id));
      const map = new Map<string, string>();
      data?.forEach(p => map.set(p.id, (p as any).product_type || 'physical'));
      return map;
    },
    enabled: items.length > 0,
  });

  const isDigitalOnly = productTypesMap ? items.every(i => productTypesMap.get(i.id) === 'digital') : false;

  const { data: productShippingMap } = useQuery({
    queryKey: ['product-shipping', items.map(i => i.id)],
    queryFn: async () => {
      if (items.length === 0) return new Map<string, number>();
      const { data } = await supabase
        .from('products')
        .select('id, shipping_price')
        .in('id', items.map(i => i.id));
      const map = new Map<string, number>();
      data?.forEach(p => map.set(p.id, Number(p.shipping_price) || 0));
      return map;
    },
    enabled: items.length > 0,
  });

  const selectedWilaya = wilayas?.find(w => w.id === wilayaId);
  const formConfig = parseFormConfig(settings?.checkout_form_config);
  const wilayaBaseRate = selectedWilaya ? Number(selectedWilaya.shipping_price) : 0;
  const wilayaHomeRate = selectedWilaya ? Number(selectedWilaya.shipping_price_home) : 0;
  const shippingCost = isDigitalOnly ? 0 : (productShippingMap
    ? calculateShippingForOrder(items, productShippingMap, wilayaBaseRate, wilayaHomeRate, deliveryType)
    : 0);
  const shippingBreakdown = isDigitalOnly ? [] : (productShippingMap
    ? getShippingBreakdown(items, productShippingMap, wilayaBaseRate, wilayaHomeRate, deliveryType)
    : []);
  const total = subtotal - discount + shippingCost;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.trim())
      .eq('is_active', true)
      .single();
    if (!data) {
      toast({ title: t('checkout.err.title'), description: t('checkout.toast.invalidCoupon'), variant: 'destructive' });
      return;
    }
    if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
      toast({ title: t('checkout.err.title'), description: t('checkout.toast.expiredCoupon'), variant: 'destructive' });
      return;
    }

    const { data: couponProds } = await supabase
      .from('coupon_products')
      .select('product_id')
      .eq('coupon_id', data.id);

    let eligibleSubtotal = subtotal;
    if (couponProds && couponProds.length > 0) {
      const eligibleIds = new Set((couponProds as { product_id: string }[]).map(cp => cp.product_id));
      eligibleSubtotal = items
        .filter(item => eligibleIds.has(item.id))
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    const rawDiscount = data.discount_type === 'percentage'
      ? Math.round(eligibleSubtotal * Number(data.discount_value) / 100)
      : Number(data.discount_value);
    const discountVal = Math.min(rawDiscount, eligibleSubtotal);
    setDiscount(discountVal);
    setCouponApplied(true);
    toast({ title: t('checkout.toast.couponApplied'), description: t('checkout.toast.discountAmount').replace('{amount}', formatPrice(discountVal)) });
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (formConfig.name?.visible !== false && formConfig.name?.required !== false && !name.trim()) newErrors.name = t('checkout.err.nameRequired');
    if (isDigitalOnly) {
      if (!phone.trim() || !validatePhoneInternational(phone)) newErrors.phone = t('checkout.err.phoneInternational');
    } else {
      if (!phone.trim() || !validatePhone(phone)) newErrors.phone = t('checkout.err.phoneInvalid');
    }
    if (!isDigitalOnly && formConfig.wilaya?.visible !== false && formConfig.wilaya?.required !== false && !wilayaId) newErrors.wilaya = t('checkout.err.wilayaRequired');
    if (!paymentMethod) newErrors.payment = t('checkout.err.paymentRequired');
    if (!isDigitalOnly && formConfig.delivery_type?.visible !== false && formConfig.delivery_type?.required !== false && !deliveryType && wilayaId) newErrors.deliveryType = t('checkout.err.deliveryRequired');
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      toast({ title: t('checkout.err.title'), description: t('checkout.err.fillRequired'), variant: 'destructive' });
      return;
    }

    const receiptRequiredMethods = ['baridimob', 'flexy', 'binance', 'vodafone', 'redotpay'];
    if (receiptRequiredMethods.includes(paymentMethod) && !receiptFile) {
      toast({ title: t('checkout.err.title'), description: t('checkout.err.attachReceipt'), variant: 'destructive' });
      return;
    }

    const guard = await orderGuard.verify({ phone, userId: user?.id });
    if (!guard.ok) {
      if (guard.reason === 'guest_limit') {
        setGuestLimitOpen(true);
      } else {
        toast({ title: 'تعذر إرسال الطلب', description: guard.message, variant: 'destructive' });
      }
      return;
    }


    setSubmitting(true);
    try {
      let receiptUrl = '';
      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop();
        const filePath = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, receiptFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
        receiptUrl = urlData.publicUrl;
      }

      const orderItems = items.map(item => {
        const oi: any = {
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        };
        if (item.variantId) oi.variant_id = item.variantId;
        return oi;
      });

      const { data: rpcData, error } = await supabase.rpc('create_public_order', {
        p_order: {
          customer_name: name,
          customer_phone: phone,
          wilaya_id: isDigitalOnly ? null : (wilayaId || null),
          baladiya: isDigitalOnly ? null : (baladiyaName || null),
          delivery_type: isDigitalOnly ? 'digital' : (deliveryType || null),
          address: isDigitalOnly ? null : (address || null),
          subtotal,
          shipping_cost: shippingCost,
          total_amount: total,
          payment_method: paymentMethod,
          payment_receipt_url: receiptUrl || null,
          coupon_code: couponApplied ? couponCode : null,
          discount_amount: discount,
          user_id: user?.id || null,
        },
        p_items: orderItems,
      });
      if (error) throw error;
      const order = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      // Auto-resolve abandoned cart
      await supabase.rpc('mark_abandoned_recovered', { p_phone: phone.trim(), p_order_id: order.id });

      // Fire-and-forget Telegram notification for the new order.
      supabase.functions.invoke('telegram-notify', { body: { type: 'new_order', order_id: order.id } }).catch(() => {});


      setOrderSubmitted(true);
      clearCart();
      navigate(`/order-confirmation/${order.order_number}`);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('guest_order_limit_reached')) {
        setGuestLimitOpen(true);
      } else {
        toast({ title: t('checkout.err.title'), description: t('checkout.err.submitFailed'), variant: 'destructive' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('checkout.toast.copied') });
  };

  const baridimobEnabled = settings?.baridimob_enabled === 'true';
  const flexyEnabled = settings?.flexy_enabled === 'true';
  const codEnabled = settings?.cod_enabled === 'true';
  const binanceEnabled = settings?.binance_enabled === 'true';
  const vodafoneEnabled = settings?.vodafone_enabled === 'true';
  const redotpayEnabled = settings?.redotpay_enabled === 'true';
  const hasAnyPayment = baridimobEnabled || flexyEnabled || codEnabled || binanceEnabled || vodafoneEnabled || redotpayEnabled;

  return (
    <div className="container py-8 max-w-4xl">
      <GuestLimitDialog open={guestLimitOpen} onOpenChange={setGuestLimitOpen} onSignIn={saveDraftAndSignIn} />
      <h1 className="font-cairo font-bold text-3xl mb-8">{t('checkout.title')}</h1>


      {!user && (
        <Link to="/auth" className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 hover:bg-primary/10 transition-colors">
          <LogIn className="w-5 h-5 text-primary" />
          <span className="font-cairo text-sm text-foreground">{t('checkout.signInPrompt')}</span>
        </Link>
      )}

      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3 space-y-6">
          {/* Customer Info */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h2 className="font-cairo font-bold text-xl">{t('checkout.customerInfo')}</h2>
            <orderGuard.HoneypotField />
            {formConfig.name?.visible !== false && (
              <div>
                <Label className="font-cairo">{t('checkout.fullName')} {formConfig.name?.required !== false ? '*' : ''}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} onBlur={handleBlurName} placeholder={t('checkout.fullNamePlaceholder')} className={`font-cairo mt-1 ${errors.name ? 'border-destructive' : ''}`} />
                {errors.name && <p className="text-destructive text-xs font-cairo mt-1">{errors.name}</p>}
              </div>
            )}
            <div>
              <Label className="font-cairo">{t('checkout.phone')} *</Label>
              <Input value={phone} onChange={e => handlePhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" inputMode="numeric" maxLength={10} pattern="0[567][0-9]{8}" placeholder={t('checkout.phonePlaceholder')} className={`font-roboto mt-1 ${errors.phone ? 'border-destructive' : ''}`} dir="ltr" />
              {errors.phone && <p className="text-destructive text-xs font-cairo mt-1">{errors.phone}</p>}
            </div>
            {formConfig.wilaya?.visible !== false && !isDigitalOnly && (
              <div>
                <Label className="font-cairo">{t('checkout.wilaya')} {formConfig.wilaya?.required !== false ? '*' : ''}</Label>
                <Select value={wilayaId} onValueChange={handleWilayaChange}>
                  <SelectTrigger className={`font-cairo mt-1 ${errors.wilaya ? 'border-destructive' : ''}`}><SelectValue placeholder={t('checkout.selectWilaya')} /></SelectTrigger>
                  <SelectContent>
                    {wilayas?.map(w => (
                      <SelectItem key={w.id} value={w.id} className="font-cairo">
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.wilaya && <p className="text-destructive text-xs font-cairo mt-1">{errors.wilaya}</p>}
              </div>
            )}

            {/* Baladiya */}
            {formConfig.baladiya?.visible !== false && !isDigitalOnly && wilayaId && baladiyat && baladiyat.length > 0 && (
              <div>
                <Label className="font-cairo">{t('checkout.baladiya')} {formConfig.baladiya?.required ? '*' : ''}</Label>
                <Select value={baladiyaName} onValueChange={setBaladiyaName}>
                  <SelectTrigger className="font-cairo mt-1"><SelectValue placeholder={t('checkout.selectBaladiya')} /></SelectTrigger>
                  <SelectContent>
                    {baladiyat.map(b => (
                      <SelectItem key={b.id} value={b.name} className="font-cairo">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Delivery Type */}
            {formConfig.delivery_type?.visible !== false && !isDigitalOnly && wilayaId && selectedWilaya && (
              <div>
                <Label className="font-cairo">{t('checkout.deliveryType')} {formConfig.delivery_type?.required !== false ? '*' : ''}</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => { setDeliveryType('office'); setErrors(e => ({ ...e, deliveryType: '' })); }}
                    className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${deliveryType === 'office' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                  >
                    <Building2 className={`w-6 h-6 ${deliveryType === 'office' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-cairo font-semibold text-sm">{t('checkout.toOffice')}</span>
                    <span className="font-roboto font-bold text-primary text-sm">{formatPrice(Number(selectedWilaya.shipping_price))}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeliveryType('home'); setErrors(e => ({ ...e, deliveryType: '' })); }}
                    className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${deliveryType === 'home' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                  >
                    <Home className={`w-6 h-6 ${deliveryType === 'home' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-cairo font-semibold text-sm">{t('checkout.toHome')}</span>
                    <span className="font-roboto font-bold text-primary text-sm">{formatPrice(Number(selectedWilaya.shipping_price_home))}</span>
                  </button>
                </div>
                {errors.deliveryType && <p className="text-destructive text-xs font-cairo mt-1">{errors.deliveryType}</p>}
              </div>
            )}

            {formConfig.address?.visible !== false && !isDigitalOnly && (
              <div>
                <Label className="font-cairo">{t('checkout.address')} {formConfig.address?.required ? '*' : ''}</Label>
                <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder={formConfig.address?.required ? t('checkout.addressPlaceholder') : t('checkout.addressOptional')} className="font-cairo mt-1" />
              </div>
            )}
          </div>

          {/* Coupon */}
          {formConfig.coupon?.visible !== false && (
            <div className="bg-card border rounded-lg p-6">
              <h2 className="font-cairo font-bold text-xl mb-4">{t('checkout.couponTitle')}</h2>
              <div className="flex gap-2">
                <Input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder={t('checkout.couponPlaceholder')} className="font-cairo" disabled={couponApplied} />
                <Button onClick={applyCoupon} disabled={couponApplied} variant="outline" className="font-cairo shrink-0">
                  {couponApplied ? <><CheckCircle className="w-4 h-4 ml-1" /> {t('checkout.applied')}</> : t('checkout.apply')}
                </Button>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h2 className="font-cairo font-bold text-xl">{t('checkout.paymentMethod')}</h2>
            <div className="space-y-3">
              {!hasAnyPayment && settings && (
                <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground font-cairo">
                  {t('checkout.noPayment')}
                </div>
              )}
              {codEnabled && (
                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                  <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 accent-primary" />
                  <div className="flex-1">
                    <p className="font-cairo font-semibold flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      {t('checkout.cod')}
                    </p>
                    <p className="font-cairo text-xs text-muted-foreground mt-1">{t('checkout.codDesc')}</p>
                  </div>
                </label>
              )}
              {baridimobEnabled && (
                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'baridimob' ? 'border-primary bg-accent' : ''}`}>
                  <input type="radio" name="payment" value="baridimob" checked={paymentMethod === 'baridimob'} onChange={e => setPaymentMethod(e.target.value)} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-cairo font-semibold">{t('checkout.baridimob')}</p>
                    {paymentMethod === 'baridimob' && settings && (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2 bg-muted p-2 rounded">
                          <span className="font-cairo">{t('checkout.accountNumber')}</span>
                          <span className="font-roboto font-bold">{settings.ccp_number}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(settings.ccp_number)}><Copy className="w-3 h-3" /></Button>
                        </div>
                        <p className="font-cairo">{t('checkout.name')} {settings.ccp_name}</p>
                        <p className="font-cairo">{t('checkout.amount')} <span className="font-roboto font-bold">{formatPrice(total)}</span></p>
                        <div className="mt-2">
                          <Label className="font-cairo text-xs">{t('checkout.attachReceipt')}</Label>
                          <Input type="file" accept="image/*,.pdf" onChange={e => handleReceiptFile(e.target.files?.[0] || null)} className="mt-1" />
                          {receiptPreview && (
                            <div className="relative mt-2 inline-block">
                              <img src={receiptPreview} alt="" className="w-32 h-32 object-cover rounded-lg border" />
                              <button onClick={removeReceipt} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                          {receiptFile && !receiptPreview && (
                            <div className="flex items-center gap-2 mt-2 text-sm font-cairo text-muted-foreground">
                              <Upload className="w-4 h-4" /> {receiptFile.name}
                              <button onClick={removeReceipt} className="text-destructive"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              )}
              {flexyEnabled && (
                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'flexy' ? 'border-primary bg-accent' : ''}`}>
                  <input type="radio" name="payment" value="flexy" checked={paymentMethod === 'flexy'} onChange={e => setPaymentMethod(e.target.value)} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-cairo font-semibold">{t('checkout.flexy')}</p>
                    {paymentMethod === 'flexy' && settings && (
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="font-cairo">{t('checkout.flexyMsg')} <span className="font-roboto font-bold">{formatPrice(Number(settings.flexy_deposit_amount || 500))}</span> {t('checkout.flexyTo')}</p>
                        <div className="flex items-center gap-2 bg-muted p-2 rounded">
                          <span className="font-roboto font-bold">{settings.flexy_number}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(settings.flexy_number)}><Copy className="w-3 h-3" /></Button>
                        </div>
                        <p className="font-cairo">{t('checkout.flexyRemaining')} <span className="font-roboto font-bold">{formatPrice(total - Number(settings.flexy_deposit_amount || 500))}</span></p>
                        <div className="mt-2">
                          <Label className="font-cairo text-xs">{t('checkout.attachScreenshot')}</Label>
                          <Input type="file" accept="image/*" onChange={e => handleReceiptFile(e.target.files?.[0] || null)} className="mt-1" />
                          {receiptPreview && (
                            <div className="relative mt-2 inline-block">
                              <img src={receiptPreview} alt="" className="w-32 h-32 object-cover rounded-lg border" />
                              <button onClick={removeReceipt} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                          {receiptFile && !receiptPreview && (
                            <div className="flex items-center gap-2 mt-2 text-sm font-cairo text-muted-foreground">
                              <Upload className="w-4 h-4" /> {receiptFile.name}
                              <button onClick={removeReceipt} className="text-destructive"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              )}
              {/* Binance Pay */}
              {binanceEnabled && (
                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'binance' ? 'border-primary bg-accent' : ''}`}>
                  <input type="radio" name="payment" value="binance" checked={paymentMethod === 'binance'} onChange={e => setPaymentMethod(e.target.value)} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-cairo font-semibold">{t('checkout.binance')}</p>
                    {paymentMethod === 'binance' && settings && (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2 bg-muted p-2 rounded">
                          <span className="font-cairo">{t('checkout.address_')}</span>
                          <span className="font-roboto font-bold text-xs break-all">{settings.binance_address}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(settings.binance_address)}><Copy className="w-3 h-3" /></Button>
                        </div>
                        <p className="font-cairo">{t('checkout.amount')} <span className="font-roboto font-bold">{formatPrice(total)}</span></p>
                        <div className="mt-2">
                          <Label className="font-cairo text-xs">{t('checkout.attachReceipt')}</Label>
                          <Input type="file" accept="image/*,.pdf" onChange={e => handleReceiptFile(e.target.files?.[0] || null)} className="mt-1" />
                          {receiptPreview && (<div className="relative mt-2 inline-block"><img src={receiptPreview} alt="" className="w-32 h-32 object-cover rounded-lg border" /><button onClick={removeReceipt} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button></div>)}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              )}
              {/* Vodafone Cash */}
              {vodafoneEnabled && (
                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'vodafone' ? 'border-primary bg-accent' : ''}`}>
                  <input type="radio" name="payment" value="vodafone" checked={paymentMethod === 'vodafone'} onChange={e => setPaymentMethod(e.target.value)} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-cairo font-semibold">{t('checkout.vodafone')}</p>
                    {paymentMethod === 'vodafone' && settings && (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2 bg-muted p-2 rounded">
                          <span className="font-cairo">{t('checkout.number')}</span>
                          <span className="font-roboto font-bold">{settings.vodafone_number}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(settings.vodafone_number)}><Copy className="w-3 h-3" /></Button>
                        </div>
                        <div className="mt-2">
                          <Label className="font-cairo text-xs">{t('checkout.attachReceipt')}</Label>
                          <Input type="file" accept="image/*,.pdf" onChange={e => handleReceiptFile(e.target.files?.[0] || null)} className="mt-1" />
                          {receiptPreview && (<div className="relative mt-2 inline-block"><img src={receiptPreview} alt="" className="w-32 h-32 object-cover rounded-lg border" /><button onClick={removeReceipt} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button></div>)}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              )}
              {/* Redotpay */}
              {redotpayEnabled && (
                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'redotpay' ? 'border-primary bg-accent' : ''}`}>
                  <input type="radio" name="payment" value="redotpay" checked={paymentMethod === 'redotpay'} onChange={e => setPaymentMethod(e.target.value)} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-cairo font-semibold">{t('checkout.redotpay')}</p>
                    {paymentMethod === 'redotpay' && settings && (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2 bg-muted p-2 rounded">
                          <span className="font-cairo">{t('checkout.address_')}</span>
                          <span className="font-roboto font-bold text-xs break-all">{settings.redotpay_address}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(settings.redotpay_address)}><Copy className="w-3 h-3" /></Button>
                        </div>
                        <div className="mt-2">
                          <Label className="font-cairo text-xs">{t('checkout.attachReceipt')}</Label>
                          <Input type="file" accept="image/*,.pdf" onChange={e => handleReceiptFile(e.target.files?.[0] || null)} className="mt-1" />
                          {receiptPreview && (<div className="relative mt-2 inline-block"><img src={receiptPreview} alt="" className="w-32 h-32 object-cover rounded-lg border" /><button onClick={removeReceipt} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button></div>)}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="md:col-span-2">
          <div className="bg-card border rounded-lg p-6 sticky top-20 space-y-3">
            <h2 className="font-cairo font-bold text-xl mb-4">{t('checkout.summaryTitle')}</h2>
            {items.map((item, idx) => (
              <div key={`${item.id}-${item.variantId || item.variation?.value || ''}-${idx}`} className="flex justify-between text-sm font-cairo">
                <span>
                  {item.name} {item.variantOptionValues ? `(${Object.values(item.variantOptionValues).join(' / ')})` : item.variation ? `(${item.variation.value})` : ''} ×{item.quantity}
                </span>
                <span className="font-roboto">{formatPrice((item.price + (item.variation?.priceAdjustment || 0)) * item.quantity)}</span>
              </div>
            ))}
            <hr className="my-3" />
            <div className="flex justify-between font-cairo text-sm">
              <span>{t('cart.subtotal')}</span>
              <span className="font-roboto font-bold">{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-cairo text-sm text-success">
                <span>{t('checkout.discount')}</span>
                <span className="font-roboto font-bold">-{formatPrice(discount)}</span>
              </div>
            )}
            {/* Shipping breakdown */}
            <div className="space-y-1">
              <div className="flex justify-between font-cairo text-sm">
                <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {t('cart.delivery')} {deliveryType === 'home' ? t('checkout.deliveryHome') : deliveryType === 'office' ? t('checkout.deliveryOffice') : ''}</span>
                <span className="font-roboto font-bold">{shippingCost > 0 ? formatPrice(shippingCost) : '—'}</span>
              </div>
              {shippingBreakdown.length > 1 && shippingCost > 0 && (
                <div className="pr-5 space-y-0.5">
                  {shippingBreakdown.map(s => (
                    <div key={s.itemId} className="flex justify-between text-xs text-muted-foreground font-cairo">
                      <span>{s.name} ×{s.quantity}</span>
                      <span className="font-roboto">{formatPrice(s.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              {shippingCost > 0 && (
                <p className="text-[11px] text-muted-foreground font-cairo pr-1">{t('checkout.perItemNote')}</p>
              )}
            </div>
            <hr className="my-3" />
            <div className="flex justify-between font-cairo font-bold text-lg">
              <span>{t('checkout.total')}</span>
              <span className="font-roboto text-primary">{formatPrice(total)}</span>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full font-cairo font-semibold mt-4">
              {submitting ? t('checkout.submitting') : t('checkout.confirmOrder')}
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const res = await openWhatsAppOrder({
                  customer_name: name,
                  customer_phone: phone,
                  wilaya_name: selectedWilaya?.name,
                  baladiya: baladiyaName,
                  address,
                  delivery_type: isDigitalOnly ? 'digital' : deliveryType,
                  payment_method: paymentMethod,
                  items: items.map(i => ({ name: i.name, quantity: i.quantity, unit_price: i.price })),
                  subtotal,
                  shipping_cost: shippingCost,
                  discount,
                  coupon_code: couponApplied ? couponCode : undefined,
                  total,
                });
                if (!res.ok) toast({ title: 'واتساب غير مُفعّل', description: 'يرجى إضافة رقم واتساب من الإعدادات', variant: 'destructive' });
              }}
              className="w-full font-cairo font-semibold mt-2 gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white shadow-md shadow-[#25D366]/30"
            >
              <Send className="w-4 h-4" />
              اطلب عبر واتساب
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
