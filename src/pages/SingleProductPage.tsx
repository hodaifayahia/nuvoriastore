import SEO from '@/components/SEO';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ShoppingCart, Minus, Plus, ChevronRight, ChevronLeft, ArrowRight, Star, Send, Loader2, Copy, Truck, CheckCircle, Upload, User, MapPin, CreditCard, Building2, Home, X, Tag, Shield, ShieldCheck, Zap, RotateCcw, Clock, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart, type CartItemVariation } from '@/contexts/CartContext';
import { formatPrice, formatDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useFacebookPixel } from '@/hooks/useFacebookPixel';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import RecentlyViewedSection from '@/components/RecentlyViewedSection';
import { useTranslation } from '@/i18n';

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" disabled={readonly} onClick={() => onChange?.(i)}
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}>
          <Star className={`w-5 h-5 ${i <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );
}

function CountdownTimer({ endsAt, title }: { endsAt: string; title?: string }) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const end = new Date(endsAt).getTime();
      const diff = end - now;
      if (diff <= 0) { setExpired(true); return; }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (expired) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-red-500 via-orange-500 to-amber-500 p-[2px]">
      <div className="rounded-[14px] bg-gradient-to-l from-red-500/10 via-orange-500/10 to-amber-500/10 backdrop-blur-sm px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
              <Clock className="w-4 h-4 text-red-500" />
            </div>
            {title && <span className="font-cairo font-bold text-sm text-foreground">{title}</span>}
          </div>
          <div className="flex gap-2">
            {[
              { value: timeLeft.days, label: t('product.days') },
              { value: timeLeft.hours, label: t('product.hours') },
              { value: timeLeft.minutes, label: t('product.minutes') },
              { value: timeLeft.seconds, label: t('product.seconds') },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-foreground/10 backdrop-blur-sm flex items-center justify-center border border-foreground/10">
                  <span className="font-roboto font-bold text-lg text-foreground">{String(item.value).padStart(2, '0')}</span>
                </div>
                <span className="font-cairo text-[10px] text-muted-foreground mt-1">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SingleProductPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { trackEvent } = useFacebookPixel();
  const { addItem: addRecentlyViewed } = useRecentlyViewed();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const orderFormRef = useRef<HTMLDivElement>(null);

  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const [orderName, setOrderName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderWilayaId, setOrderWilayaId] = useState('');
  const [orderBaladiya, setOrderBaladiya] = useState('');
  const [orderDeliveryType, setOrderDeliveryType] = useState('');
  const [orderAddress, setOrderAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  // Touch swipe for images
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]);

  // Sticky bar IntersectionObserver
  useEffect(() => {
    const el = orderFormRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleReceiptFile = (file: File | null) => {
    setReceiptFile(file);
    if (file && file.type.startsWith('image/')) {
      setReceiptPreview(URL.createObjectURL(file));
    } else {
      setReceiptPreview(null);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview(null);
  };

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('reviews').select('*').eq('product_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: wilayas } = useQuery({
    queryKey: ['wilayas'],
    queryFn: async () => {
      const { data } = await supabase.from('wilayas').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: baladiyat } = useQuery({
    queryKey: ['baladiyat', orderWilayaId],
    queryFn: async () => {
      const { data } = await supabase.from('baladiyat').select('*').eq('wilaya_id', orderWilayaId).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!orderWilayaId,
  });

  const { data: optionGroups } = useQuery({
    queryKey: ['product-option-groups', id],
    queryFn: async () => {
      const { data: groups } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', id!)
        .order('position');
      if (!groups || groups.length === 0) return [];
      const { data: values } = await supabase
        .from('product_option_values')
        .select('*')
        .in('option_group_id', groups.map((g: any) => g.id))
        .order('position');
      return groups.map((g: any) => ({
        ...g,
        values: (values || []).filter((v: any) => v.option_group_id === g.id),
      }));
    },
    enabled: !!id,
  });

  const { data: productVariants } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', id!)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: variations } = useQuery({
    queryKey: ['product-variations', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_variations').select('*').eq('product_id', id!).eq('is_active', true).order('variation_type');
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: variationOptions } = useQuery({
    queryKey: ['variation-options'],
    queryFn: async () => {
      const { data } = await supabase.from('variation_options').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const { data: bundleOffers } = useQuery({
    queryKey: ['product-offers', id],
    queryFn: async () => {
      const { data } = await supabase.from('product_offers').select('*').eq('product_id', id!).order('position');
      return data || [];
    },
    enabled: !!id,
  });

  const getColorCode = (type: string, value: string) => {
    if (!variationOptions) return null;
    const opt = variationOptions.find(o => o.variation_type === type && o.variation_value === value);
    return opt?.color_code || null;
  };

  const isColorType = (type: string) => {
    const t = type.toLowerCase();
    return t.includes('لون') || t.includes('color') || t.includes('colour');
  };

  const hasNewVariants = (optionGroups || []).length > 0 && (productVariants || []).length > 0;

  const variationGroups = useMemo(() => {
    if (hasNewVariants || !variations || variations.length === 0) return {};
    const groups: Record<string, typeof variations> = {};
    variations.forEach(v => {
      if (!groups[v.variation_type]) groups[v.variation_type] = [];
      groups[v.variation_type].push(v);
    });
    return groups;
  }, [variations, hasNewVariants]);

  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [selectedNewOptions, setSelectedNewOptions] = useState<Record<string, string>>({});

  const matchedVariant = useMemo(() => {
    if (!hasNewVariants || !productVariants) return null;
    const groupCount = (optionGroups || []).length;
    if (Object.keys(selectedNewOptions).length < groupCount) return null;
    return productVariants.find((v: any) => {
      const ov = v.option_values || {};
      return Object.entries(selectedNewOptions).every(([key, val]) => ov[key] === val);
    }) || null;
  }, [selectedNewOptions, productVariants, optionGroups, hasNewVariants]);

  const isOptionValueAvailable = (groupName: string, valueLabel: string) => {
    if (!productVariants) return true;
    const testSelection = { ...selectedNewOptions, [groupName]: valueLabel };
    return productVariants.some((v: any) => {
      const ov = v.option_values || {};
      return Object.entries(testSelection).every(([key, val]) => ov[key] === val) && (v.quantity > 0);
    });
  };

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*');
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('reviews').insert({
        product_id: id!,
        reviewer_name: reviewName,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', id] });
      setReviewName(''); setReviewRating(5); setReviewComment('');
      toast({ title: t('sp.thanksForReview') });
    },
    onError: () => { toast({ title: t('sp.errorTryAgain'), variant: 'destructive' }); },
  });

  useEffect(() => {
    if (product) {
      trackEvent('ViewContent', {
        content_name: product.name,
        content_ids: [product.id],
        content_type: 'product',
        value: Number(product.price),
        currency: 'DZD',
      });
      // Track recently viewed
      addRecentlyViewed({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.images?.[product.main_image_index ?? 0] || product.images?.[0] || '',
      });
    }
  }, [product, trackEvent, addRecentlyViewed]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-32" /><Skeleton className="h-24 w-full" /><Skeleton className="h-10 w-40" /></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-16 text-center space-y-4">
        <p className="font-cairo text-xl text-muted-foreground">{t('sp.notFound')}</p>
        <Link to="/products" className="inline-flex items-center gap-2 font-cairo text-primary hover:underline"><ArrowRight className="w-4 h-4" />{t('sp.backToProducts')}</Link>
      </div>
    );
  }

  const productImages = product.images || [];
  const images = productImages;
  const outOfStock = hasNewVariants
    ? (matchedVariant ? matchedVariant.quantity <= 0 : (productVariants || []).every((v: any) => v.quantity <= 0))
    : (product.stock ?? 0) <= 0;
  const avgRating = reviews && reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  const hasLegacyVariations = Object.keys(variationGroups).length > 0;

  const selectedVariationForCart: CartItemVariation | undefined = (() => {
    if (hasNewVariants) return undefined;
    const types = Object.keys(variationGroups);
    if (types.length === 0) return undefined;
    for (const type of types) {
      const value = selectedVariations[type];
      if (value) {
        const v = variationGroups[type]?.find(vr => vr.variation_value === value);
        if (v) return { type: v.variation_type, value: v.variation_value, priceAdjustment: Number(v.price_adjustment) || 0 };
      }
    }
    return undefined;
  })();

  const effectivePrice = hasNewVariants && matchedVariant
    ? Number(matchedVariant.price)
    : Number(product.price) + (selectedVariationForCart?.priceAdjustment || 0);

  const effectiveStock = hasNewVariants && matchedVariant
    ? matchedVariant.quantity
    : (product.stock ?? 0);

  const allOptionsSelected = () => {
    if (hasNewVariants) {
      return (optionGroups || []).every((g: any) => selectedNewOptions[g.name]);
    }
    const types = Object.keys(variationGroups);
    if (types.length === 0) return true;
    return types.every(type => selectedVariations[type] && selectedVariations[type] !== '');
  };

  const handleAdd = () => {
    if ((hasNewVariants || hasLegacyVariations) && !allOptionsSelected()) {
      toast({ title: t('sp.selectAllOptions'), variant: 'destructive' });
      return;
    }
    if (hasNewVariants && matchedVariant) {
      for (let i = 0; i < qty; i++) {
        addItem({
          id: product.id, name: product.name, price: Number(matchedVariant.price),
          image: matchedVariant.image_url || images[0] || '', stock: matchedVariant.quantity,
          shippingPrice: Number(product.shipping_price) || 0, variantId: matchedVariant.id,
          variantSku: matchedVariant.sku || undefined,
          variantOptionValues: matchedVariant.option_values as Record<string, string>,
        });
      }
    } else {
      for (let i = 0; i < qty; i++) {
        addItem({
          id: product.id, name: product.name, price: Number(product.price),
          image: images[0] || '', stock: product.stock ?? 0,
          shippingPrice: Number(product.shipping_price) || 0, variation: selectedVariationForCart,
        });
      }
    }
    trackEvent('AddToCart', {
      content_name: product.name, content_ids: [product.id],
      content_type: 'product', value: effectivePrice * qty, currency: 'DZD',
    });
    toast({ title: t('sp.addedToCart'), description: t('sp.addedToCartDesc').replace('{name}', product.name).replace('{qty}', String(qty)) });
  };

  const goToPrevImage = () => setSelectedImage(i => (i === 0 ? images.length - 1 : i - 1));
  const goToNextImage = () => setSelectedImage(i => (i === images.length - 1 ? 0 : i + 1));

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNextImage();
      else goToPrevImage();
    }
    setTouchStart(null);
  };

  // Inline order calculations
  const selectedWilaya = wilayas?.find(w => w.id === orderWilayaId);
  const wilayaBaseRate = selectedWilaya ? Number(selectedWilaya.shipping_price) : 0;
  const wilayaHomeRate = selectedWilaya ? Number(selectedWilaya.shipping_price_home) : 0;
  const productShippingRate = Number(product.shipping_price) || 0;
  const baseRate = orderDeliveryType === 'home' ? wilayaHomeRate : wilayaBaseRate;
  const shippingRate = productShippingRate > 0 ? productShippingRate : baseRate;
  const shippingCost = shippingRate * qty;
  const itemSubtotal = effectivePrice * qty;
  const orderTotal = itemSubtotal + shippingCost - couponDiscount;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim())
        .eq('is_active', true)
        .single();
      if (!data) {
        toast({ title: t('sp.error'), description: t('sp.invalidCoupon'), variant: 'destructive' });
        return;
      }
      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        toast({ title: t('sp.error'), description: t('sp.expiredCoupon'), variant: 'destructive' });
        return;
      }
      // Check product eligibility
      const { data: couponProds } = await supabase
        .from('coupon_products')
        .select('product_id')
        .eq('coupon_id', data.id);
      if (couponProds && couponProds.length > 0) {
        const eligible = couponProds.some(cp => cp.product_id === product.id);
        if (!eligible) {
          toast({ title: t('sp.error'), description: t('sp.couponNotApplicable'), variant: 'destructive' });
          return;
        }
      }
      const rawDiscount = data.discount_type === 'percentage'
        ? Math.round(itemSubtotal * Number(data.discount_value) / 100)
        : Number(data.discount_value);
      const discountVal = Math.min(rawDiscount, itemSubtotal);
      setCouponDiscount(discountVal);
      setCouponApplied(true);
      toast({ title: t('sp.couponApplied'), description: t('sp.discountApplied').replace('{amount}', formatPrice(discountVal)) });
    } catch {
      toast({ title: t('sp.error'), description: t('sp.couponCheckError'), variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  };

  const baridimobEnabled = settings?.baridimob_enabled === 'true';
  const flexyEnabled = settings?.flexy_enabled === 'true';
  const cashOnDeliveryEnabled = settings?.cash_on_delivery_enabled !== 'false'; // default true
  const binanceEnabled = settings?.binance_enabled === 'true';
  const vodafoneEnabled = settings?.vodafone_enabled === 'true';
  const redotpayEnabled = settings?.redotpay_enabled === 'true';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('sp.copied') });
  };

  // Offer timer
  const offerTitle = (product as any).offer_title;
  const offerEndsAt = (product as any).offer_ends_at;
  const hasActiveOffer = offerEndsAt && new Date(offerEndsAt).getTime() > Date.now();

  const handleDirectOrder = async () => {
    if ((hasNewVariants || hasLegacyVariations) && !allOptionsSelected()) {
      toast({ title: t('sp.selectAllOptions'), variant: 'destructive' });
      return;
    }
    const newErrors: Record<string, string> = {};
    if (!orderName.trim()) newErrors.orderName = t('sp.enterFullName');
    if (!orderPhone.trim()) newErrors.orderPhone = t('sp.enterPhone');
    else if (!/^0[567]\d{8}$/.test(orderPhone)) newErrors.orderPhone = t('sp.invalidPhone');
    if (!orderWilayaId) newErrors.orderWilayaId = t('sp.selectWilaya');
    if (!orderDeliveryType) newErrors.orderDeliveryType = t('sp.selectDeliveryType');
    if (!paymentMethod) newErrors.paymentMethod = t('sp.selectPaymentMethod');
    if (['baridimob', 'flexy', 'binance', 'vodafone', 'redotpay'].includes(paymentMethod) && !receiptFile) newErrors.receiptFile = t('sp.attachReceiptError');
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmittingOrder(true);
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

      const { data: order, error } = await supabase.from('orders').insert({
        order_number: '',
        customer_name: orderName, customer_phone: orderPhone,
        wilaya_id: orderWilayaId, baladiya: orderBaladiya || null,
        delivery_type: orderDeliveryType || null,
        address: orderAddress || null,
        subtotal: itemSubtotal, shipping_cost: shippingCost, total_amount: orderTotal,
        payment_method: paymentMethod, payment_receipt_url: receiptUrl || null,
        coupon_code: couponApplied ? couponCode : null,
        discount_amount: couponDiscount,
        user_id: user?.id || null,
      }).select().single();
      if (error) throw error;

      const orderItemPayload: any = {
        order_id: order.id, product_id: product.id, quantity: qty, unit_price: effectivePrice,
      };
      if (hasNewVariants && matchedVariant) {
        orderItemPayload.variant_id = matchedVariant.id;
      }
      await supabase.from('order_items').insert(orderItemPayload);
      // Telegram notification is handled server-side by a database trigger.
      navigate(`/order-confirmation/${order.order_number}`);
    } catch (err) {
      toast({ title: t('sp.error'), description: t('sp.orderError'), variant: 'destructive' });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const scrollToOrderForm = () => {
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="container py-6 md:py-10">
      <SEO
        title={`${product.name} — NuvoriaStore`}
        description={(product.description || product.name).toString().slice(0, 160)}
        path={`/product/${product.id}`}
        type="product"
        image={product.images?.[product.main_image_index ?? 0] || product.images?.[0]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description || product.name,
          image: product.images || [],
          offers: {
            '@type': 'Offer',
            price: Number(product.price),
            priceCurrency: 'DZD',
            availability:
              (product.stock ?? 0) > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            url: `https://souq-dzair-express.lovable.app/product/${product.id}`,
          },
        }}
      />
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 font-cairo">
        <Link to="/" className="hover:text-primary transition-colors">{t('sp.home')}</Link>
        <ChevronRight className="w-3 h-3 rotate-180 text-muted-foreground/40" />
        <Link to="/products" className="hover:text-primary transition-colors">{t('sp.products')}</Link>
        <ChevronRight className="w-3 h-3 rotate-180 text-muted-foreground/40" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
        {/* Images with touch swipe */}
        <div className="flex flex-col-reverse md:flex-row gap-3 md:sticky md:top-24 md:self-start">
          {images.length > 1 && (
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[500px] md:w-20 shrink-0 scrollbar-hide">
              {images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 md:w-full md:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all duration-300 ${i === selectedImage ? 'border-primary ring-2 ring-primary/20 shadow-md shadow-primary/10' : 'border-border/50 hover:border-primary/40 opacity-70 hover:opacity-100'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 relative group"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}>
            <div className="aspect-square rounded-3xl overflow-hidden bg-muted/50 cursor-zoom-in shadow-lg shadow-foreground/5 border border-border/30" onMouseEnter={() => setIsZoomed(true)} onMouseLeave={() => setIsZoomed(false)}>
              {images[selectedImage] ? (
                <img src={images[selectedImage]} alt={product.name} className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isZoomed ? 'scale-150' : 'scale-100'}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><ShoppingCart className="w-20 h-20" /></div>
              )}
            </div>
            {images.length > 1 && (
              <>
                <span className="absolute top-4 left-4 bg-foreground/70 backdrop-blur-md text-background text-xs font-roboto font-bold rounded-full px-3 py-1.5 shadow-lg">{selectedImage + 1}/{images.length}</span>
                <button onClick={goToNextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:bg-background hover:scale-110"><ChevronRight className="w-5 h-5" /></button>
                <button onClick={goToPrevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:bg-background hover:scale-110"><ChevronLeft className="w-5 h-5" /></button>
              </>
            )}
          </div>
        </div>

        {/* Info + Order Form */}
        <div className="space-y-4">
          {/* Countdown Timer */}
          {hasActiveOffer && (
            <CountdownTimer endsAt={offerEndsAt} title={offerTitle} />
          )}

          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
            <h1 className="font-cairo font-extrabold text-2xl md:text-3xl text-foreground leading-tight">{product.name}</h1>

            {product.short_description && (
              <p className="font-cairo text-sm text-muted-foreground leading-relaxed">{product.short_description}</p>
            )}

            {/* Reviews + Rating prominently near price */}
            {reviews && reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <StarRating value={Math.round(avgRating)} readonly />
                <span className="font-roboto font-bold text-sm">{avgRating.toFixed(1)}</span>
                <span className="font-cairo text-sm text-muted-foreground">{t('sp.reviewCount').replace('{n}', String(reviews.length))}</span>
              </div>
            )}

            <div className="flex items-baseline gap-3 bg-gradient-to-l from-primary/5 to-transparent rounded-2xl p-4 -mx-2">
              <p className="font-roboto font-extrabold text-3xl md:text-4xl text-primary">
                {formatPrice(effectivePrice)}
              </p>
              {product.old_price && Number(product.old_price) > effectivePrice && (
                <>
                  <span className="font-roboto text-lg text-muted-foreground/50 line-through decoration-destructive/40">{formatPrice(Number(product.old_price))}</span>
                  <Badge className="bg-gradient-to-l from-red-500 to-red-600 text-white border-0 font-cairo text-xs rounded-full px-3 shadow-sm shadow-red-500/20">
                    -{Math.round((1 - effectivePrice / Number(product.old_price)) * 100)}%
                  </Badge>
                </>
              )}
            </div>


            {/* Stock urgency */}
            {!outOfStock && effectiveStock > 0 && effectiveStock <= 5 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 animate-pulse">
                <Clock className="w-4 h-4 text-red-500" />
                <span className="font-cairo text-sm font-bold text-red-500">{t('product.onlyLeft').replace('{n}', String(effectiveStock))}</span>
              </div>
            )}

            {/* Bundle Offers */}
            {bundleOffers && bundleOffers.length > 0 && (
              <div className="space-y-2 pt-2">
                <Label className="font-cairo text-sm font-semibold flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-primary" /> {t('sp.specialOffers')}
                </Label>
                <div className="space-y-1.5">
                  {bundleOffers.map((offer: any) => {
                    const savings = (effectivePrice * offer.quantity) - Number(offer.price);
                    return (
                      <button
                        key={offer.id}
                        onClick={() => setQty(offer.quantity)}
                        className={`w-full text-right px-4 py-2.5 border-2 rounded-xl transition-all flex items-center justify-between ${qty === offer.quantity ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-cairo font-medium text-sm">{offer.description}</span>
                          <span className="font-cairo text-xs text-muted-foreground">{t('sp.pieces').replace('{n}', String(offer.quantity))}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-roboto font-bold text-primary">{formatPrice(Number(offer.price))}</span>
                          {savings > 0 && (
                            <Badge variant="secondary" className="font-cairo text-xs">{t('sp.save').replace('{amount}', formatPrice(savings))}</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {outOfStock && (
              <Badge variant="destructive" className="font-cairo">{t('sp.outOfStockNow')}</Badge>
            )}

            {/* NEW Variant Selector */}
            {hasNewVariants && (
              <div className="space-y-4 pt-2">
                {(optionGroups || []).map((group: any) => (
                  <div key={group.id}>
                    <Label className="font-cairo font-semibold text-sm mb-2 block">
                      {group.name} <span className="text-destructive">*</span>
                      {selectedNewOptions[group.name] && (
                        <span className="font-normal text-muted-foreground mr-2">: {selectedNewOptions[group.name]}</span>
                      )}
                    </Label>
                    {group.display_type === 'dropdown' ? (
                      <Select value={selectedNewOptions[group.name] || ''} onValueChange={v => setSelectedNewOptions(prev => ({ ...prev, [group.name]: v }))}>
                        <SelectTrigger className="font-cairo"><SelectValue placeholder={t('sp.chooseGroup').replace('{name}', group.name)} /></SelectTrigger>
                        <SelectContent>
                          {group.values.map((val: any) => {
                            const available = isOptionValueAvailable(group.name, val.label);
                            return (
                              <SelectItem key={val.id} value={val.label} className="font-cairo" disabled={!available}>
                                {val.label} {!available && t('sp.notAvailable')}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {group.values.map((val: any) => {
                          const isSelected = selectedNewOptions[group.name] === val.label;
                          const available = isOptionValueAvailable(group.name, val.label);
                          const handleClick = () => {
                            if (!available) return;
                            setSelectedNewOptions(prev => ({ ...prev, [group.name]: isSelected ? '' : val.label }));
                          };
                          if (group.display_type === 'color_swatch' && val.color_hex) {
                            return (
                              <button key={val.id} onClick={handleClick} disabled={!available}
                                title={val.label}
                                className={`relative w-9 h-9 rounded-full border-2 transition-all ring-2 ring-offset-2 ${isSelected ? 'ring-primary border-primary' : 'ring-transparent border-muted-foreground/30 hover:border-muted-foreground/50'} ${!available ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                style={{ backgroundColor: val.color_hex }}>
                                {!available && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-0.5 bg-destructive rotate-45 rounded-full" /></div>}
                              </button>
                            );
                          }
                          if (group.display_type === 'radio') {
                            return (
                              <label key={val.id} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/10' : 'border-border'} ${!available ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                <input type="radio" name={group.name} checked={isSelected} onChange={handleClick} disabled={!available} />
                                <span className="font-cairo text-sm">{val.label}</span>
                              </label>
                            );
                          }
                          return (
                            <button key={val.id} onClick={handleClick} disabled={!available}
                              className={`relative px-4 py-2 rounded-lg border-2 text-sm font-cairo font-medium transition-all ${isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30 text-foreground'} ${!available ? 'opacity-30 cursor-not-allowed' : ''}`}>
                              {val.label}
                              {!available && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-0.5 bg-destructive/50 rotate-45 rounded-full" /></div>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Legacy Variation Selector */}
            {!hasNewVariants && hasLegacyVariations && (
              <div className="space-y-4 pt-2">
                {Object.entries(variationGroups).map(([type, vars]) => {
                  const isColor = isColorType(type);
                  return (
                    <div key={type}>
                      <Label className="font-cairo font-semibold text-sm mb-2 block">
                        {type} <span className="text-destructive">*</span>
                        {selectedVariations[type] && (
                          <span className="font-normal text-muted-foreground mr-2">: {selectedVariations[type]}</span>
                        )}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {vars.map(v => {
                          const isSelected = selectedVariations[type] === v.variation_value;
                          const colorCode = getColorCode(type, v.variation_value);
                          const isOutOfStock = (v.stock ?? 0) <= 0;
                          const handleClick = () => {
                            setSelectedVariations(prev => ({ ...prev, [type]: isSelected ? '' : v.variation_value }));
                            if (!isSelected && v.image_url) {
                              const idx = images.indexOf(v.image_url);
                              if (idx >= 0) setSelectedImage(idx);
                            }
                          };
                          if (isColor && colorCode) {
                            return (
                              <button key={v.id} onClick={handleClick} disabled={isOutOfStock}
                                title={`${v.variation_value}${Number(v.price_adjustment) > 0 ? ` (+${formatPrice(Number(v.price_adjustment))})` : ''}`}
                                className={`relative w-9 h-9 rounded-full border-2 transition-all ring-2 ring-offset-2 ${isSelected ? 'ring-primary border-primary' : 'ring-transparent border-muted-foreground/30 hover:border-muted-foreground/50'} ${isOutOfStock ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                style={{ backgroundColor: colorCode }}>
                                {isOutOfStock && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-0.5 bg-destructive rotate-45 rounded-full" /></div>}
                              </button>
                            );
                          }
                          return (
                            <button key={v.id} onClick={handleClick} disabled={isOutOfStock}
                              className={`relative px-4 py-2 rounded-lg border-2 text-sm font-cairo font-medium transition-all ${isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30 text-foreground'} ${isOutOfStock ? 'opacity-30 cursor-not-allowed' : ''}`}>
                              {v.variation_value}
                              {Number(v.price_adjustment) > 0 && <span className="font-roboto text-xs text-muted-foreground mr-1">(+{formatPrice(Number(v.price_adjustment))})</span>}
                              {isOutOfStock && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-0.5 bg-destructive/50 rotate-45 rounded-full" /></div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {product.description && (
              <p className="font-cairo text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Share button */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const url = `${window.location.origin}/product/${product.id}`;
                  if (navigator.share) {
                    try { await navigator.share({ title: product.name, text: t('sp.checkOut').replace('{name}', product.name), url }); } catch {}
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast({ title: t('sp.linkCopied') });
                  }
                }}
                className="font-cairo text-xs gap-1.5 rounded-xl h-9 text-muted-foreground hover:text-primary"
              >
                <Share2 className="w-3.5 h-3.5" />
                {t('sp.shareProduct')}
              </Button>
            </div>
          </div>

          {/* Quantity + Add to Cart + Order Now CTA */}
          {!outOfStock && (
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-6 space-y-4 shadow-sm" ref={orderFormRef}>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border/50 rounded-2xl bg-muted/30">
                  <Button variant="ghost" size="icon" onClick={() => setQty(q => Math.max(1, q - 1))} className="rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-colors"><Minus className="w-4 h-4" /></Button>
                  <span className="w-12 text-center font-roboto font-bold text-lg">{qty}</span>
                  <Button variant="ghost" size="icon" onClick={() => setQty(q => Math.min(effectiveStock, q + 1))} className="rounded-2xl hover:bg-primary/10 hover:text-primary transition-colors"><Plus className="w-4 h-4" /></Button>
                </div>
                <Button onClick={handleAdd} variant="outline" className="font-cairo font-semibold gap-2 flex-1 rounded-2xl h-11 border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all">
                  <ShoppingCart className="w-4 h-4" />
                  {t('sp.addToCart')}
                </Button>
              </div>
              {/* Total price display */}
              <div className="flex justify-between items-center font-cairo text-sm bg-gradient-to-l from-primary/5 to-primary/10 border border-primary/10 rounded-2xl px-5 py-3.5">
                <span className="text-muted-foreground font-medium">{t('sp.totalPieces').replace('{n}', String(qty))}</span>
                <span className="font-roboto font-extrabold text-primary text-xl">{formatPrice(effectivePrice * qty)}</span>
              </div>
            </div>
          )}

          {/* ─── Inline Order Form ─── */}
          {!outOfStock && (
            <div className="bg-card/80 backdrop-blur-sm border-2 border-primary/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm shadow-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
                  <Truck className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-cairo font-bold text-xl text-foreground">{t('sp.orderDirectly')}</h2>
                  <p className="font-cairo text-xs text-muted-foreground">{t('sp.fillInfoFast')}</p>
                </div>
              </div>

              {/* Step 1: User Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold font-roboto shrink-0">1</div>
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-cairo font-semibold text-sm">{t('sp.personalInfo')}</span>
                </div>
                <div>
                  <Label className="font-cairo text-sm">{t('sp.fullName')}</Label>
                  <Input value={orderName} onChange={e => { setOrderName(e.target.value); setErrors(prev => ({ ...prev, orderName: '' })); }}
                    placeholder={t("sp.fullNamePlaceholder")} className={`font-cairo mt-1 ${errors.orderName ? 'border-destructive' : ''}`} />
                  {errors.orderName && <p className="text-destructive text-xs font-cairo mt-1">{errors.orderName}</p>}
                </div>
                <div>
                  <Label className="font-cairo text-sm">{t('sp.phone')}</Label>
                  <Input value={orderPhone} onChange={e => { setOrderPhone(e.target.value); setErrors(prev => ({ ...prev, orderPhone: '' })); }}
                    placeholder="05XXXXXXXX" className={`font-roboto mt-1 ${errors.orderPhone ? 'border-destructive' : ''}`} dir="ltr" />
                  {errors.orderPhone && <p className="text-destructive text-xs font-cairo mt-1">{errors.orderPhone}</p>}
                </div>
              </div>

              <hr className="border-border" />

              {/* Step 2: Delivery */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold font-roboto shrink-0">2</div>
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-cairo font-semibold text-sm">{t('sp.delivery')}</span>
                </div>
                <div>
                  <Label className="font-cairo text-sm">{t('sp.wilaya')}</Label>
                  <Select value={orderWilayaId} onValueChange={v => { setOrderWilayaId(v); setOrderBaladiya(''); setOrderDeliveryType(''); setErrors(prev => ({ ...prev, orderWilayaId: '', orderDeliveryType: '' })); }}>
                    <SelectTrigger className={`font-cairo mt-1 ${errors.orderWilayaId ? 'border-destructive' : ''}`}><SelectValue placeholder={t("sp.chooseWilaya")} /></SelectTrigger>
                    <SelectContent>
                      {wilayas?.map(w => (
                        <SelectItem key={w.id} value={w.id} className="font-cairo">{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.orderWilayaId && <p className="text-destructive text-xs font-cairo mt-1">{errors.orderWilayaId}</p>}
                </div>

                {orderWilayaId && baladiyat && baladiyat.length > 0 && (
                  <div>
                    <Label className="font-cairo text-sm">{t('sp.baladiya')}</Label>
                    <Select value={orderBaladiya} onValueChange={setOrderBaladiya}>
                      <SelectTrigger className="font-cairo mt-1"><SelectValue placeholder={t("sp.chooseBaladiya")} /></SelectTrigger>
                      <SelectContent>
                        {baladiyat.map(b => (
                          <SelectItem key={b.id} value={b.name} className="font-cairo">{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {orderWilayaId && selectedWilaya && (
                  <div>
                    <Label className="font-cairo text-sm">{t('sp.deliveryType')}</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <button type="button" onClick={() => { setOrderDeliveryType('office'); setErrors(e => ({ ...e, orderDeliveryType: '' })); }}
                        className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-xl transition-all text-sm ${orderDeliveryType === 'office' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                        <Building2 className={`w-5 h-5 ${orderDeliveryType === 'office' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="font-cairo font-semibold">{t('sp.office')}</span>
                        <span className="font-roboto font-bold text-primary">{formatPrice(Number(selectedWilaya.shipping_price))}</span>
                      </button>
                      <button type="button" onClick={() => { setOrderDeliveryType('home'); setErrors(e => ({ ...e, orderDeliveryType: '' })); }}
                        className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-xl transition-all text-sm ${orderDeliveryType === 'home' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                        <Home className={`w-5 h-5 ${orderDeliveryType === 'home' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="font-cairo font-semibold">{t('sp.homeDelivery')}</span>
                        <span className="font-roboto font-bold text-primary">{formatPrice(Number(selectedWilaya.shipping_price_home))}</span>
                      </button>
                    </div>
                    {errors.orderDeliveryType && <p className="text-destructive text-xs font-cairo mt-1">{errors.orderDeliveryType}</p>}
                  </div>
                )}

                <div>
                  <Label className="font-cairo text-sm">{t('sp.address')}</Label>
                  <Input value={orderAddress} onChange={e => setOrderAddress(e.target.value)} placeholder={t("sp.optional")} className="font-cairo mt-1" />
                </div>
              </div>

              <hr className="border-border" />

              {/* Step 3: Payment */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold font-roboto shrink-0">3</div>
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="font-cairo font-semibold text-sm">{t('sp.payment')}</span>
                </div>
                <div className="space-y-2">
                  {cashOnDeliveryEnabled && (
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors text-sm ${paymentMethod === 'cash_on_delivery' ? 'border-primary bg-accent' : ''}`}>
                      <input type="radio" name="inline-payment" value="cash_on_delivery" checked={paymentMethod === 'cash_on_delivery'} onChange={e => { setPaymentMethod(e.target.value); setErrors(prev => ({ ...prev, paymentMethod: '', receiptFile: '' })); }} className="mt-0.5" />
                      <div className="flex-1">
                        <span className="font-cairo font-semibold">{t('sp.cod')}</span>
                        <p className="text-xs text-muted-foreground font-cairo mt-1">{t('sp.codDesc')}</p>
                      </div>
                    </label>
                  )}

                  {baridimobEnabled && (
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors text-sm ${paymentMethod === 'baridimob' ? 'border-primary bg-accent' : ''}`}>
                      <input type="radio" name="inline-payment" value="baridimob" checked={paymentMethod === 'baridimob'} onChange={e => { setPaymentMethod(e.target.value); setErrors(prev => ({ ...prev, paymentMethod: '', receiptFile: '' })); }} className="mt-0.5" />
                      <div className="flex-1">
                        <span className="font-cairo font-semibold">{t('sp.baridimob')}</span>
                        {paymentMethod === 'baridimob' && settings && (
                          <div className="mt-2 space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                              <span className="font-cairo">{t('sp.account')}</span>
                              <span className="font-roboto font-bold">{settings.ccp_number}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(settings.ccp_number)}><Copy className="w-3 h-3" /></Button>
                            </div>
                            <p className="font-cairo">{t('sp.nameLabel').replace('{name}', settings.ccp_name || '')}</p>
                            <div className="mt-1.5">
                              <Label className="font-cairo text-[11px]">{t('sp.attachReceipt')}</Label>
                              <Input type="file" accept="image/*,.pdf" onChange={e => { handleReceiptFile(e.target.files?.[0] || null); setErrors(prev => ({ ...prev, receiptFile: '' })); }} className={`mt-0.5 h-8 text-xs ${errors.receiptFile ? 'border-destructive' : ''}`} />
                              {receiptPreview && (
                                <div className="relative mt-2 inline-block">
                                  <img src={receiptPreview} alt={t("sp.receipt")} className="w-24 h-24 object-cover rounded-lg border" />
                                  <button onClick={removeReceipt} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              {receiptFile && !receiptPreview && (
                                <div className="flex items-center gap-2 mt-1 text-xs font-cairo text-muted-foreground">
                                  <Upload className="w-3 h-3" /> {receiptFile.name}
                                  <button onClick={removeReceipt} className="text-destructive"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              {errors.receiptFile && <p className="text-destructive text-xs font-cairo mt-1">{errors.receiptFile}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  )}

                  {flexyEnabled && (
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors text-sm ${paymentMethod === 'flexy' ? 'border-primary bg-accent' : ''}`}>
                      <input type="radio" name="inline-payment" value="flexy" checked={paymentMethod === 'flexy'} onChange={e => { setPaymentMethod(e.target.value); setErrors(prev => ({ ...prev, paymentMethod: '', receiptFile: '' })); }} className="mt-0.5" />
                      <div className="flex-1">
                        <span className="font-cairo font-semibold">{t('sp.flexy')}</span>
                        {paymentMethod === 'flexy' && settings && (
                          <div className="mt-2 space-y-1.5 text-xs">
                            <p className="font-cairo">{t('sp.flexyInstruction').split('{amount}')[0]}<span className="font-roboto font-bold">{formatPrice(Number(settings.flexy_deposit_amount || 500))}</span>{t('sp.flexyInstruction').split('{amount}')[1]}</p>
                            <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                              <span className="font-roboto font-bold">{settings.flexy_number}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(settings.flexy_number)}><Copy className="w-3 h-3" /></Button>
                            </div>
                            <div className="mt-1.5">
                              <Label className="font-cairo text-[11px]">{t('sp.attachScreenshot')}</Label>
                              <Input type="file" accept="image/*" onChange={e => { handleReceiptFile(e.target.files?.[0] || null); setErrors(prev => ({ ...prev, receiptFile: '' })); }} className={`mt-0.5 h-8 text-xs ${errors.receiptFile ? 'border-destructive' : ''}`} />
                              {receiptPreview && (
                                <div className="relative mt-2 inline-block">
                                  <img src={receiptPreview} alt={t("sp.screenshot")} className="w-24 h-24 object-cover rounded-lg border" />
                                  <button onClick={removeReceipt} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              {receiptFile && !receiptPreview && (
                                <div className="flex items-center gap-2 mt-1 text-xs font-cairo text-muted-foreground">
                                  <Upload className="w-3 h-3" /> {receiptFile.name}
                                  <button onClick={removeReceipt} className="text-destructive"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              {errors.receiptFile && <p className="text-destructive text-xs font-cairo mt-1">{errors.receiptFile}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  )}

                  {binanceEnabled && (
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors text-sm ${paymentMethod === 'binance' ? 'border-primary bg-accent' : ''}`}>
                      <input type="radio" name="inline-payment" value="binance" checked={paymentMethod === 'binance'} onChange={e => { setPaymentMethod(e.target.value); setErrors(prev => ({ ...prev, paymentMethod: '', receiptFile: '' })); }} className="mt-0.5" />
                      <div className="flex-1">
                        <span className="font-cairo font-semibold">{t('sp.binance')}</span>
                        {paymentMethod === 'binance' && settings && (
                          <div className="mt-2 space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                              <span className="font-cairo">{t('sp.wallet')}</span>
                              <span className="font-roboto font-bold">{settings.binance_wallet}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(settings.binance_wallet)}><Copy className="w-3 h-3" /></Button>
                            </div>
                            <div className="mt-1.5">
                              <Label className="font-cairo text-[11px]">{t('sp.attachPaymentReceipt')}</Label>
                              <Input type="file" accept="image/*,.pdf" onChange={e => { handleReceiptFile(e.target.files?.[0] || null); setErrors(prev => ({ ...prev, receiptFile: '' })); }} className={`mt-0.5 h-8 text-xs ${errors.receiptFile ? 'border-destructive' : ''}`} />
                              {receiptPreview && (
                                <div className="relative mt-2 inline-block">
                                  <img src={receiptPreview} alt={t("sp.receipt")} className="w-24 h-24 object-cover rounded-lg border" />
                                  <button onClick={removeReceipt} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              {receiptFile && !receiptPreview && (
                                <div className="flex items-center gap-2 mt-1 text-xs font-cairo text-muted-foreground">
                                  <Upload className="w-3 h-3" /> {receiptFile.name}
                                  <button onClick={removeReceipt} className="text-destructive"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              {errors.receiptFile && <p className="text-destructive text-xs font-cairo mt-1">{errors.receiptFile}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  )}

                  {vodafoneEnabled && (
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors text-sm ${paymentMethod === 'vodafone' ? 'border-primary bg-accent' : ''}`}>
                      <input type="radio" name="inline-payment" value="vodafone" checked={paymentMethod === 'vodafone'} onChange={e => { setPaymentMethod(e.target.value); setErrors(prev => ({ ...prev, paymentMethod: '', receiptFile: '' })); }} className="mt-0.5" />
                      <div className="flex-1">
                        <span className="font-cairo font-semibold">{t('sp.vodafone')}</span>
                        {paymentMethod === 'vodafone' && settings && (
                          <div className="mt-2 space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                              <span className="font-cairo">{t('sp.walletNumber')}</span>
                              <span className="font-roboto font-bold">{settings.vodafone_number}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(settings.vodafone_number)}><Copy className="w-3 h-3" /></Button>
                            </div>
                            <div className="mt-1.5">
                              <Label className="font-cairo text-[11px]">{t('sp.attachPaymentReceipt')}</Label>
                              <Input type="file" accept="image/*,.pdf" onChange={e => { handleReceiptFile(e.target.files?.[0] || null); setErrors(prev => ({ ...prev, receiptFile: '' })); }} className={`mt-0.5 h-8 text-xs ${errors.receiptFile ? 'border-destructive' : ''}`} />
                              {receiptPreview && (
                                <div className="relative mt-2 inline-block">
                                  <img src={receiptPreview} alt={t("sp.receipt")} className="w-24 h-24 object-cover rounded-lg border" />
                                  <button onClick={removeReceipt} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              {receiptFile && !receiptPreview && (
                                <div className="flex items-center gap-2 mt-1 text-xs font-cairo text-muted-foreground">
                                  <Upload className="w-3 h-3" /> {receiptFile.name}
                                  <button onClick={removeReceipt} className="text-destructive"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              {errors.receiptFile && <p className="text-destructive text-xs font-cairo mt-1">{errors.receiptFile}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  )}

                  {redotpayEnabled && (
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors text-sm ${paymentMethod === 'redotpay' ? 'border-primary bg-accent' : ''}`}>
                      <input type="radio" name="inline-payment" value="redotpay" checked={paymentMethod === 'redotpay'} onChange={e => { setPaymentMethod(e.target.value); setErrors(prev => ({ ...prev, paymentMethod: '', receiptFile: '' })); }} className="mt-0.5" />
                      <div className="flex-1">
                        <span className="font-cairo font-semibold">{t('sp.redotpay')}</span>
                        {paymentMethod === 'redotpay' && settings && (
                          <div className="mt-2 space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                              <span className="font-cairo">{t('sp.account')}</span>
                              <span className="font-roboto font-bold">{settings.redotpay_account}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(settings.redotpay_account)}><Copy className="w-3 h-3" /></Button>
                            </div>
                            <div className="mt-1.5">
                              <Label className="font-cairo text-[11px]">{t('sp.attachPaymentReceipt')}</Label>
                              <Input type="file" accept="image/*,.pdf" onChange={e => { handleReceiptFile(e.target.files?.[0] || null); setErrors(prev => ({ ...prev, receiptFile: '' })); }} className={`mt-0.5 h-8 text-xs ${errors.receiptFile ? 'border-destructive' : ''}`} />
                              {receiptPreview && (
                                <div className="relative mt-2 inline-block">
                                  <img src={receiptPreview} alt={t("sp.receipt")} className="w-24 h-24 object-cover rounded-lg border" />
                                  <button onClick={removeReceipt} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              {receiptFile && !receiptPreview && (
                                <div className="flex items-center gap-2 mt-1 text-xs font-cairo text-muted-foreground">
                                  <Upload className="w-3 h-3" /> {receiptFile.name}
                                  <button onClick={removeReceipt} className="text-destructive"><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              {errors.receiptFile && <p className="text-destructive text-xs font-cairo mt-1">{errors.receiptFile}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  )}
                </div>
                {errors.paymentMethod && <p className="text-destructive text-xs font-cairo mt-1">{errors.paymentMethod}</p>}
              </div>

              {/* Coupon Code */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-1">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="font-cairo font-semibold text-sm">{t('sp.couponCodeLabel')}</span>
                </div>
                {couponApplied ? (
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-cairo text-sm text-green-700">{t("sp.couponAppliedAmt").replace("{amount}", formatPrice(couponDiscount))}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      placeholder={t("sp.couponPlaceholder")}
                      className="font-cairo flex-1"
                      dir="ltr"
                    />
                    <Button variant="outline" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()} className="font-cairo">
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('sp.apply')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              {orderWilayaId && orderDeliveryType && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1.5 text-sm font-cairo">
                  <div className="flex justify-between">
                    <span>{t('sp.productLine').replace('{n}', String(qty))}</span>
                    <span className="font-roboto font-bold">{formatPrice(itemSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('sp.deliveryLine').replace('{type}', orderDeliveryType === 'home' ? t('sp.homeDelivery') : t('sp.office'))}</span>
                    <span className="font-roboto font-bold">{formatPrice(shippingCost)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{t('sp.discountLine')}</span>
                      <span className="font-roboto font-bold">-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  <hr className="my-1 border-primary/20" />
                  <div className="flex justify-between font-bold text-base">
                    <span>{t('sp.total')}</span>
                    <span className="font-roboto text-primary">{formatPrice(orderTotal)}</span>
                  </div>
                </div>
              )}

              <Button onClick={handleDirectOrder} disabled={submittingOrder}
                className="w-full font-cairo font-bold text-base gap-2 rounded-xl h-14 bg-gradient-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/25 animate-pulse hover:animate-none">
                {submittingOrder ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {submittingOrder ? t('sp.sending') : t('sp.confirmOrder')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Rich Product Details */}
      {product.description && images.length > 1 && (
        <section className="mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-primary to-primary/30" />
            <h2 className="font-cairo font-extrabold text-2xl text-foreground">{t('sp.productDetails')}</h2>
          </div>
          <p className="font-cairo text-muted-foreground leading-relaxed mb-8 max-w-2xl text-base">{product.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.map((img, i) => (
              <div key={i} className={`rounded-3xl overflow-hidden shadow-md shadow-foreground/5 border border-border/30 group ${i === 0 ? 'md:col-span-2' : ''}`}>
                <img src={img} alt={`${product.name} - ${i + 1}`} className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Warranty Policy Section */}
      <section className="mt-20 mb-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-400 to-amber-400/30" />
          <h2 className="font-cairo font-extrabold text-2xl text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            سياسة الضمان
          </h2>
        </div>
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/40">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-amber-500" />
            </div>
            <p className="font-cairo font-bold text-base md:text-lg text-foreground">
              ضمان لمدة 12 شهراً من تاريخ الشراء
            </p>
          </div>
          <ul className="space-y-4 font-cairo text-sm md:text-base text-muted-foreground leading-relaxed">
            <li className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span>يغطي هذا الضمان عيوب التصنيع طوال مدة الضمان المحددة أعلاه، وفق الشروط والأحكام المعمول بها.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span>استبدال كامل للجهاز خلال الأيام السبعة الأولى في حال ثبوت عيب مصنعي.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span>بعد انقضاء فترة الاستبدال، يقتصر الضمان على إصلاح الأعطال الناتجة عن عيوب التصنيع، مع توفير قطع الغيار.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="mt-20 mb-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-400 to-amber-400/30" />
          <h2 className="font-cairo font-extrabold text-2xl text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            {t('sp.reviews').replace('{n}', String(reviews?.length || 0))}
          </h2>
        </div>
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-6 md:p-8 mb-8 shadow-sm">
          <h3 className="font-cairo font-bold text-lg mb-5">{t('sp.addReview')}</h3>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input value={reviewName} onChange={e => setReviewName(e.target.value)} placeholder={t("sp.yourName")} className="font-cairo" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-cairo text-sm text-muted-foreground">{t('sp.yourRating')}</span>
                <StarRating value={reviewRating} onChange={setReviewRating} />
              </div>
            </div>
            <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder={t("sp.commentPlaceholder")} className="font-cairo" rows={3} />
            <Button onClick={() => { if (!reviewName.trim()) { toast({ title: t('sp.enterYourName'), variant: 'destructive' }); return; } submitReview.mutate(); }}
              disabled={submitReview.isPending} className="font-cairo font-semibold gap-2 rounded-2xl h-11 px-6 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 shadow-md shadow-amber-500/20">
              {submitReview.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('sp.submitReview')}
            </Button>
          </div>
        </div>
        {reviews && reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="bg-card/80 border border-border/50 rounded-2xl p-5 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="font-cairo font-bold text-sm text-primary">{review.reviewer_name[0]}</span>
                    </div>
                    <div>
                      <p className="font-cairo font-bold text-sm">{review.reviewer_name}</p>
                      <p className="font-cairo text-xs text-muted-foreground/60">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  <StarRating value={review.rating} readonly />
                </div>
                {review.comment && <p className="font-cairo text-sm text-muted-foreground leading-relaxed mt-2 border-t border-border/30 pt-3">{review.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="font-cairo text-muted-foreground">{t('sp.noReviewsYet')}</p>
          </div>
        )}
      </section>

      {/* Recently Viewed */}
      <RecentlyViewedSection />

      {/* Sticky Bottom Buy Bar */}
      {!outOfStock && showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl shadow-foreground/10 animate-in slide-in-from-bottom-4 duration-300">
          <div className="container flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {images[0] && (
                <img src={images[0]} alt={product.name} className="w-11 h-11 rounded-xl object-cover shrink-0 border border-border/30 shadow-sm" />
              )}
              <div className="min-w-0">
                <p className="font-cairo font-bold text-sm truncate">{product.name}</p>
                <p className="font-roboto font-extrabold text-primary text-lg">{formatPrice(effectivePrice)}</p>
              </div>
            </div>
            <Button onClick={scrollToOrderForm}
              className="font-cairo font-bold gap-2 rounded-2xl px-7 h-12 bg-gradient-to-l from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 shrink-0 hover:shadow-xl hover:shadow-primary/30 transition-all">
              <ShoppingCart className="w-4 h-4" />
              {t('product.orderNow')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
