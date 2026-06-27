import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/format';
import { generateImageWithPuter } from '@/lib/puterImageGen';
import { generateTextWithPuter } from '@/lib/puterTextGen';
import {
  Rocket, Sparkles, RefreshCw, Copy, ExternalLink, Check, Star,
  Pencil, ShoppingCart, ImagePlus, Wand2, ArrowDown, Package, Shield,
  Truck, RotateCcw, Phone, User, MapPin, CheckCircle, Loader2,
  Save, Trash2, FileText, Building2, Home, Eye, Link2, HelpCircle
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  description: string | null;
  short_description: string | null;
  category: string[];
  images: string[] | null;
  main_image_index: number | null;
  stock: number | null;
  has_variants: boolean | null;
}

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

interface SavedLandingPage {
  id: string;
  product_id: string;
  title: string;
  language: string;
  content: LandingContent;
  selected_image: string | null;
  generated_images: string[];
  created_at: string;
  updated_at: string;
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

const LANGUAGES = [
  { value: 'ar', label: 'العربية', flag: '🇩🇿' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

function getImagePrompts(product: Product): string[] {
  const cats = (product.category || []).map(c => c.toLowerCase());
  const name = product.name;
  const desc = product.description || product.short_description || '';
  const isFashion = cats.some(c => ['ملابس', 'أزياء', 'clothing', 'fashion', 'vêtements'].includes(c));
  const isElectronics = cats.some(c => ['إلكترونيات', 'electronics', 'électronique'].includes(c));
  const isKitchen = cats.some(c => ['مطبخ', 'kitchen', 'cuisine'].includes(c));

  if (isFashion) {
    return [
      `Professional lifestyle photo of a person wearing ${name}, ${desc}, modern urban setting, natural lighting, fashion photography, high resolution, 4K`,
      `Close-up detail shot of ${name} showing fabric texture and stitching quality, studio lighting, product photography, macro, 4K`,
      `Stylish flatlay of ${name} with complementary accessories, clean aesthetic, lifestyle product photography, 4K`,
    ];
  }
  if (isElectronics) {
    return [
      `${name} on a modern minimalist desk setup, ${desc}, tech lifestyle photography, ambient lighting, professional, 4K`,
      `Close-up detail of ${name} showing build quality and design details, studio macro shot, commercial photography, 4K`,
      `Person using ${name} in a modern home office, lifestyle photography, natural light, candid, 4K`,
    ];
  }
  if (isKitchen) {
    return [
      `${name} in a beautiful modern kitchen, ${desc}, cooking scene, warm natural lighting, food photography style, 4K`,
      `Close-up of ${name} showing premium materials and craftsmanship, studio product shot, 4K`,
      `Chef using ${name} while preparing a meal, action shot, professional kitchen photography, 4K`,
    ];
  }
  return [
    `${name} in its natural environment, ${desc}, lifestyle photography, professional lighting, high resolution, 4K`,
    `Close-up detail shot of ${name} highlighting quality and texture, studio lighting, commercial photography, 4K`,
    `Person using ${name} in everyday life, candid lifestyle photo, natural light, professional, 4K`,
  ];
}

export default function AdminLandingPagePage() {
  const { t, language, dir } = useTranslation();
  const isRtl = dir === 'rtl';
  const qc = useQueryClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState<string>(language);
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<LandingContent | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [step, setStep] = useState(1);
  const [savedPageId, setSavedPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');
  const previewRef = useRef<HTMLDivElement>(null);

  // Order form state
  const [orderName, setOrderName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderWilayaId, setOrderWilayaId] = useState('');
  const [orderBaladiya, setOrderBaladiya] = useState('');
  const [orderDeliveryType, setOrderDeliveryType] = useState('');
  const [orderAddress, setOrderAddress] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Variant selection state
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, old_price, description, short_description, category, images, main_image_index, stock, has_variants')
        .eq('is_active', true)
        .order('name');
      setProducts(data || []);
    };
    fetchProducts();
  }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Fetch option groups & variants for selected product
  const { data: optionGroups } = useQuery({
    queryKey: ['landing-option-groups', selectedProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_option_groups')
        .select('*, product_option_values(*)')
        .eq('product_id', selectedProductId)
        .order('position');
      return (data || []) as OptionGroup[];
    },
    enabled: !!selectedProductId && !!selectedProduct?.has_variants,
  });

  const { data: productVariants } = useQuery({
    queryKey: ['landing-variants', selectedProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', selectedProductId)
        .eq('is_active', true);
      return (data || []) as ProductVariant[];
    },
    enabled: !!selectedProductId && !!selectedProduct?.has_variants,
  });

  // Legacy variations
  const { data: legacyVariations } = useQuery({
    queryKey: ['landing-legacy-variations', selectedProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', selectedProductId)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!selectedProductId && !selectedProduct?.has_variants,
  });

  // Find matching variant based on selected options
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
  const displayPrice = activeVariant?.price ?? selectedProduct?.price ?? 0;

  // Fetch wilayas for the order form
  const { data: wilayas } = useQuery({
    queryKey: ['wilayas-landing'],
    queryFn: async () => {
      const { data } = await supabase.from('wilayas').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: baladiyat } = useQuery({
    queryKey: ['baladiyat-landing', orderWilayaId],
    queryFn: async () => {
      const { data } = await supabase.from('baladiyat').select('*').eq('wilaya_id', orderWilayaId).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!orderWilayaId,
  });

  const selectedWilaya = wilayas?.find(w => w.id === orderWilayaId);

  // Fetch saved landing pages
  const { data: savedPages } = useQuery({
    queryKey: ['saved-landing-pages'],
    queryFn: async () => {
      const { data } = await supabase
        .from('landing_pages')
        .select('*')
        .order('created_at', { ascending: false });
      return (data || []) as unknown as SavedLandingPage[];
    },
  });

  useEffect(() => {
    if (selectedProduct) {
      setSelectedImageIndex(selectedProduct.main_image_index || 0);
      setImagePrompt('');
      setGeneratedImages([]);
      setSavedPageId(null);
      setSelectedOptions({});
      setSelectedVariantId(null);
    }
  }, [selectedProductId]);

  const handleGenerate = async () => {
    if (!selectedProduct) return;
    setGenerating(true);
    setGeneratingImages(true);
    try {
      const imagePrompts = getImagePrompts(selectedProduct);
      const [textResult, ...imageResults] = await Promise.allSettled([
        generateTextWithPuter({
          productName: selectedProduct.name,
          price: selectedProduct.price,
          oldPrice: selectedProduct.old_price,
          description: selectedProduct.description,
          shortDescription: selectedProduct.short_description,
          category: selectedProduct.category?.join(', '),
          language: selectedLang,
        }),
        ...imagePrompts.map(prompt =>
          generateImageWithPuter(prompt).then(url => ({ data: { url }, error: null }))
        ),
      ]);

      if (textResult.status === 'fulfilled') {
        setContent(textResult.value);
        setStep(3);
        toast.success(t('landing.generated'));
      } else {
        throw textResult.reason;
      }

      const newImages: string[] = [];
      imageResults.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.data?.url) {
          newImages.push(r.value.data.url);
        }
      });
      if (newImages.length > 0) {
        setGeneratedImages(prev => [...prev, ...newImages]);
        toast.success(t('landing.imagesGenerated').replace('{n}', String(newImages.length)));
      }
    } catch (e: any) {
      toast.error(e.message || t('common.errorOccurred'));
    } finally {
      setGenerating(false);
      setGeneratingImages(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedProduct) return;
    setGeneratingImages(true);
    try {
      const prompt = imagePrompt.trim() || `High quality professional product photo of ${selectedProduct.name}, studio lighting, clean background, commercial photography, 4K ultra HD`;
      const url = await generateImageWithPuter(prompt);
      setGeneratedImages(prev => [...prev, url]);
      toast.success(t('landing.imageGenerated'));
    } catch (e: any) {
      toast.error(e.message || t('common.errorOccurred'));
    } finally {
      setGeneratingImages(false);
    }
  };

  const allImages = [
    ...(selectedProduct?.images || []),
    ...generatedImages,
  ];

  const handleSave = async () => {
    if (!content || !selectedProduct) return;
    setSaving(true);
    try {
      const payload = {
        product_id: selectedProduct.id,
        title: content.headline,
        language: selectedLang,
        content: content as any,
        selected_image: allImages[selectedImageIndex] || null,
        generated_images: generatedImages,
      };

      if (savedPageId) {
        const { error } = await supabase.from('landing_pages').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', savedPageId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('landing_pages').insert(payload).select('id').single();
        if (error) throw error;
        setSavedPageId(data.id);
      }
      qc.invalidateQueries({ queryKey: ['saved-landing-pages'] });
      toast.success(t('common.savedSuccess'));
    } catch (e: any) {
      toast.error(e.message || t('common.errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSaved = async (id: string) => {
    const { error } = await supabase.from('landing_pages').delete().eq('id', id);
    if (!error) {
      qc.invalidateQueries({ queryKey: ['saved-landing-pages'] });
      toast.success(t('common.deletedSuccess'));
      if (savedPageId === id) {
        setSavedPageId(null);
        setContent(null);
        setStep(1);
      }
    }
  };

  const handleLoadSaved = (page: SavedLandingPage) => {
    setSelectedProductId(page.product_id);
    setSelectedLang(page.language);
    setContent(page.content);
    setGeneratedImages(page.generated_images || []);
    setSavedPageId(page.id);
    setActiveTab('create');
    setStep(3);
    setTimeout(() => {
      const product = products.find(p => p.id === page.product_id);
      const imgs = [...(product?.images || []), ...(page.generated_images || [])];
      const idx = page.selected_image ? imgs.indexOf(page.selected_image) : 0;
      setSelectedImageIndex(idx >= 0 ? idx : 0);
    }, 100);
  };

  // Order submission - NO savedPageId requirement
  const handleOrderSubmit = async () => {
    if (!selectedProduct) return;
    const errors: Record<string, string> = {};
    if (!orderName.trim()) errors.name = t('common.required');
    if (!orderPhone.trim()) errors.phone = t('common.required');
    else if (!/^0[567]\d{8}$/.test(orderPhone)) errors.phone = t('landing.invalidPhone');
    if (!orderWilayaId) errors.wilaya = t('common.required');
    if (selectedProduct.has_variants && optionGroups && optionGroups.length > 0 && !selectedVariantId) {
      errors.variant = t('landing.selectVariant');
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setOrderSubmitting(true);
    try {
      const shippingCost = selectedWilaya ? (orderDeliveryType === 'home' ? Number(selectedWilaya.shipping_price_home) : Number(selectedWilaya.shipping_price)) : 0;
      const total = displayPrice + shippingCost;

      const { data: order, error } = await supabase.from('orders').insert({
        order_number: '',
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
        landing_page_id: savedPageId || null,
      } as any).select().single();
      if (error) throw error;

      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: selectedProduct.id,
        variant_id: selectedVariantId || null,
        quantity: 1,
        unit_price: displayPrice,
      });

      // Telegram notify
      // Telegram notification is handled server-side by a database trigger.

      setOrderSuccess(true);
      toast.success(t('landing.orderSuccess'));
    } catch (e: any) {
      toast.error(e.message || t('common.errorOccurred'));
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleCopyHtml = () => {
    if (!previewRef.current) return;
    const clone = previewRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    
    const innerHtml = clone.innerHTML;
    const fullHtml = `<!DOCTYPE html>
<html lang="${selectedLang}" dir="${selectedLang === 'ar' ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content?.headline || selectedProduct?.name || ''}</title>
<meta name="description" content="${content?.subheadline || ''}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#fff}
img{max-width:100%}
.lp-hero{position:relative;min-height:90vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(135deg,#0f172a,#1e293b)}
.lp-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.5}
.lp-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.3),rgba(0,0,0,0.7))}
.lp-hero-content{position:relative;z-index:1;text-align:center;color:#fff;padding:2rem;max-width:800px}
.lp-hero h1{font-size:clamp(2rem,6vw,4rem);font-weight:900;margin-bottom:1.5rem;line-height:1.1;text-shadow:0 2px 20px rgba(0,0,0,0.3)}
.lp-hero p{font-size:1.3rem;opacity:0.9;margin-bottom:2.5rem;line-height:1.6}
.lp-btn{display:inline-block;padding:1rem 2.5rem;border-radius:0.75rem;font-weight:700;font-size:1.1rem;text-decoration:none;transition:all 0.3s;cursor:pointer}
.lp-btn-primary{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;box-shadow:0 4px 20px rgba(249,115,22,0.4)}
.lp-benefits{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem;padding:5rem 2rem;max-width:1200px;margin:0 auto}
.lp-benefit{text-align:center;padding:2.5rem 2rem;border-radius:1rem;background:#fff;border:1px solid #f1f5f9}
.lp-benefit .icon{font-size:3rem;margin-bottom:1rem}
.lp-benefit h3{font-size:1.2rem;font-weight:700;margin-bottom:0.75rem;color:#0f172a}
.lp-benefit p{color:#64748b;line-height:1.6}
.lp-details{display:flex;flex-wrap:wrap;gap:4rem;padding:5rem 2rem;max-width:1200px;margin:0 auto;align-items:center}
.lp-details img{flex:1;min-width:300px;max-width:520px;border-radius:1.5rem;box-shadow:0 20px 60px rgba(0,0,0,0.12)}
.lp-details-text{flex:1;min-width:300px}
.lp-reviews{padding:5rem 2rem;background:#f8fafc}
.lp-reviews-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem;max-width:1200px;margin:0 auto}
.lp-review{background:#fff;border-radius:1rem;padding:2rem;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #f1f5f9}
.lp-urgency{background:linear-gradient(135deg,#dc2626,#ea580c);color:#fff;text-align:center;padding:1.5rem;font-size:1.2rem;font-weight:700}
.lp-form-section{padding:4rem 2rem;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff}
.lp-form-wrapper{max-width:600px;margin:0 auto}
.lp-form-group{margin-bottom:1.25rem}
.lp-form-group label{display:block;font-size:0.9rem;font-weight:600;margin-bottom:0.4rem;color:#cbd5e1}
.lp-form-group input,.lp-form-group select,.lp-form-group textarea{width:100%;padding:0.85rem 1rem;border-radius:0.75rem;border:1px solid #334155;background:#1e293b;color:#fff;font-size:1rem;outline:none}
.lp-form-submit{width:100%;padding:1rem;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;border-radius:0.75rem;font-size:1.15rem;font-weight:700;cursor:pointer}
</style>
</head>
<body>${innerHtml}</body>
</html>`;
    navigator.clipboard.writeText(fullHtml);
    setCopied(true);
    toast.success(t('landing.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreviewTab = () => {
    if (!previewRef.current) return;
    const clone = previewRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="${selectedLang}" dir="${selectedLang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${content?.headline || ''}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif}</style></head><body>${clone.innerHTML}</body></html>`);
    win.document.close();
  };

  const productImage = allImages[selectedImageIndex] || selectedProduct?.images?.[0];
  const heroImage = generatedImages[0] || productImage;
  const detailImage = generatedImages[1] || productImage;
  const galleryImage = generatedImages[2] || null;

  const updateField = (field: keyof LandingContent, value: string) => {
    if (!content) return;
    setContent({ ...content, [field]: value });
  };

  const EditableText = ({ tag: Tag = 'span' as any, value, onChange, className = '', style = {} }: any) => (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: any) => onChange(e.currentTarget.textContent || '')}
      className={`outline-none hover:ring-2 hover:ring-orange-400/40 focus:ring-2 focus:ring-orange-400/60 rounded px-0.5 cursor-text transition-all ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );

  const formLabels: Record<string, Record<string, string>> = {
    ar: { orderNow: 'اطلب الآن', name: 'الاسم الكامل', phone: 'رقم الهاتف', wilaya: 'الولاية', baladiya: 'البلدية', deliveryType: 'نوع التوصيل', office: 'إلى المكتب', home: 'إلى المنزل', address: 'العنوان', submit: 'تأكيد الطلب', subtitle: 'املأ النموذج وسنتواصل معك', namePh: 'أدخل اسمك', phonePh: '05XXXXXXXX', wilayaPh: 'اختر الولاية', baladiyaPh: 'اختر البلدية', addressPh: 'عنوان التوصيل', success: 'تم تسجيل طلبك بنجاح! سنتواصل معك قريباً ✅', selectOption: 'اختر', faq: 'أسئلة شائعة' },
    en: { orderNow: 'Order Now', name: 'Full Name', phone: 'Phone Number', wilaya: 'Wilaya', baladiya: 'City', deliveryType: 'Delivery Type', office: 'To Office', home: 'To Home', address: 'Address', submit: 'Confirm Order', subtitle: "Fill the form and we'll contact you", namePh: 'Enter your name', phonePh: '05XXXXXXXX', wilayaPh: 'Select wilaya', baladiyaPh: 'Select city', addressPh: 'Delivery address', success: 'Your order has been placed! We will contact you soon ✅', selectOption: 'Select', faq: 'FAQ' },
    fr: { orderNow: 'Commander Maintenant', name: 'Nom complet', phone: 'Téléphone', wilaya: 'Wilaya', baladiya: 'Commune', deliveryType: 'Type de livraison', office: 'Au bureau', home: 'À domicile', address: 'Adresse', submit: 'Confirmer la commande', subtitle: 'Remplissez le formulaire et nous vous contacterons', namePh: 'Entrez votre nom', phonePh: '05XXXXXXXX', wilayaPh: 'Sélectionner wilaya', baladiyaPh: 'Sélectionner commune', addressPh: 'Adresse de livraison', success: 'Votre commande a été enregistrée ! Nous vous contacterons bientôt ✅', selectOption: 'Sélectionner', faq: 'FAQ' },
    es: { orderNow: 'Pedir Ahora', name: 'Nombre completo', phone: 'Teléfono', wilaya: 'Provincia', baladiya: 'Ciudad', deliveryType: 'Tipo de entrega', office: 'A oficina', home: 'A domicilio', address: 'Dirección', submit: 'Confirmar Pedido', subtitle: 'Rellene el formulario y nos pondremos en contacto', namePh: 'Tu nombre', phonePh: '05XXXXXXXX', wilayaPh: 'Seleccionar provincia', baladiyaPh: 'Seleccionar ciudad', addressPh: 'Dirección de entrega', success: '¡Pedido registrado! Nos pondremos en contacto ✅', selectOption: 'Seleccionar', faq: 'FAQ' },
    de: { orderNow: 'Jetzt Bestellen', name: 'Vollständiger Name', phone: 'Telefonnummer', wilaya: 'Region', baladiya: 'Stadt', deliveryType: 'Lieferart', office: 'Büro', home: 'Zuhause', address: 'Adresse', submit: 'Bestellung Bestätigen', subtitle: 'Füllen Sie das Formular aus', namePh: 'Ihr Name', phonePh: '05XXXXXXXX', wilayaPh: 'Region wählen', baladiyaPh: 'Stadt wählen', addressPh: 'Lieferadresse', success: 'Bestellung registriert! Wir kontaktieren Sie bald ✅', selectOption: 'Wählen', faq: 'FAQ' },
    tr: { orderNow: 'Şimdi Sipariş Ver', name: 'Ad Soyad', phone: 'Telefon', wilaya: 'Şehir', baladiya: 'İlçe', deliveryType: 'Teslimat türü', office: 'Ofise', home: 'Eve', address: 'Adres', submit: 'Siparişi Onayla', subtitle: 'Formu doldurun', namePh: 'Adınız', phonePh: '05XXXXXXXX', wilayaPh: 'Şehir seçin', baladiyaPh: 'İlçe seçin', addressPh: 'Teslimat adresi', success: 'Sipariş kaydedildi! En kısa sürede iletişime geçeceğiz ✅', selectOption: 'Seçin', faq: 'SSS' },
  };
  const fl = formLabels[selectedLang] || formLabels.en;

  // Group legacy variations by type
  const legacyGrouped = (legacyVariations || []).reduce<Record<string, typeof legacyVariations>>((acc, v) => {
    if (!acc[v.variation_type]) acc[v.variation_type] = [];
    acc[v.variation_type]!.push(v);
    return acc;
  }, {});

  // Render variant selection UI
  const renderVariantSelection = () => {
    if (selectedProduct?.has_variants && optionGroups && optionGroups.length > 0) {
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

    // Legacy variations
    if (!selectedProduct?.has_variants && Object.keys(legacyGrouped).length > 0) {
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

  // Render the order form as a separate React component OUTSIDE previewRef
  const renderOrderForm = () => {
    if (!selectedProduct || !content) return null;

    const trustLabels = {
      securePayment: selectedLang === 'ar' ? 'دفع آمن' : selectedLang === 'fr' ? 'Paiement sécurisé' : 'Secure Payment',
      fastDelivery: selectedLang === 'ar' ? 'توصيل سريع' : selectedLang === 'fr' ? 'Livraison rapide' : 'Fast Delivery',
      guaranteed: selectedLang === 'ar' ? 'جودة مضمونة' : selectedLang === 'fr' ? 'Qualité garantie' : 'Guaranteed',
      freeReturns: selectedLang === 'ar' ? 'إرجاع مجاني' : selectedLang === 'fr' ? 'Retour gratuit' : 'Free Returns',
    };

    return (
      <div id="order-form" style={{ padding: '4rem 2rem', background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff', borderRadius: '0 0 1rem 1rem' }} dir={selectedLang === 'ar' ? 'rtl' : 'ltr'}>
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
              animation: 'adminGlowBorder 4s ease infinite',
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
                {selectedProduct.images?.[0] && (
                  <img src={selectedProduct.images[0]} alt={selectedProduct.name} style={{ width: '60px', height: '60px', borderRadius: '0.75rem', objectFit: 'cover', border: '2px solid rgba(249,115,22,0.3)' }} />
                )}
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart style={{ width: '22px', height: '22px', color: '#f97316' }} />
                    {fl.orderNow}
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>{fl.subtitle}</p>
                </div>
              </div>

              {/* Urgency badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '9999px', fontSize: '0.8rem', color: '#fca5a5', fontWeight: 600, marginBottom: '1.25rem' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'adminPulse 2s infinite' }} />
                🔥 {selectedLang === 'ar' ? 'كمية محدودة' : selectedLang === 'fr' ? 'Stock limité' : 'Limited Stock'}
              </div>

              {/* Price box */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(249,115,22,0.08)', borderRadius: '1rem', border: '1px solid rgba(249,115,22,0.2)' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{selectedProduct.name}</span>
                <div style={{ marginTop: '0.4rem' }}>
                  {selectedProduct.old_price && (
                    <span style={{ fontSize: '1.1rem', color: '#6b7280', textDecoration: 'line-through', marginRight: '0.75rem' }}>{selectedProduct.old_price} DA</span>
                  )}
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: '#f97316' }}>{displayPrice} DA</span>
                </div>
              </div>

              {orderSuccess ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(34,197,94,0.1)', borderRadius: '1rem', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <CheckCircle style={{ width: '3rem', height: '3rem', color: '#22c55e', margin: '0 auto 1rem' }} />
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>{fl.success}</p>
                </div>
              ) : (
                <>
                  {renderVariantSelection()}

                  {/* Name with icon */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{fl.name} *</label>
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: '0.75rem', border: formErrors.name ? '2px solid #ef4444' : '1px solid #334155', background: '#1e293b', overflow: 'hidden' }}>
                      <span style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center' }}><User style={{ width: '18px', height: '18px', color: '#94a3b8' }} /></span>
                      <input type="text" value={orderName} onChange={e => setOrderName(e.target.value)} placeholder={fl.namePh} style={{ flex: 1, padding: '0.85rem 0.75rem 0.85rem 0', border: 'none', background: 'transparent', color: '#fff', fontSize: '1rem', outline: 'none' }} />
                    </div>
                    {formErrors.name && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{formErrors.name}</p>}
                  </div>

                  {/* Phone with icon */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{fl.phone} *</label>
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: '0.75rem', border: formErrors.phone ? '2px solid #ef4444' : '1px solid #334155', background: '#1e293b', overflow: 'hidden' }}>
                      <span style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center' }}><Phone style={{ width: '18px', height: '18px', color: '#94a3b8' }} /></span>
                      <input type="tel" value={orderPhone} onChange={e => setOrderPhone(e.target.value)} placeholder={fl.phonePh} dir="ltr" style={{ flex: 1, padding: '0.85rem 0.75rem 0.85rem 0', border: 'none', background: 'transparent', color: '#fff', fontSize: '1rem', outline: 'none' }} />
                    </div>
                    {formErrors.phone && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{formErrors.phone}</p>}
                  </div>

                  {/* Wilaya with icon */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', color: '#cbd5e1' }}>{fl.wilaya} *</label>
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: '0.75rem', border: formErrors.wilaya ? '2px solid #ef4444' : '1px solid #334155', background: '#1e293b', overflow: 'hidden' }}>
                      <span style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center' }}><MapPin style={{ width: '18px', height: '18px', color: '#94a3b8' }} /></span>
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
                        <span style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center' }}><Building2 style={{ width: '18px', height: '18px', color: '#94a3b8' }} /></span>
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
                          <Building2 style={{ width: '24px', height: '24px', color: orderDeliveryType === 'office' ? '#f97316' : '#94a3b8', margin: '0 auto 0.4rem' }} />
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
                          <Home style={{ width: '24px', height: '24px', color: orderDeliveryType === 'home' ? '#f97316' : '#94a3b8', margin: '0 auto 0.4rem' }} />
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
                      <span style={{ padding: '0.85rem 0.75rem 0 0.75rem', display: 'flex', alignItems: 'center' }}><Home style={{ width: '18px', height: '18px', color: '#94a3b8' }} /></span>
                      <textarea value={orderAddress} onChange={e => setOrderAddress(e.target.value)} placeholder={fl.addressPh} rows={2} style={{ flex: 1, padding: '0.85rem 0.75rem 0.85rem 0', border: 'none', background: 'transparent', color: '#fff', fontSize: '1rem', outline: 'none', resize: 'vertical' as const }} />
                    </div>
                  </div>

                  {/* Order Summary */}
                  {orderWilayaId && selectedWilaya && orderDeliveryType && (
                    <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                        <span>{selectedLang === 'ar' ? 'سعر المنتج' : selectedLang === 'fr' ? 'Prix produit' : 'Product price'}</span>
                        <span style={{ color: '#e2e8f0' }}>{formatPrice(displayPrice)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                        <span>{selectedLang === 'ar' ? 'التوصيل' : selectedLang === 'fr' ? 'Livraison' : 'Shipping'}</span>
                        <span style={{ color: '#e2e8f0' }}>{formatPrice(orderDeliveryType === 'home' ? Number(selectedWilaya.shipping_price_home) : Number(selectedWilaya.shipping_price))}</span>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                        <span style={{ color: '#e2e8f0' }}>{selectedLang === 'ar' ? 'المجموع' : 'Total'}</span>
                        <span style={{ color: '#f97316' }}>{formatPrice(displayPrice + (orderDeliveryType === 'home' ? Number(selectedWilaya.shipping_price_home) : Number(selectedWilaya.shipping_price)))}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button type="button" onClick={handleOrderSubmit} disabled={orderSubmitting} style={{
                    width: '100%', padding: '1.1rem', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '0.75rem', fontSize: '1.2rem', fontWeight: 800, cursor: orderSubmitting ? 'not-allowed' : 'pointer', opacity: orderSubmitting ? 0.7 : 1, marginTop: '0.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                    boxShadow: '0 4px 20px rgba(249,115,22,0.4)',
                  }}>
                    {orderSubmitting ? <Loader2 style={{ width: '22px', height: '22px', animation: 'spin 1s linear infinite' }} /> : <ShoppingCart style={{ width: '22px', height: '22px' }} />}
                    {orderSubmitting ? '...' : fl.submit}
                  </button>
                </>
              )}

              {/* Trust Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '1.5rem' }}>
                {[
                  { icon: <Shield style={{ width: '18px', height: '18px', color: '#f97316' }} />, label: trustLabels.securePayment },
                  { icon: <Truck style={{ width: '18px', height: '18px', color: '#f97316' }} />, label: trustLabels.fastDelivery },
                  { icon: <Package style={{ width: '18px', height: '18px', color: '#f97316' }} />, label: trustLabels.guaranteed },
                  { icon: <RotateCcw style={{ width: '18px', height: '18px', color: '#f97316' }} />, label: trustLabels.freeReturns },
                ].map((badge, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '0.6rem 0.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.3rem' }}>{badge.icon}</div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, lineHeight: 1.2, display: 'block' }}>{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  {/* Admin form animations */}
  const adminFormStyles = `
    @keyframes adminGlowBorder { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
    @keyframes adminPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  `;

  return (
    <div className="space-y-6" dir={dir}>
      <style>{adminFormStyles}</style>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-cairo">{t('landing.title')}</h1>
            <p className="text-sm text-muted-foreground font-cairo">{t('landing.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={activeTab === 'create' ? 'default' : 'outline'} size="sm" className="font-cairo gap-1.5" onClick={() => setActiveTab('create')}>
            <Sparkles className="w-4 h-4" /> {t('landing.createNew')}
          </Button>
          <Button variant={activeTab === 'saved' ? 'default' : 'outline'} size="sm" className="font-cairo gap-1.5" onClick={() => setActiveTab('saved')}>
            <FileText className="w-4 h-4" /> {t('landing.savedPages')} {savedPages?.length ? `(${savedPages.length})` : ''}
          </Button>
        </div>
      </div>

      {/* Saved Pages Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {(!savedPages || savedPages.length === 0) ? (
            <div className="bg-card rounded-2xl border p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-cairo text-muted-foreground">{t('landing.noSavedPages')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedPages.map(page => {
                const product = products.find(p => p.id === page.product_id);
                return (
                  <div key={page.id} className="bg-card rounded-xl border shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                    {page.selected_image && (
                      <div className="h-40 overflow-hidden">
                        <img src={page.selected_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <h3 className="font-cairo font-bold text-sm truncate">{page.title || product?.name || '—'}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-cairo">
                        <span>{LANGUAGES.find(l => l.value === page.language)?.flag} {LANGUAGES.find(l => l.value === page.language)?.label}</span>
                        <span>•</span>
                        <span>{new Date(page.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1 font-cairo gap-1" onClick={() => handleLoadSaved(page)}>
                          <Eye className="w-3.5 h-3.5" /> {t('common.view')}
                        </Button>
                         <Button size="sm" variant="outline" className="font-cairo gap-1" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/lp/${page.id}`);
                          toast.success(t('landing.linkCopied') || 'Link copied!');
                        }}>
                          <Link2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive font-cairo" onClick={() => handleDeleteSaved(page.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Tab */}
      {activeTab === 'create' && (
        <>
          {/* Step indicators */}
          <div className="flex items-center gap-2 justify-center">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => { if (s === 1 || (s === 2 && selectedProductId) || (s === 3 && content)) setStep(s); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === s ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : step > s ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </button>
                {s < 3 && <div className={`w-12 h-0.5 rounded ${step > s ? 'bg-primary/40' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Select Product & Language */}
          {step === 1 && (
            <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-5">
              <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {t('landing.selectProduct')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-cairo font-medium text-muted-foreground">{t('common.product')}</label>
                  <Select value={selectedProductId} onValueChange={(v) => { setSelectedProductId(v); setContent(null); }}>
                    <SelectTrigger className="font-cairo h-11">
                      <SelectValue placeholder={t('landing.choosePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id} className="font-cairo">
                          <span className="flex items-center gap-2">
                            {p.images?.[0] && <img src={p.images[0]} alt="" className="w-6 h-6 rounded object-cover" />}
                            {p.name} — {p.price} DA
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-cairo font-medium text-muted-foreground">{t('landing.language')}</label>
                  <Select value={selectedLang} onValueChange={setSelectedLang}>
                    <SelectTrigger className="font-cairo h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.value} value={l.value} className="font-cairo">
                          {l.flag} {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedProduct && (
                <div className="flex gap-4 p-4 bg-muted/50 rounded-xl border">
                  {selectedProduct.images?.[0] && (
                    <img src={selectedProduct.images[0]} alt="" className="w-24 h-24 rounded-xl object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-cairo font-bold text-base truncate">{selectedProduct.name}</h3>
                    <p className="text-sm text-muted-foreground font-cairo line-clamp-2">{selectedProduct.short_description || selectedProduct.description}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-bold text-primary">{selectedProduct.price} DA</span>
                      {selectedProduct.old_price && <span className="text-sm text-muted-foreground line-through">{selectedProduct.old_price} DA</span>}
                    </div>
                  </div>
                </div>
              )}
              <Button onClick={() => { if (selectedProductId) setStep(2); }} disabled={!selectedProductId} className="gap-2 font-cairo" size="lg">
                {t('common.next')} <ArrowDown className="w-4 h-4 rotate-[-90deg]" />
              </Button>
            </div>
          )}

          {/* Step 2: Images + Generate */}
          {step === 2 && selectedProduct && (
            <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-5">
              <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
                <ImagePlus className="w-5 h-5 text-primary" />
                {t('landing.selectImage')}
              </h2>
              <div className="flex gap-3 flex-wrap">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 transition-all group ${
                      i === selectedImageIndex ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {i === selectedImageIndex && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-primary drop-shadow" />
                      </div>
                    )}
                    {i >= (selectedProduct.images?.length || 0) && (
                      <span className="absolute top-1 right-1 bg-primary/90 text-primary-foreground text-[9px] px-1 rounded font-bold">AI</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-4 bg-muted/50 rounded-xl border space-y-3">
                <h3 className="font-cairo font-semibold text-sm flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  {t('landing.generateImage')}
                </h3>
                <div className="flex gap-2">
                  <Input value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder={t('landing.imagePromptPlaceholder')} className="font-cairo flex-1" />
                  <Button onClick={handleGenerateImage} disabled={generatingImages} className="gap-2 font-cairo shrink-0">
                    {generatingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generatingImages ? t('landing.generatingImage') : t('landing.generateImageBtn')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-cairo">{t('landing.imagePromptHint')}</p>
              </div>
              <p className="text-xs text-muted-foreground font-cairo">{t('landing.autoImagesHint')}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2 font-cairo">
                  {t('common.back')}
                </Button>
                <Button onClick={handleGenerate} disabled={generating} className="gap-2 font-cairo" size="lg">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generating ? t('landing.generating') : t('landing.generate')}
                </Button>
              </div>
            </div>
          )}

          {/* Generating skeleton */}
          {generating && (
            <div className="bg-card rounded-2xl border p-8 space-y-8">
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="font-cairo text-lg text-muted-foreground">{t('landing.generating')}</span>
              </div>
              <Skeleton className="h-72 w-full rounded-2xl" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-36 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
              </div>
              <Skeleton className="h-52 w-full rounded-xl" />
            </div>
          )}

          {/* Step 3: Live Preview */}
          {step === 3 && content && !generating && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-3 bg-card rounded-2xl border p-4 shadow-sm sticky top-14 z-30">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-cairo">{t('landing.editHint')}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setStep(2)} className="gap-1.5 font-cairo">
                    {t('common.back')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5 font-cairo">
                    <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                    {t('landing.regenerate')}
                  </Button>
                   <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 font-cairo">
                     {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                     {t('common.save')}
                   </Button>
                   {savedPageId && (
                      <Button variant="outline" size="sm" className="gap-1.5 font-cairo" onClick={() => {
                       navigator.clipboard.writeText(`${window.location.origin}/lp/${savedPageId}`);
                       toast.success(t('landing.linkCopied') || 'Link copied!');
                     }}>
                       <Link2 className="w-3.5 h-3.5" />
                       {t('landing.copyLink') || 'Copy Link'}
                     </Button>
                   )}
                   <Button variant="outline" size="sm" onClick={handlePreviewTab} className="gap-1.5 font-cairo">
                     <ExternalLink className="w-3.5 h-3.5" />
                     {t('landing.previewTab')}
                   </Button>
                   <Button size="sm" onClick={handleCopyHtml} className="gap-1.5 font-cairo">
                     {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                     {copied ? t('landing.copiedBtn') : t('landing.exportHtml')}
                   </Button>
                 </div>
              </div>

              {savedPageId && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm font-cairo text-primary flex items-center gap-2 flex-wrap">
                  <CheckCircle className="w-4 h-4" />
                  {t('landing.savedIndicator')}
                  <span className="mx-1">•</span>
                   <a href={`${window.location.origin}/lp/${savedPageId}`} target="_blank" rel="noopener noreferrer" className="underline text-xs break-all hover:text-primary/80">
                    {window.location.origin}/lp/{savedPageId}
                   </a>
                </div>
              )}

              {/* Landing page preview - NO order form inside */}
              <div ref={previewRef} className="rounded-2xl border overflow-hidden shadow-2xl" dir={selectedLang === 'ar' ? 'rtl' : 'ltr'} style={{ background: '#fff', color: '#1a1a1a' }}>
                {/* Hero */}
                <div style={{ position: 'relative', minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
                  {heroImage && (
                    <img src={heroImage} alt={selectedProduct?.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.2),rgba(0,0,0,0.7))' }} />
                  <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff', padding: '3rem 2rem', maxWidth: '800px' }}>
                    <EditableText tag="h1" value={content.headline} onChange={(v: string) => updateField('headline', v)} style={{ fontSize: 'clamp(2rem,6vw,4rem)', fontWeight: 900, marginBottom: '1.5rem', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }} />
                    <EditableText tag="p" value={content.subheadline} onChange={(v: string) => updateField('subheadline', v)} className="block" style={{ fontSize: '1.3rem', opacity: 0.9, marginBottom: '2.5rem', lineHeight: 1.6 }} />
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <a href="#order-form" style={{ display: 'inline-block', padding: '1rem 2.5rem', borderRadius: '0.75rem', fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', textDecoration: 'none', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}>
                        <EditableText value={content.cta_primary} onChange={(v: string) => updateField('cta_primary', v)} />
                      </a>
                      <a href="#details" style={{ display: 'inline-block', padding: '1rem 2.5rem', borderRadius: '0.75rem', fontWeight: 700, fontSize: '1.1rem', border: '2px solid rgba(255,255,255,0.6)', color: '#fff', textDecoration: 'none' }}>
                        <EditableText value={content.cta_secondary} onChange={(v: string) => updateField('cta_secondary', v)} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Trust bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem', padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {[
                    { icon: '🚚', text: selectedLang === 'ar' ? 'توصيل سريع' : selectedLang === 'fr' ? 'Livraison rapide' : 'Fast Delivery' },
                    { icon: '🛡️', text: selectedLang === 'ar' ? 'دفع آمن' : selectedLang === 'fr' ? 'Paiement sécurisé' : 'Secure Payment' },
                    { icon: '↩️', text: selectedLang === 'ar' ? 'إرجاع مجاني' : selectedLang === 'fr' ? 'Retour gratuit' : 'Free Returns' },
                    { icon: '⭐', text: selectedLang === 'ar' ? 'جودة مضمونة' : selectedLang === 'fr' ? 'Qualité garantie' : 'Quality Guaranteed' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: '#475569', fontWeight: 600 }}>
                      <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Benefits */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.5rem', padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
                  {content.benefits.map((b, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '2rem 1.5rem', borderRadius: '1rem', background: '#fff', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{b.icon}</div>
                      <EditableText tag="h3" value={b.title} onChange={(v: string) => { const n = [...content.benefits]; n[i] = { ...n[i], title: v }; setContent({ ...content, benefits: n }); }} style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }} />
                      <EditableText tag="p" value={b.text} onChange={(v: string) => { const n = [...content.benefits]; n[i] = { ...n[i], text: v }; setContent({ ...content, benefits: n }); }} className="block" style={{ color: '#64748b', lineHeight: 1.6 }} />
                    </div>
                  ))}
                </div>

                {/* Before / After */}
                {content.before_after && (
                  <div style={{ padding: '4rem 2rem', background: '#f8fafc' }}>
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                      <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
                        {selectedLang === 'ar' ? '✨ التحول' : selectedLang === 'fr' ? '✨ La Transformation' : '✨ The Transformation'}
                      </h2>
                      {/* Generate Transformation Image Button */}
                      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        {content.before_after.image_url ? (
                          <div style={{ marginBottom: '2rem', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', position: 'relative' as const }}>
                            <img src={content.before_after.image_url} alt="Transformation" style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />
                            <button
                              onClick={async () => {
                                if (!selectedProduct) return;
                                setGeneratingImages(true);
                                try {
                                  const prompt = `Before and after transformation showing the dramatic impact of ${selectedProduct.name}, split screen comparison, professional lifestyle photography, high resolution, 4K`;
                                  const url = await generateImageWithPuter(prompt);
                                  if (url) {
                                    setContent({ ...content, before_after: { ...content.before_after!, image_url: url } });
                                    toast.success('Transformation image regenerated!');
                                  }
                                } catch (e: any) {
                                  toast.error(e.message || 'Error generating image');
                                } finally {
                                  setGeneratingImages(false);
                                }
                              }}
                              disabled={generatingImages}
                              style={{
                                position: 'absolute' as const, bottom: '1rem', right: '1rem',
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 1rem', borderRadius: '0.75rem',
                                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                                color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                              }}
                            >
                              {generatingImages ? '⏳' : '🔄'} {selectedLang === 'ar' ? 'إعادة توليد' : 'Regenerate'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              if (!selectedProduct) return;
                              setGeneratingImages(true);
                              try {
                                const prompt = `Before and after transformation showing the dramatic impact of ${selectedProduct.name}, split screen comparison, professional lifestyle photography, high resolution, 4K`;
                                const url = await generateImageWithPuter(prompt);
                                if (url) {
                                  setContent({ ...content, before_after: { ...content.before_after!, image_url: url } });
                                  toast.success('Transformation image generated!');
                                }
                              } catch (e: any) {
                                toast.error(e.message || 'Error generating image');
                              } finally {
                                setGeneratingImages(false);
                              }
                            }}
                            disabled={generatingImages}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                              padding: '0.75rem 1.5rem', borderRadius: '0.75rem',
                              background: 'linear-gradient(135deg, #f97316, #ea580c)',
                              color: '#fff', border: 'none', cursor: 'pointer',
                              fontSize: '0.9rem', fontWeight: 700,
                              boxShadow: '0 4px 15px rgba(249,115,22,0.3)',
                              marginBottom: '1rem',
                            }}
                          >
                            {generatingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                            {selectedLang === 'ar' ? 'توليد صورة التحول' : 'Generate Transformation Image'}
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '2rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '2.5rem 2rem', borderRadius: '1.5rem', background: '#fee2e2', border: '2px solid #fca5a5', textAlign: 'center' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>😔</div>
                          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#991b1b', marginBottom: '0.75rem' }}>{selectedLang === 'ar' ? 'قبل' : selectedLang === 'fr' ? 'Avant' : 'Before'}</h3>
                          <EditableText tag="p" value={content.before_after.before_text} onChange={(v: string) => setContent({ ...content, before_after: { ...content.before_after!, before_text: v } })} className="block" style={{ color: '#7f1d1d', lineHeight: 1.7 }} />
                        </div>
                        <div style={{ padding: '2.5rem 2rem', borderRadius: '1.5rem', background: '#dcfce7', border: '2px solid #86efac', textAlign: 'center' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>😍</div>
                          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#166534', marginBottom: '0.75rem' }}>{selectedLang === 'ar' ? 'بعد' : selectedLang === 'fr' ? 'Après' : 'After'}</h3>
                          <EditableText tag="p" value={content.before_after.after_text} onChange={(v: string) => setContent({ ...content, before_after: { ...content.before_after!, after_text: v } })} className="block" style={{ color: '#14532d', lineHeight: 1.7 }} />
                        </div>
                      </div>
                      <EditableText tag="p" value={content.before_after.switch_line} onChange={(v: string) => setContent({ ...content, before_after: { ...content.before_after!, switch_line: v } })} className="block" style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#475569' }} />
                    </div>
                  </div>
                )}

                {/* Authority & Social Validation */}
                {(content.authority_text || (content.social_proof_stats && content.social_proof_stats.length > 0)) && (
                  <div style={{ padding: '4rem 2rem', background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                      {content.authority_text && (
                        <EditableText tag="p" value={content.authority_text} onChange={(v: string) => updateField('authority_text', v)} className="block" style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '2.5rem', fontWeight: 600 }} />
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
                    <img src={detailImage} alt="" style={{ flex: 1, minWidth: '280px', maxWidth: '500px', borderRadius: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <h2 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '1rem', color: '#0f172a', lineHeight: 1.2 }}>{selectedProduct?.name}</h2>
                    <EditableText tag="div" value={content.description.replace(/\n/g, '<br/>')} onChange={(v: string) => updateField('description', v)} className="block" style={{ color: '#475569', lineHeight: 1.9, whiteSpace: 'pre-line' }} />
                    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '1.5rem', padding: '1rem 1.5rem', background: 'linear-gradient(135deg,#fff7ed,#fef3c7)', borderRadius: '1rem', border: '1px solid #fed7aa' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 900, color: '#ea580c' }}>{displayPrice} DA</span>
                      {selectedProduct?.old_price && (
                        <span style={{ fontSize: '1.2rem', color: '#9ca3af', textDecoration: 'line-through' }}>{selectedProduct.old_price} DA</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* How It Works */}
                {content.how_it_works && content.how_it_works.length > 0 && (
                  <div style={{ padding: '4rem 2rem', background: '#f8fafc' }}>
                    <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '3rem', color: '#0f172a' }}>
                      {selectedLang === 'ar' ? '🔄 كيف يعمل' : selectedLang === 'fr' ? '🔄 Comment ça marche' : '🔄 How It Works'}
                    </h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
                      {content.how_it_works.map((step, i) => (
                        <div key={i} style={{ textAlign: 'center', flex: '1 1 220px', maxWidth: '280px', position: 'relative' }}>
                          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, margin: '0 auto 1rem', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}>
                            {step.icon}
                          </div>
                          <EditableText tag="h3" value={step.title} onChange={(v: string) => { const n = [...(content.how_it_works || [])]; n[i] = { ...n[i], title: v }; setContent({ ...content, how_it_works: n }); }} style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.5rem' }} />
                          <EditableText tag="p" value={step.description} onChange={(v: string) => { const n = [...(content.how_it_works || [])]; n[i] = { ...n[i], description: v }; setContent({ ...content, how_it_works: n }); }} className="block" style={{ color: '#64748b', lineHeight: 1.6 }} />
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
                        <img key={i} src={img!} alt="" style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '1rem' }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Testimonials */}
                <div style={{ padding: '4rem 2rem', background: '#f8fafc' }}>
                  <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '2.5rem', color: '#0f172a' }}>
                    {selectedLang === 'ar' ? '⭐ آراء عملائنا' : selectedLang === 'fr' ? '⭐ Avis Clients' : '⭐ Customer Reviews'}
                  </h2>
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
                        }}>
                          {/* Quote icon */}
                          <div style={{ fontSize: '3rem', lineHeight: 1, color: '#f97316', opacity: 0.2, fontFamily: 'Georgia, serif', marginBottom: '0.5rem' }}>"</div>
                          {/* Review text */}
                          <EditableText tag="p" value={rev.text} onChange={(v: string) => { const n = [...content.testimonials]; n[i] = { ...n[i], text: v }; setContent({ ...content, testimonials: n }); }} className="block" style={{ color: '#475569', lineHeight: 1.8, marginBottom: '1rem', fontSize: '0.95rem' }} />
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
                              <EditableText tag="span" value={rev.name} onChange={(v: string) => { const n = [...content.testimonials]; n[i] = { ...n[i], name: v }; setContent({ ...content, testimonials: n }); }} style={{ fontWeight: 700, color: '#0f172a', display: 'block', fontSize: '0.95rem' }} />
                              <span style={{ fontSize: '0.7rem', background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Check className="w-2.5 h-2.5" />
                                {selectedLang === 'ar' ? 'شراء موثق' : selectedLang === 'fr' ? 'Achat vérifié' : 'Verified Purchase'}
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
                      <EditableText tag="p" value={content.guarantee_text} onChange={(v: string) => updateField('guarantee_text', v)} className="block" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }} />
                    </div>
                  </div>
                )}

                {/* FAQ Section */}
                {content.faq && content.faq.length > 0 && (
                  <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '2rem', color: '#0f172a' }}>
                      ❓ {fl.faq}
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {content.faq.map((item, i) => (
                        <div key={i} style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                          <EditableText tag="h3" value={item.question} onChange={(v: string) => { const n = [...(content.faq || [])]; n[i] = { ...n[i], question: v }; setContent({ ...content, faq: n }); }} style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', fontSize: '1.05rem' }} />
                          <EditableText tag="p" value={item.answer} onChange={(v: string) => { const n = [...(content.faq || [])]; n[i] = { ...n[i], answer: v }; setContent({ ...content, faq: n }); }} className="block" style={{ color: '#64748b', lineHeight: 1.7 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Urgency */}
                <div style={{ background: 'linear-gradient(135deg,#dc2626,#ea580c)', color: '#fff', textAlign: 'center', padding: '1.25rem', fontSize: '1.2rem', fontWeight: 700 }}>
                  🔥 <EditableText value={content.urgency_text} onChange={(v: string) => updateField('urgency_text', v)} />
                </div>
              </div>

              {/* Order Form - OUTSIDE previewRef so React events work */}
              {renderOrderForm()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
