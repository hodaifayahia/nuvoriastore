import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/format';
import { useFacebookPixel } from '@/hooks/useFacebookPixel';
import { useOrderGuard } from '@/lib/orderGuard';

interface LandingContent {
  headline: string;
  subheadline: string;
  description: string;
  benefits: { icon: string; title: string; text: string }[];
  cta_primary: string;
  cta_secondary: string;
  testimonials: { name: string; text: string; rating: number }[];
  urgency_text: string;
  faq?: { question: string; answer: string }[];
  social_proof_stats?: { number: string; label: string }[];
  before_after?: { before_text: string; after_text: string; switch_line: string; image_url?: string };
  how_it_works?: { icon: string; title: string; description: string }[];
  guarantee_text?: string;
  authority_text?: string;
}

interface OptionGroup {
  id: string;
  name: string;
  display_type: string;
  position: number | null;
  product_option_values: { id: string; label: string; color_hex: string | null; position: number | null }[];
}

interface ProductVariant {
  id: string;
  price: number;
  quantity: number;
  is_active: boolean | null;
  option_values: any;
  image_url: string | null;
}

const formLabels: Record<string, Record<string, string>> = {
  ar: { orderNow: 'اطلب الآن', name: 'الاسم الكامل', phone: 'رقم الهاتف', wilaya: 'الولاية', baladiya: 'البلدية', deliveryType: 'نوع التوصيل', office: 'إلى المكتب', home: 'إلى المنزل', address: 'العنوان', submit: 'تأكيد الطلب', subtitle: 'املأ النموذج وسنتواصل معك', namePh: 'أدخل اسمك', phonePh: '05XXXXXXXX', wilayaPh: 'اختر الولاية', baladiyaPh: 'اختر البلدية', addressPh: 'عنوان التوصيل', secure: 'آمن', fast: 'سريع', guaranteed: 'مضمون', fastDelivery: 'توصيل سريع', securePayment: 'دفع آمن', freeReturns: 'إرجاع مجاني', qualityGuaranteed: 'جودة مضمونة', reviews: '⭐ آراء عملائنا', required: 'مطلوب', invalidPhone: 'رقم هاتف غير صحيح', selectVariant: 'يرجى اختيار جميع الخيارات', faq: 'أسئلة شائعة', thankYouTitle: 'شكراً لك! 🎉', thankYouMsg: 'تم تسجيل طلبك بنجاح', thankYouSub: 'سنتواصل معك قريباً لتأكيد الطلب', orderNumber: 'رقم الطلب', close: 'إغلاق' },
  en: { orderNow: 'Order Now', name: 'Full Name', phone: 'Phone Number', wilaya: 'Wilaya', baladiya: 'City', deliveryType: 'Delivery Type', office: 'To Office', home: 'To Home', address: 'Address', submit: 'Confirm Order', subtitle: "Fill the form and we'll contact you", namePh: 'Enter your name', phonePh: '05XXXXXXXX', wilayaPh: 'Select wilaya', baladiyaPh: 'Select city', addressPh: 'Delivery address', secure: 'Secure', fast: 'Fast', guaranteed: 'Guaranteed', fastDelivery: 'Fast Delivery', securePayment: 'Secure Payment', freeReturns: 'Free Returns', qualityGuaranteed: 'Quality Guaranteed', reviews: '⭐ Customer Reviews', required: 'Required', invalidPhone: 'Invalid phone number', selectVariant: 'Please select all options', faq: 'FAQ', thankYouTitle: 'Thank You! 🎉', thankYouMsg: 'Your order has been placed successfully', thankYouSub: 'We will contact you soon to confirm your order', orderNumber: 'Order Number', close: 'Close' },
  fr: { orderNow: 'Commander Maintenant', name: 'Nom complet', phone: 'Téléphone', wilaya: 'Wilaya', baladiya: 'Commune', deliveryType: 'Type de livraison', office: 'Au bureau', home: 'À domicile', address: 'Adresse', submit: 'Confirmer la commande', subtitle: 'Remplissez le formulaire et nous vous contacterons', namePh: 'Entrez votre nom', phonePh: '05XXXXXXXX', wilayaPh: 'Sélectionner wilaya', baladiyaPh: 'Sélectionner commune', addressPh: 'Adresse de livraison', secure: 'Sécurisé', fast: 'Rapide', guaranteed: 'Garanti', fastDelivery: 'Livraison rapide', securePayment: 'Paiement sécurisé', freeReturns: 'Retour gratuit', qualityGuaranteed: 'Qualité garantie', reviews: '⭐ Avis Clients', required: 'Requis', invalidPhone: 'Numéro de téléphone invalide', selectVariant: 'Veuillez sélectionner toutes les options', faq: 'FAQ', thankYouTitle: 'Merci ! 🎉', thankYouMsg: 'Votre commande a été enregistrée avec succès', thankYouSub: 'Nous vous contacterons bientôt pour confirmer votre commande', orderNumber: 'Numéro de commande', close: 'Fermer' },
};

export default function LandingPage() {
  const { id } = useParams<{ id: string }>();
  const { trackEvent } = useFacebookPixel();
  const orderGuard = useOrderGuard();

  // Form state
  const [orderName, setOrderName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderWilayaId, setOrderWilayaId] = useState('');
  const [orderBaladiya, setOrderBaladiya] = useState('');
  const [orderDeliveryType, setOrderDeliveryType] = useState('');
  const [orderAddress, setOrderAddress] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  // Fetch landing page
  const { data: page, isLoading } = useQuery({
    queryKey: ['landing-page', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 30,
  });

  // Fetch product
  const { data: product } = useQuery({
    queryKey: ['landing-product', page?.product_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, old_price, images, main_image_index, has_variants')
        .eq('id', page!.product_id)
        .single();
      return data;
    },
    enabled: !!page?.product_id,
    staleTime: 1000 * 60 * 30,
  });

  // Fetch option groups & variants
  const { data: optionGroups } = useQuery({
    queryKey: ['lp-option-groups', product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_option_groups')
        .select('*, product_option_values(*)')
        .eq('product_id', product!.id)
        .order('position');
      return (data || []) as OptionGroup[];
    },
    enabled: !!product?.id && !!product?.has_variants,
    staleTime: 1000 * 60 * 30,
  });

  const { data: productVariants } = useQuery({
    queryKey: ['lp-variants', product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product!.id)
        .eq('is_active', true);
      return (data || []) as ProductVariant[];
    },
    enabled: !!product?.id && !!product?.has_variants,
    staleTime: 1000 * 60 * 30,
  });

  // Legacy variations
  const { data: legacyVariations } = useQuery({
    queryKey: ['lp-legacy-vars', product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', product!.id)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!product?.id && !product?.has_variants,
    staleTime: 1000 * 60 * 30,
  });

  // Match variant
  useEffect(() => {
    if (!optionGroups || !productVariants || optionGroups.length === 0) {
      setSelectedVariantId(null);
      return;
    }
    if (Object.keys(selectedOptions).length < optionGroups.length) {
      setSelectedVariantId(null);
      return;
    }
    const match = productVariants.find(v => {
      const ov = v.option_values as Record<string, string>;
      return optionGroups.every(g => ov[g.name] === selectedOptions[g.name]);
    });
    setSelectedVariantId(match?.id || null);
  }, [selectedOptions, optionGroups, productVariants]);

  const activeVariant = productVariants?.find(v => v.id === selectedVariantId);
  const displayPrice = activeVariant?.price ?? product?.price ?? 0;

  // Fetch wilayas
  const { data: wilayas } = useQuery({
    queryKey: ['wilayas-lp'],
    queryFn: async () => {
      const { data } = await supabase.from('wilayas').select('*').eq('is_active', true).order('name');
      return data || [];
    },
    staleTime: 1000 * 60 * 60,
  });

  const { data: baladiyat } = useQuery({
    queryKey: ['baladiyat-lp', orderWilayaId],
    queryFn: async () => {
      const { data } = await supabase.from('baladiyat').select('*').eq('wilaya_id', orderWilayaId).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!orderWilayaId,
  });

  const content = page?.content as LandingContent | undefined;
  const lang = page?.language || 'ar';
  const fl = formLabels[lang] || formLabels.en;
  const isRtl = lang === 'ar';
  const selectedWilaya = wilayas?.find(w => w.id === orderWilayaId);

  const heroImage = (page?.generated_images as string[])?.[0] || page?.selected_image || product?.images?.[0];
  const detailImage = (page?.generated_images as string[])?.[1] || page?.selected_image || product?.images?.[0];
  const galleryImage = (page?.generated_images as string[])?.[2] || null;

  // Legacy grouped
  const legacyGrouped = (legacyVariations || []).reduce<Record<string, typeof legacyVariations>>((acc, v) => {
    if (!acc[v.variation_type]) acc[v.variation_type] = [];
    acc[v.variation_type]!.push(v);
    return acc;
  }, {});

  // FB Pixel: ViewContent on load
  useEffect(() => {
    if (product && content) {
      trackEvent('ViewContent', {
        content_name: product.name,
        content_ids: [product.id],
        content_type: 'product',
        value: product.price,
        currency: 'DZD',
      });
    }
  }, [product?.id]);

  useEffect(() => {
    if (content?.headline) {
      document.title = content.headline;
    }
  }, [content?.headline]);

  // Abandoned cart capture: save when user fills name+phone but doesn't submit
  const [abandonedId, setAbandonedId] = useState<string | null>(null);
  useEffect(() => {
    if (orderSuccess) return;
    const phone = orderPhone.replace(/\s/g, '');
    if (orderName.trim().length < 2 || phone.length < 10 || !product || !id) return;

    const timer = setTimeout(async () => {
      try {
        const cartItems = [{
          product_id: product.id,
          name: product.name,
          price: displayPrice,
          quantity: 1,
          image: product.images?.[0] || '',
        }];
        const { data: aid } = await supabase.rpc('upsert_abandoned_order', {
          p_name: orderName.trim(),
          p_phone: phone,
          p_wilaya: selectedWilaya?.name || null,
          p_cart_items: cartItems,
          p_cart_total: displayPrice,
          p_item_count: 1,
          p_notes: `landing_page_id:${id}`,
        });
        if (aid && !abandonedId) setAbandonedId(aid as unknown as string);
      } catch (e) {
        console.error('Abandoned cart capture error:', e);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [orderName, orderPhone, orderWilayaId, product?.id, displayPrice, orderSuccess]);

  const handleOrderSubmit = async () => {
    if (!product || !id) return;
    const errors: Record<string, string> = {};
    if (!orderName.trim()) errors.name = fl.required;
    if (!orderPhone.trim()) errors.phone = fl.required;
    else if (!/^0[567]\d{8}$/.test(orderPhone)) errors.phone = fl.invalidPhone;
    if (!orderWilayaId) errors.wilaya = fl.required;
    if (product.has_variants && optionGroups && optionGroups.length > 0 && !selectedVariantId) {
      errors.variant = fl.selectVariant;
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const guard = await orderGuard.verify({ phone: orderPhone, userId: null });
    if (!guard.ok) {
      setFormErrors({ phone: guard.message || 'تعذر إرسال الطلب' });
      if (guard.reason === 'guest_limit') {
        window.location.href = '/auth';
      }
      return;
    }

    setOrderSubmitting(true);
    try {
      const shippingCost = selectedWilaya
        ? (orderDeliveryType === 'home' ? Number(selectedWilaya.shipping_price_home) : Number(selectedWilaya.shipping_price))
        : 0;
      const total = displayPrice + shippingCost;

      trackEvent('InitiateCheckout', {
        content_ids: [product.id],
        num_items: 1,
        value: total,
        currency: 'DZD',
      });

      const { data: rpcData, error } = await supabase.rpc('create_public_order', {
        p_order: {
          customer_name: orderName,
          customer_phone: orderPhone,
          wilaya_id: orderWilayaId || null,
          baladiya: orderBaladiya || null,
          delivery_type: orderDeliveryType || 'office',
          address: orderAddress || null,
          subtotal: displayPrice,
          shipping_cost: shippingCost,
          total_amount: total,
          payment_method: 'cod',
          landing_page_id: id,
        },
        p_items: [{
          product_id: product.id,
          variant_id: selectedVariantId || null,
          quantity: 1,
          unit_price: displayPrice,
        }],
      });
      if (error) throw error;
      const order = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      trackEvent('Purchase', {
        content_ids: [product.id],
        content_type: 'product',
        value: total,
        currency: 'DZD',
        num_items: 1,
      });

      // Telegram notification is handled server-side by a database trigger.

      setOrderNumber(order.order_number || order.id.slice(0, 8).toUpperCase());
      setOrderSuccess(true);
      setShowThankYou(true);
    } catch (e: any) {
      console.error(e);
      setFormErrors({ submit: e.message || 'Error' });
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!page || !content) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#94a3b8', fontFamily: 'system-ui' }}>
        <p>Page not found</p>
      </div>
    );
  }

  // Render variant selection
  const renderVariants = () => {
    if (product?.has_variants && optionGroups && optionGroups.length > 0) {
      return (
        <div style={{ marginBottom: '1.25rem' }}>
          {optionGroups.map(group => (
            <div key={group.id} style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{group.name} *</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(group.product_option_values || [])
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map(val => {
                    const isSelected = selectedOptions[group.name] === val.label;
                    return (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [group.name]: val.label }))}
                        style={{
                          padding: group.display_type === 'color' ? '0' : '0.5rem 1rem',
                          borderRadius: group.display_type === 'color' ? '50%' : '0.5rem',
                          width: group.display_type === 'color' ? '2.5rem' : 'auto',
                          height: group.display_type === 'color' ? '2.5rem' : 'auto',
                          border: isSelected ? '2px solid #f97316' : '1px solid #334155',
                          background: group.display_type === 'color' ? (val.color_hex || '#888') : (isSelected ? 'rgba(249,115,22,0.1)' : '#1e293b'),
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: isSelected ? 700 : 400,
                        }}
                        title={val.label}
                      >
                        {group.display_type !== 'color' && val.label}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
          {formErrors.variant && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{formErrors.variant}</p>}
        </div>
      );
    }

    if (!product?.has_variants && Object.keys(legacyGrouped).length > 0) {
      return (
        <div style={{ marginBottom: '1.25rem' }}>
          {Object.entries(legacyGrouped).map(([type, vars]) => (
            <div key={type} style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{type}</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(vars || []).map(v => {
                  const isSelected = selectedOptions[type] === v.variation_value;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedOptions(prev => ({ ...prev, [type]: v.variation_value }))}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: isSelected ? '2px solid #f97316' : '1px solid #334155',
                        background: isSelected ? 'rgba(249,115,22,0.1)' : '#1e293b',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: isSelected ? 700 : 400,
                      }}
                    >
                      {v.variation_value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  // Thank You Modal
  const renderThankYouModal = () => {
    if (!showThankYou) return null;
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.3s ease-out',
        }}
        onClick={() => setShowThankYou(false)}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: '1.5rem', padding: '3rem 2.5rem',
            maxWidth: '480px', width: '90%', textAlign: 'center',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.4s ease-out',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>
            {fl.thankYouTitle}
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '0.5rem', fontWeight: 600 }}>
            {fl.thankYouMsg}
          </p>
          <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '1.5rem' }}>
            {fl.thankYouSub}
          </p>
          {orderNumber && (
            <div style={{
              display: 'inline-block', padding: '0.75rem 1.5rem',
              background: '#f0fdf4', borderRadius: '0.75rem', border: '1px solid #bbf7d0',
              marginBottom: '1.5rem',
            }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{fl.orderNumber}: </span>
              <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.1rem' }}>{orderNumber}</span>
            </div>
          )}
          <div>
            <button
              onClick={() => setShowThankYou(false)}
              style={{
                padding: '0.85rem 2.5rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff',
                border: 'none', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {fl.close}
            </button>
          </div>
        </div>
        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(30px) } to { opacity: 1; transform: translateY(0) } }
        `}</style>
      </div>
    );
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ background: '#fff', color: '#1a1a1a', fontFamily: 'system-ui,-apple-system,sans-serif', margin: 0 }}>
      {/* Thank You Modal */}
      {renderThankYouModal()}

      {/* Hero */}
      <div style={{ position: 'relative', minHeight: '95vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
        {heroImage && (
          <img src={heroImage} alt={product?.name} loading="eager" fetchPriority="high" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4, filter: 'blur(1px)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(15,23,42,0.3) 0%,rgba(15,23,42,0.5) 40%,rgba(15,23,42,0.85) 100%)' }} />
        {/* Decorative gradient orbs */}
        <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(249,115,22,0.15),transparent 70%)', top: '-100px', right: '-100px', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.1),transparent 70%)', bottom: '-50px', left: '-50px', filter: 'blur(60px)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff', padding: '3rem 2rem', maxWidth: '850px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '9999px', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#fb923c', fontWeight: 600, backdropFilter: 'blur(8px)' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f97316', animation: 'pulse 2s infinite' }} />
            {lang === 'ar' ? 'عرض محدود' : lang === 'fr' ? 'Offre limit\u00e9e' : 'Limited Offer'}
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem,7vw,4.5rem)', fontWeight: 900, marginBottom: '1.5rem', lineHeight: 1.05, textShadow: '0 4px 30px rgba(0,0,0,0.4)', letterSpacing: '-0.02em' }}>{content.headline}</h1>
          <p style={{ fontSize: '1.3rem', opacity: 0.85, marginBottom: '2rem', lineHeight: 1.7, maxWidth: '650px', margin: '0 auto 2.5rem' }}>{content.subheadline}</p>
          {/* Price badge in hero */}
          {product && (
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.75rem', padding: '0.75rem 2rem', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.15)', marginBottom: '2rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#f97316' }}>{displayPrice} DA</span>
              {product.old_price && <span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>{product.old_price} DA</span>}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#order-form" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1.1rem 2.75rem', borderRadius: '1rem', fontWeight: 800, fontSize: '1.15rem', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', textDecoration: 'none', boxShadow: '0 8px 30px rgba(249,115,22,0.4), inset 0 1px 0 rgba(255,255,255,0.2)', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(249,115,22,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(249,115,22,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'; }}>
              {content.cta_primary}
            </a>
            <a href="#details" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1.1rem 2.75rem', borderRadius: '1rem', fontWeight: 700, fontSize: '1.15rem', border: '2px solid rgba(255,255,255,0.3)', color: '#fff', textDecoration: 'none', backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.05)', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}>
              {content.cta_secondary}
            </a>
          </div>
          {/* Scroll indicator */}
          <div style={{ marginTop: '3rem', animation: 'bounce 2s infinite' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><path d="M7 13l5 5 5-5"/><path d="M7 6l5 5 5-5"/></svg>
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', padding: '1.25rem 2rem', background: 'linear-gradient(90deg,#f8fafc,#fff,#f8fafc)', borderBottom: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        {[
          { icon: '🚚', text: fl.fastDelivery },
          { icon: '🛡️', text: fl.securePayment },
          { icon: '↩️', text: fl.freeReturns },
          { icon: '⭐', text: fl.qualityGuaranteed },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600, padding: '0.5rem 1rem', background: 'rgba(249,115,22,0.04)', borderRadius: '9999px', border: '1px solid rgba(249,115,22,0.08)' }}>
            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.5rem', padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {content.benefits.map((b, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderRadius: '1.5rem', background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'default' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)'; }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: 'linear-gradient(135deg,#fff7ed,#fef3c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem' }}>{b.icon}</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.6rem', color: '#0f172a' }}>{b.title}</h3>
            <p style={{ color: '#64748b', lineHeight: 1.7, fontSize: '0.95rem' }}>{b.text}</p>
          </div>
        ))}
      </div>

      {/* Before / After */}
      {content.before_after && (
        <div style={{ padding: '4rem 2rem', background: '#f8fafc' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '2.5rem', color: '#0f172a' }}>
              {lang === 'ar' ? '✨ التحول' : lang === 'fr' ? '✨ La Transformation' : '✨ The Transformation'}
            </h2>
            {/* Transformation Image */}
            {content.before_after.image_url && (
              <div style={{ marginBottom: '2.5rem', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                <img src={content.before_after.image_url} alt="Transformation" loading="lazy" style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ padding: '2.5rem 2rem', borderRadius: '1.5rem', background: '#fee2e2', border: '2px solid #fca5a5', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>😔</div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#991b1b', marginBottom: '0.75rem' }}>{lang === 'ar' ? 'قبل' : lang === 'fr' ? 'Avant' : 'Before'}</h3>
                <p style={{ color: '#7f1d1d', lineHeight: 1.7 }}>{content.before_after.before_text}</p>
              </div>
              <div style={{ padding: '2.5rem 2rem', borderRadius: '1.5rem', background: '#dcfce7', border: '2px solid #86efac', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>😍</div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#166534', marginBottom: '0.75rem' }}>{lang === 'ar' ? 'بعد' : lang === 'fr' ? 'Après' : 'After'}</h3>
                <p style={{ color: '#14532d', lineHeight: 1.7 }}>{content.before_after.after_text}</p>
              </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#475569' }}>{content.before_after.switch_line}</p>
          </div>
        </div>
      )}

      {/* Authority & Social Validation */}
      {(content.authority_text || (content.social_proof_stats && content.social_proof_stats.length > 0)) && (
        <div style={{ padding: '4rem 2rem', background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
            {content.authority_text && (
              <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '2.5rem', fontWeight: 600 }}>{content.authority_text}</p>
            )}
            {content.social_proof_stats && content.social_proof_stats.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                {content.social_proof_stats.map((stat, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f97316', marginBottom: '0.25rem' }}>{stat.number}</div>
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Details */}
      <div id="details" style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', alignItems: 'center' }}>
        {detailImage && (
          <img src={detailImage} alt="" loading="lazy" style={{ flex: 1, minWidth: '280px', maxWidth: '500px', borderRadius: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', objectFit: 'cover' }} />
        )}
        <div style={{ flex: 1, minWidth: '280px' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '1rem', color: '#0f172a', lineHeight: 1.2 }}>{product?.name}</h2>
          <div style={{ color: '#475569', lineHeight: 1.9, whiteSpace: 'pre-line' }} dangerouslySetInnerHTML={{ __html: content.description.replace(/\n/g, '<br/>') }} />
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '1.5rem', padding: '1rem 1.5rem', background: 'linear-gradient(135deg,#fff7ed,#fef3c7)', borderRadius: '1rem', border: '1px solid #fed7aa' }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#ea580c' }}>{displayPrice} DA</span>
            {product?.old_price && (
              <span style={{ fontSize: '1.2rem', color: '#9ca3af', textDecoration: 'line-through' }}>{product.old_price} DA</span>
            )}
          </div>
        </div>
      </div>

      {/* How It Works */}
      {content.how_it_works && content.how_it_works.length > 0 && (
        <div style={{ padding: '4rem 2rem', background: '#f8fafc' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '3rem', color: '#0f172a' }}>
            {lang === 'ar' ? '🔄 كيف يعمل' : lang === 'fr' ? '🔄 Comment ça marche' : '🔄 How It Works'}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
            {content.how_it_works.map((step, i) => (
              <div key={i} style={{ textAlign: 'center', flex: '1 1 220px', maxWidth: '280px' }}>
                <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, margin: '0 auto 1rem', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}>
                  {step.icon}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.5rem' }}>{step.title}</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery */}
      {galleryImage && (
        <div style={{ padding: '0 2rem 4rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '1rem' }}>
            {[heroImage, detailImage, galleryImage].filter(Boolean).map((img, i) => (
              <img key={i} src={img!} alt="" loading="lazy" style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '1rem' }} />
            ))}
          </div>
        </div>
      )}

      {/* Testimonials */}
      <div style={{ padding: '4rem 2rem', background: '#f8fafc' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '2.5rem', color: '#0f172a' }}>{fl.reviews}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
          {content.testimonials.map((rev, i) => {
            const initials = rev.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const gradients = [
              'linear-gradient(135deg, #f97316, #ea580c)',
              'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              'linear-gradient(135deg, #06b6d4, #0891b2)',
              'linear-gradient(135deg, #10b981, #059669)',
              'linear-gradient(135deg, #ec4899, #db2777)',
            ];
            const gradient = gradients[i % gradients.length];
            return (
              <div key={i} style={{
                background: '#fff', borderRadius: '1rem', padding: '2rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                borderLeft: '4px solid transparent',
                borderImage: 'linear-gradient(to bottom, #f97316, #ea580c) 1',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative' as const,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 30px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(0,0,0,0.06)'; }}
              >
                {/* Quote icon */}
                <div style={{ fontSize: '3rem', lineHeight: 1, color: '#f97316', opacity: 0.2, fontFamily: 'Georgia, serif', marginBottom: '0.5rem' }}>"</div>
                {/* Review text */}
                <p style={{ color: '#475569', lineHeight: 1.8, marginBottom: '1rem', fontSize: '0.95rem' }}>"{rev.text}"</p>
                {/* Stars */}
                <div style={{ color: '#f59e0b', marginBottom: '1rem', fontSize: '1rem', letterSpacing: '2px' }}>
                  {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                </div>
                {/* Avatar + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', background: gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                  }}>{initials}</div>
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a', display: 'block', fontSize: '0.95rem' }}>{rev.name}</span>
                    <span style={{ fontSize: '0.7rem', background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {lang === 'ar' ? 'شراء موثق' : lang === 'fr' ? 'Achat vérifié' : 'Verified Purchase'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guarantee */}
      {content.guarantee_text && (
        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '2rem 3rem', borderRadius: '1.5rem', background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: '2px solid #6ee7b7' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🛡️</div>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }}>{content.guarantee_text}</p>
          </div>
        </div>
      )}

      {/* FAQ */}
      {content.faq && content.faq.length > 0 && (
        <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '2rem', color: '#0f172a' }}>
            ❓ {fl.faq}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {content.faq.map((item, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', fontSize: '1.05rem' }}>{item.question}</h3>
                <p style={{ color: '#64748b', lineHeight: 1.7 }}>{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgency */}
      <div style={{ background: 'linear-gradient(135deg,#dc2626,#ea580c)', color: '#fff', textAlign: 'center', padding: '1.25rem', fontSize: '1.2rem', fontWeight: 700 }}>
        🔥 {content.urgency_text}
      </div>

      {/* Order Form */}
      <div id="order-form" style={{ padding: '4rem 2rem', background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Glassmorphism form card */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(249,115,22,0.3)',
            boxShadow: '0 0 40px rgba(249,115,22,0.08), 0 25px 50px rgba(0,0,0,0.3)',
            padding: '2rem 1.5rem',
            position: 'relative' as const,
            overflow: 'hidden',
          }}>
            {/* Animated glow border */}
            <div style={{
              position: 'absolute' as const, inset: '-2px', borderRadius: '1.5rem', zIndex: 0,
              background: 'linear-gradient(135deg, #f97316, #ea580c, #f97316, #ea580c)',
              backgroundSize: '300% 300%',
              animation: 'glowBorder 4s ease infinite',
              opacity: 0.4,
            }} />
            <div style={{
              position: 'relative' as const, zIndex: 1,
              background: 'rgba(15,23,42,0.95)',
              borderRadius: '1.25rem',
              padding: '2rem 1.5rem',
            }}>
              {/* Form Header with product image */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                {product?.images?.[0] && (
                  <img src={product.images[0]} alt={product.name} style={{ width: '60px', height: '60px', borderRadius: '0.75rem', objectFit: 'cover', border: '2px solid rgba(249,115,22,0.3)' }} />
                )}
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                    <svg style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    {fl.orderNow}
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>{fl.subtitle}</p>
                </div>
              </div>

              {/* Urgency badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '9999px', fontSize: '0.8rem', color: '#fca5a5', fontWeight: 600, marginBottom: '1.25rem' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
                🔥 {lang === 'ar' ? 'كمية محدودة' : lang === 'fr' ? 'Stock limité' : 'Limited Stock'}
              </div>

              {/* Price box */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(249,115,22,0.08)', borderRadius: '1rem', border: '1px solid rgba(249,115,22,0.2)' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{product?.name}</span>
                <div style={{ marginTop: '0.4rem' }}>
                  {product?.old_price && (
                    <span style={{ fontSize: '1.1rem', color: '#6b7280', textDecoration: 'line-through', marginRight: '0.75rem' }}>{product.old_price} DA</span>
                  )}
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: '#f97316' }}>{displayPrice} DA</span>
                </div>
              </div>

              {orderSuccess ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(34,197,94,0.1)', borderRadius: '1rem', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>{fl.thankYouMsg}</p>
                  <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>{fl.thankYouSub}</p>
                </div>
              ) : (
                <>
                  <orderGuard.HoneypotField />
                  {/* Variants */}
                  {renderVariants()}

                  {/* Name field with icon */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{fl.name} *</label>
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: '0.75rem', border: formErrors.name ? '2px solid #ef4444' : '1px solid #334155', background: '#1e293b', overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s' }}>
                      <span style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </span>
                      <input type="text" value={orderName} onChange={e => setOrderName(e.target.value)} placeholder={fl.namePh} style={{ flex: 1, padding: '0.85rem 0.75rem 0.85rem 0', border: 'none', background: 'transparent', color: '#fff', fontSize: '1rem', outline: 'none' }} />
                    </div>
                    {formErrors.name && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{formErrors.name}</p>}
                  </div>

                  {/* Phone field with icon */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{fl.phone} *</label>
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: '0.75rem', border: formErrors.phone ? '2px solid #ef4444' : '1px solid #334155', background: '#1e293b', overflow: 'hidden' }}>
                      <span style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </span>
                      <input type="tel" inputMode="numeric" maxLength={10} pattern="0[567][0-9]{8}" value={orderPhone} onChange={e => setOrderPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder={fl.phonePh} dir="ltr" style={{ flex: 1, padding: '0.85rem 0.75rem 0.85rem 0', border: 'none', background: 'transparent', color: '#fff', fontSize: '1rem', outline: 'none' }} />
                    </div>
                    {formErrors.phone && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{formErrors.phone}</p>}
                  </div>

                  {/* Wilaya with icon */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{fl.wilaya} *</label>
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: '0.75rem', border: formErrors.wilaya ? '2px solid #ef4444' : '1px solid #334155', background: '#1e293b', overflow: 'hidden' }}>
                      <span style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </span>
                      <select value={orderWilayaId} onChange={e => { setOrderWilayaId(e.target.value); setOrderBaladiya(''); setOrderDeliveryType(''); }} style={{ flex: 1, padding: '0.85rem 0.75rem 0.85rem 0', border: 'none', background: 'transparent', color: '#fff', fontSize: '1rem', outline: 'none' }}>
                        <option value="" style={{ background: '#1e293b' }}>{fl.wilayaPh}</option>
                        {wilayas?.map(w => <option key={w.id} value={w.id} style={{ background: '#1e293b' }}>{w.name}</option>)}
                      </select>
                    </div>
                    {formErrors.wilaya && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{formErrors.wilaya}</p>}
                  </div>

                  {/* Baladiya with icon */}
                  {orderWilayaId && baladiyat && baladiyat.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{fl.baladiya}</label>
                      <div style={{ display: 'flex', alignItems: 'center', borderRadius: '0.75rem', border: '1px solid #334155', background: '#1e293b', overflow: 'hidden' }}>
                        <span style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                        </span>
                        <select value={orderBaladiya} onChange={e => setOrderBaladiya(e.target.value)} style={{ flex: 1, padding: '0.85rem 0.75rem 0.85rem 0', border: 'none', background: 'transparent', color: '#fff', fontSize: '1rem', outline: 'none' }}>
                          <option value="" style={{ background: '#1e293b' }}>{fl.baladiyaPh}</option>
                          {baladiyat.map(b => <option key={b.id} value={b.name} style={{ background: '#1e293b' }}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Delivery Type Cards with icons */}
                  {orderWilayaId && selectedWilaya && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{fl.deliveryType}</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <button type="button" onClick={() => setOrderDeliveryType('office')} style={{
                          padding: '1rem', borderRadius: '0.75rem',
                          border: orderDeliveryType === 'office' ? '2px solid #f97316' : '1px solid #334155',
                          background: orderDeliveryType === 'office' ? 'rgba(249,115,22,0.12)' : '#1e293b',
                          boxShadow: orderDeliveryType === 'office' ? '0 0 15px rgba(249,115,22,0.15)' : 'none',
                          color: '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                        }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={orderDeliveryType === 'office' ? '#f97316' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.4rem' }}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                          <div style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.9rem' }}>{fl.office}</div>
                          <div style={{ color: '#f97316', fontWeight: 800 }}>{formatPrice(Number(selectedWilaya.shipping_price))}</div>
                        </button>
                        <button type="button" onClick={() => setOrderDeliveryType('home')} style={{
                          padding: '1rem', borderRadius: '0.75rem',
                          border: orderDeliveryType === 'home' ? '2px solid #f97316' : '1px solid #334155',
                          background: orderDeliveryType === 'home' ? 'rgba(249,115,22,0.12)' : '#1e293b',
                          boxShadow: orderDeliveryType === 'home' ? '0 0 15px rgba(249,115,22,0.15)' : 'none',
                          color: '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                        }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={orderDeliveryType === 'home' ? '#f97316' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.4rem' }}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                          <div style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.9rem' }}>{fl.home}</div>
                          <div style={{ color: '#f97316', fontWeight: 800 }}>{formatPrice(Number(selectedWilaya.shipping_price_home))}</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Address with icon */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{fl.address}</label>
                    <div style={{ display: 'flex', alignItems: 'flex-start', borderRadius: '0.75rem', border: '1px solid #334155', background: '#1e293b', overflow: 'hidden' }}>
                      <span style={{ padding: '0.85rem 0.75rem 0 0.75rem', display: 'flex', alignItems: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      </span>
                      <textarea value={orderAddress} onChange={e => setOrderAddress(e.target.value)} placeholder={fl.addressPh} rows={2} style={{ flex: 1, padding: '0.85rem 0.75rem 0.85rem 0', border: 'none', background: 'transparent', color: '#fff', fontSize: '1rem', outline: 'none', resize: 'vertical' }} />
                    </div>
                  </div>

                  {/* Order Summary */}
                  {orderWilayaId && selectedWilaya && orderDeliveryType && (
                    <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                        <span>{lang === 'ar' ? 'سعر المنتج' : lang === 'fr' ? 'Prix produit' : 'Product price'}</span>
                        <span style={{ color: '#e2e8f0' }}>{formatPrice(displayPrice)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                        <span>{lang === 'ar' ? 'التوصيل' : lang === 'fr' ? 'Livraison' : 'Shipping'}</span>
                        <span style={{ color: '#e2e8f0' }}>{formatPrice(orderDeliveryType === 'home' ? Number(selectedWilaya.shipping_price_home) : Number(selectedWilaya.shipping_price))}</span>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                        <span style={{ color: '#e2e8f0' }}>{lang === 'ar' ? 'المجموع' : 'Total'}</span>
                        <span style={{ color: '#f97316' }}>{formatPrice(displayPrice + (orderDeliveryType === 'home' ? Number(selectedWilaya.shipping_price_home) : Number(selectedWilaya.shipping_price)))}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit error */}
                  {formErrors.submit && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>{formErrors.submit}</p>}

                  {/* Submit Button */}
                  <button type="button" onClick={handleOrderSubmit} disabled={orderSubmitting} style={{
                    width: '100%', padding: '1.1rem', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '0.75rem', fontSize: '1.2rem', fontWeight: 800, cursor: orderSubmitting ? 'not-allowed' : 'pointer', opacity: orderSubmitting ? 0.7 : 1, marginTop: '0.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                    boxShadow: '0 4px 20px rgba(249,115,22,0.4)',
                    animation: orderSubmitting ? 'none' : 'subtlePulse 2s ease-in-out infinite',
                  }}>
                    {orderSubmitting ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                    )}
                    {orderSubmitting ? '...' : fl.submit}
                  </button>
                </>
              )}

              {/* Trust Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '1.5rem' }}>
                {[
                  { icon: 'M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', label: fl.securePayment, viewBox: '0 0 24 24' },
                  { icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', label: fl.fastDelivery, viewBox: '0 0 24 24' },
                  { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: fl.qualityGuaranteed, viewBox: '0 0 24 24' },
                  { icon: 'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15', label: fl.freeReturns, viewBox: '0 0 24 24' },
                ].map((badge, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '0.6rem 0.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <svg width="18" height="18" viewBox={badge.viewBox} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.3rem', display: 'block' }}><path d={badge.icon}/></svg>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, lineHeight: 1.2, display: 'block' }}>{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating CTA Button */}
      <a href="#order-form" style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 2rem', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', borderRadius: '9999px', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 30px rgba(249,115,22,0.4), 0 0 0 4px rgba(249,115,22,0.15)', animation: 'subtlePulse 2s ease-in-out infinite' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
        {fl.orderNow}
      </a>
      <style>{`
        @keyframes glowBorder { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes subtlePulse { 0%,100%{transform:translateX(-50%) scale(1)} 50%{transform:translateX(-50%) scale(1.03)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
