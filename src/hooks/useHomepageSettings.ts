import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const HP_SECTIONS = [
  'hero',
  'categories',
  'trending',
  'newest',
  'deals',
  'limited',
  'brands',
  'testimonials',
  'trusted',
  'trust_strip',
] as const;

export type HpSection = (typeof HP_SECTIONS)[number];

// Sections that have generic title+subtitle in the old UI (kept for backward compat)
export const HP_TITLE_SECTIONS: HpSection[] = [
  'categories', 'trending', 'newest', 'deals', 'brands', 'testimonials', 'trusted',
];

export interface HpTextField {
  key: string;          // bare key, stored as `hp_text_<key>`
  section: HpSection;
  label: string;        // Arabic UI label
  defaultValue: string; // shown as placeholder + used as fallback if no translation
  multiline?: boolean;
}

// === Catalog of EVERY editable text on the homepage ===
export const HP_TEXT_FIELDS: HpTextField[] = [
  // HERO
  { section: 'hero', key: 'hero_badge',        label: 'شارة الترويسة',           defaultValue: 'متاح للطلب الآن' },
  { section: 'hero', key: 'hero_title1',       label: 'العنوان — السطر 1',       defaultValue: 'جهّز عتادك.' },
  { section: 'hero', key: 'hero_title2',       label: 'العنوان — السطر 2 (مميّز)', defaultValue: 'وانطلق.' },
  { section: 'hero', key: 'hero_subtitle',     label: 'النص الفرعي',              defaultValue: 'حواسيب، هواتف، سماعات وملحقات — منتقاة، أصلية، وتُسلَّم بسرعة عبر الجزائر.', multiline: true },
  { section: 'hero', key: 'hero_searchPh',     label: 'حقل البحث (Placeholder)', defaultValue: 'ابحث عن منتج...' },
  { section: 'hero', key: 'hero_searchBtn',    label: 'زر البحث',                 defaultValue: 'بحث' },
  { section: 'hero', key: 'hero_shopNow',      label: 'زر تسوّق الآن',            defaultValue: 'تسوّق الآن' },
  { section: 'hero', key: 'hero_browseLaptops',label: 'زر تصفح الحواسيب',         defaultValue: 'استعرض الحواسيب' },
  { section: 'hero', key: 'hero_original',     label: 'شارة "أصلي"',             defaultValue: 'منتجات أصلية' },
  { section: 'hero', key: 'hero_wilayas',      label: 'شارة الولايات',            defaultValue: 'كل الولايات الـ58' },
  { section: 'hero', key: 'hero_returns',      label: 'شارة الإرجاع',             defaultValue: 'إرجاع سهل' },
  { section: 'hero', key: 'bento_fastHrs',     label: 'بنتو — ساعات التوصيل',    defaultValue: '24-72 ساعة' },
  { section: 'hero', key: 'bento_fastDesc',    label: 'بنتو — وصف التوصيل',      defaultValue: 'توصيل سريع لجميع الولايات' },
  { section: 'hero', key: 'bento_accessoriesAvail', label: 'بنتو — تسمية المنتجات', defaultValue: 'إكسسوار متوفّر' },
  { section: 'hero', key: 'bento_bundlesTitle',label: 'بنتو — عنوان الباقات',     defaultValue: 'باقات الشحن والكابلات' },
  { section: 'hero', key: 'bento_bundlesDesc', label: 'بنتو — وصف الباقات',       defaultValue: 'وفّر أكثر عند شراء الباقات' },
  { section: 'hero', key: 'bento_discover',    label: 'بنتو — زر اكتشف',          defaultValue: 'اكتشف' },

  // CATEGORIES
  { section: 'categories', key: 'cat_kicker',  label: 'نص فوق العنوان', defaultValue: 'تسوّق حسب الفئة' },
  { section: 'categories', key: 'cat_title',   label: 'العنوان',         defaultValue: 'كل ما تحتاجه لأجهزتك' },
  { section: 'categories', key: 'cat_viewAll', label: 'رابط "عرض الكل"', defaultValue: 'عرض الكل' },
  { section: 'categories', key: 'cat_shop',    label: 'تسمية البطاقة',   defaultValue: 'تسوّق' },

  // TRENDING
  { section: 'trending', key: 'trend_kicker', label: 'نص فوق العنوان', defaultValue: 'الأكثر طلباً' },
  { section: 'trending', key: 'trend_title',  label: 'العنوان',         defaultValue: 'منتجات رائجة' },

  // NEWEST
  { section: 'newest', key: 'new_kicker',     label: 'نص فوق العنوان',  defaultValue: 'وصل حديثاً' },
  { section: 'newest', key: 'new_title',      label: 'العنوان',          defaultValue: 'جديد في المتجر' },
  { section: 'newest', key: 'new_desc',       label: 'الوصف',            defaultValue: 'أحدث الإكسسوارات والتقنيات', multiline: true },
  { section: 'newest', key: 'new_allProducts',label: 'رابط "كل المنتجات"', defaultValue: 'كل المنتجات' },
  { section: 'newest', key: 'new_viewAll',    label: 'زر "عرض كل المنتجات"', defaultValue: 'عرض كل المنتجات' },

  // DEALS
  { section: 'deals', key: 'deals_kicker', label: 'نص فوق العنوان', defaultValue: 'عروض اليوم' },
  { section: 'deals', key: 'deals_title',  label: 'العنوان',          defaultValue: 'تخفيضات لفترة محدودة' },
  { section: 'deals', key: 'deals_endsIn', label: 'نص العداد',        defaultValue: 'ينتهي خلال' },

  // BRANDS
  { section: 'brands', key: 'brands_kicker', label: 'نص فوق العنوان', defaultValue: 'علامات موثوقة' },
  { section: 'brands', key: 'brands_title',  label: 'العنوان',         defaultValue: 'العلامات التجارية' },

  // TESTIMONIALS
  { section: 'testimonials', key: 'tst_kicker',      label: 'نص فوق العنوان', defaultValue: 'آراء العملاء' },
  { section: 'testimonials', key: 'tst_title',       label: 'العنوان',         defaultValue: 'ماذا يقول الناس' },
  { section: 'testimonials', key: 'tst_ratingSuffix',label: 'نص بعد النجوم',   defaultValue: 'من +500 تقييم' },

  // TRUSTED
  { section: 'trusted', key: 'trusted_badge',    label: 'الشارة',                 defaultValue: 'موثوق في الجزائر' },
  { section: 'trusted', key: 'trusted_title1',   label: 'العنوان (جزء 1)',        defaultValue: 'شريكك التقني' },
  { section: 'trusted', key: 'trusted_title2',   label: 'العنوان (جزء 2 — مميّز)', defaultValue: 'الموثوق' },
  { section: 'trusted', key: 'trusted_title3',   label: 'العنوان (جزء 3)',        defaultValue: 'في الجزائر' },
  { section: 'trusted', key: 'trusted_desc',     label: 'الوصف',                  defaultValue: 'نوفّر إكسسوارات أصلية لأجهزتك مع توصيل سريع لكل الجزائر.', multiline: true },
  { section: 'trusted', key: 'trusted_customers',label: 'تسمية العملاء',          defaultValue: 'عميل سعيد' },
  { section: 'trusted', key: 'trusted_wilayas',  label: 'تسمية الولايات',         defaultValue: 'ولاية' },
  { section: 'trusted', key: 'trusted_rating',   label: 'تسمية التقييم',          defaultValue: 'تقييم' },
  { section: 'trusted', key: 'trusted_browse',   label: 'زر التصفح',              defaultValue: 'تصفّح المتجر' },
  { section: 'trusted', key: 'trusted_about',    label: 'زر "من نحن"',           defaultValue: 'من نحن' },

  // TRUST STRIP (the 4 cards at the bottom)
  { section: 'trust_strip', key: 'ts_delivery',     label: 'بطاقة 1 — العنوان', defaultValue: 'شحن مجاني للطلبات فوق 5,000 دج' },
  { section: 'trust_strip', key: 'ts_deliveryDesc', label: 'بطاقة 1 — الوصف',   defaultValue: 'لجميع الولايات الـ58' },
  { section: 'trust_strip', key: 'ts_returns',      label: 'بطاقة 2 — العنوان', defaultValue: 'إرجاع خلال 7 أيام' },
  { section: 'trust_strip', key: 'ts_returnsDesc',  label: 'بطاقة 2 — الوصف',   defaultValue: 'بدون أسئلة' },
  { section: 'trust_strip', key: 'ts_original',     label: 'بطاقة 3 — العنوان', defaultValue: 'منتجات أصلية' },
  { section: 'trust_strip', key: 'ts_originalDesc', label: 'بطاقة 3 — الوصف',   defaultValue: 'ضمان الجودة' },
  { section: 'trust_strip', key: 'ts_support',      label: 'بطاقة 4 — العنوان', defaultValue: 'دعم 24/7' },
  { section: 'trust_strip', key: 'ts_supportDesc',  label: 'بطاقة 4 — الوصف',   defaultValue: 'فريق متاح دائمًا' },
];

export const HP_TEXT_KEYS = HP_TEXT_FIELDS.map(f => `hp_text_${f.key}`);

export interface HomepageSettings {
  show: Record<HpSection, boolean>;
  title: Partial<Record<HpSection, string>>;
  subtitle: Partial<Record<HpSection, string>>;
  /** Per-field text overrides keyed by HP_TEXT_FIELDS.key (e.g. 'hero_title1') */
  text: Record<string, string>;
  limited: {
    title: string;
    subtitle: string;
    image: string;
    link: string;
    cta: string;
    end_date: string; // ISO
  };
}

const HP_ALL_KEYS = [
  ...HP_SECTIONS.map(s => `hp_show_${s}`),
  ...HP_TITLE_SECTIONS.map(s => `hp_title_${s}`),
  ...HP_TITLE_SECTIONS.map(s => `hp_subtitle_${s}`),
  ...HP_TEXT_KEYS,
  'hp_limited_title',
  'hp_limited_subtitle',
  'hp_limited_image',
  'hp_limited_link',
  'hp_limited_cta',
  'hp_limited_end_date',
];

export function useHomepageSettings() {
  return useQuery({
    queryKey: ['homepage-settings'],
    queryFn: async (): Promise<HomepageSettings> => {
      const { data } = await supabase
        .from('settings')
        .select('key,value')
        .in('key', HP_ALL_KEYS);
      const map: Record<string, string> = {};
      data?.forEach(r => { map[r.key] = r.value || ''; });

      const show = {} as Record<HpSection, boolean>;
      HP_SECTIONS.forEach(s => {
        const v = map[`hp_show_${s}`];
        show[s] = v === '' || v === undefined ? s !== 'limited' : v !== 'false';
      });

      const title: Partial<Record<HpSection, string>> = {};
      const subtitle: Partial<Record<HpSection, string>> = {};
      HP_TITLE_SECTIONS.forEach(s => {
        if (map[`hp_title_${s}`]) title[s] = map[`hp_title_${s}`];
        if (map[`hp_subtitle_${s}`]) subtitle[s] = map[`hp_subtitle_${s}`];
      });

      const text: Record<string, string> = {};
      HP_TEXT_FIELDS.forEach(f => {
        const v = map[`hp_text_${f.key}`];
        if (v) text[f.key] = v;
      });

      return {
        show,
        title,
        subtitle,
        text,
        limited: {
          title: map.hp_limited_title || '',
          subtitle: map.hp_limited_subtitle || '',
          image: map.hp_limited_image || '',
          link: map.hp_limited_link || '/products',
          cta: map.hp_limited_cta || '',
          end_date: map.hp_limited_end_date || '',
        },
      };
    },
    staleTime: 60 * 1000,
  });
}
