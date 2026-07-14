import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Sections that currently render on the homepage (src/pages/Index.tsx)
export const HP_SECTIONS = [
  'hero',
  'categories',
  'featured',
  'newest',
  'best_prices',
  'limited',
  'brands',
  'trust_strip',
  'comparison',
] as const;

export type HpSection = (typeof HP_SECTIONS)[number];

export interface HpTextField {
  key: string;          // bare key, stored as `hp_text_<key>`
  section: HpSection;
  label: string;        // Arabic UI label
  defaultValue: string; // shown as placeholder + used as fallback
  multiline?: boolean;
}

// === Every editable text on the current homepage ===
export const HP_TEXT_FIELDS: HpTextField[] = [
  // ── HERO (ambient labels; per-slide title/subtitle/price/cta live inside slide items)
  { section: 'hero', key: 'hero_exclusive_badge', label: 'شارة "حصري"',             defaultValue: 'حصري في NuvoriaStore' },
  { section: 'hero', key: 'hero_energy_label',    label: 'شارة الطاقة — تسمية',    defaultValue: 'توفير الطاقة' },
  { section: 'hero', key: 'hero_energy_value',    label: 'شارة الطاقة — القيمة',   defaultValue: 'فئة +++A' },
  { section: 'hero', key: 'hero_features_label',  label: 'شارة المميزات — تسمية',  defaultValue: 'المميزات التقنية' },
  { section: 'hero', key: 'hero_features_value',  label: 'شارة المميزات — القيمة', defaultValue: 'التحكم عبر التطبيق' },
  { section: 'hero', key: 'hero_wishlist_alt',    label: 'وصف زر المفضلة',         defaultValue: 'إضافة للمفضلة' },

  // ── CATEGORIES (bento)
  { section: 'categories', key: 'cat_kicker',   label: 'نص فوق العنوان',        defaultValue: 'تسوق حسب الفئة' },
  { section: 'categories', key: 'cat_title',    label: 'العنوان',                defaultValue: 'مصمم لكل إعداد' },
  { section: 'categories', key: 'cat_tag',      label: 'وسم البطاقة',            defaultValue: 'فئة' },
  { section: 'categories', key: 'cat_shop_now', label: 'زر البطاقة عند التمرير', defaultValue: 'تسوق الآن' },

  // ── FEATURED (اختيارات المتجر)
  { section: 'featured', key: 'feat_kicker',  label: 'نص فوق العنوان', defaultValue: 'منتجات مميزة' },
  { section: 'featured', key: 'feat_title',   label: 'العنوان',         defaultValue: 'اختيارات المتجر' },
  { section: 'featured', key: 'feat_desc',    label: 'الوصف',           defaultValue: 'منتجات مختارة بعناية من طرف فريقنا خصيصاً لك.', multiline: true },
  { section: 'featured', key: 'feat_viewAll', label: 'رابط "عرض الكل"', defaultValue: 'عرض الكل' },
  { section: 'featured', key: 'feat_badge',   label: 'شارة "مميز"',     defaultValue: 'مميز' },

  // ── NEWEST
  { section: 'newest', key: 'new_kicker',      label: 'نص فوق العنوان',        defaultValue: 'وصل حديثاً' },
  { section: 'newest', key: 'new_title',       label: 'العنوان',                defaultValue: 'جديدنا' },
  { section: 'newest', key: 'new_desc',        label: 'الوصف',                  defaultValue: 'إصدارات جديدة من أفضل العلامات.', multiline: true },
  { section: 'newest', key: 'new_allProducts', label: 'رابط علوي "عرض الكل"',   defaultValue: 'عرض الكل' },
  { section: 'newest', key: 'new_viewAll',     label: 'زر "عرض كل المنتجات"',   defaultValue: 'عرض كل المنتجات' },

  // ── BEST PRICES BANNER
  { section: 'best_prices', key: 'bp_badge',       label: 'الشارة',            defaultValue: 'ضمان أفضل سعر' },
  { section: 'best_prices', key: 'bp_title_line1', label: 'العنوان — السطر 1', defaultValue: 'أفضل الأسعار' },
  { section: 'best_prices', key: 'bp_title_line2', label: 'العنوان — السطر 2', defaultValue: 'في الجزائر' },
  { section: 'best_prices', key: 'bp_desc',        label: 'الوصف',              defaultValue: 'أجهزة كهرومنزلية أصلية بأسعار لا تُقاوم، مع توصيل سريع إلى 58 ولاية.', multiline: true },
  { section: 'best_prices', key: 'bp_cta',         label: 'نص الزر',            defaultValue: 'تسوق الآن' },

  // ── BRANDS
  { section: 'brands', key: 'brands_kicker', label: 'نص فوق العنوان', defaultValue: 'علامات موثوقة' },
  { section: 'brands', key: 'brands_title',  label: 'العنوان',         defaultValue: 'مدعوم من الأفضل' },

  // ── TRUST / WARRANTY STRIP
  { section: 'trust_strip', key: 'ts_tag',           label: 'الشارة العلوية',              defaultValue: 'حماية موثوقة' },
  { section: 'trust_strip', key: 'ts_title',         label: 'العنوان',                      defaultValue: 'سياسة الضمان' },
  { section: 'trust_strip', key: 'ts_months',        label: 'مدة الضمان (رقم)',            defaultValue: '12' },
  { section: 'trust_strip', key: 'ts_months_suffix', label: 'وصف المدة',                    defaultValue: 'شهراً من تاريخ الشراء' },
  { section: 'trust_strip', key: 'ts_desc',          label: 'وصف الضمان',                   defaultValue: 'يغطي هذا الضمان عيوب التصنيع طوال مدة الضمان المحددة أعلاه، وفق الشروط والأحكام المعمول بها.', multiline: true },
  { section: 'trust_strip', key: 'ts_card1_tag',     label: 'بطاقة 1 — الوسم',              defaultValue: 'الأيام السبعة الأولى' },
  { section: 'trust_strip', key: 'ts_card1_title',   label: 'بطاقة 1 — العنوان',            defaultValue: 'استبدال كامل للجهاز' },
  { section: 'trust_strip', key: 'ts_card1_desc',    label: 'بطاقة 1 — الوصف',              defaultValue: 'استبدال كامل للجهاز خلال الأيام السبعة الأولى في حال ثبوت عيب مصنعي.', multiline: true },
  { section: 'trust_strip', key: 'ts_card2_tag',     label: 'بطاقة 2 — الوسم',              defaultValue: 'بعد فترة الاستبدال' },
  { section: 'trust_strip', key: 'ts_card2_title',   label: 'بطاقة 2 — العنوان',            defaultValue: 'إصلاح وقطع غيار' },
  { section: 'trust_strip', key: 'ts_card2_desc',    label: 'بطاقة 2 — الوصف',              defaultValue: 'يقتصر الضمان على إصلاح الأعطال الناتجة عن عيوب التصنيع، مع توفير قطع الغيار.', multiline: true },
  { section: 'trust_strip', key: 'ts_coverage',      label: 'شريط التغطية',                 defaultValue: 'الضمان يشمل عيوب التصنيع فقط، ولا يغطي الأعطال الناتجة عن سوء الاستخدام أو الحوادث.', multiline: true },
];

export const HP_TEXT_KEYS = HP_TEXT_FIELDS.map(f => `hp_text_${f.key}`);

export interface HomepageSettings {
  show: Record<HpSection, boolean>;
  /** Per-field text overrides keyed by HP_TEXT_FIELDS.key */
  text: Record<string, string>;
  limited: {
    title: string;
    subtitle: string;
    image: string;
    link: string;
    cta: string;
    end_date: string;
    price: number | null;
    old_price: number | null;
  };
  promoVideos: string[];
  comparison: {
    before: string;
    after: string;
  };
}

const HP_ALL_KEYS = [
  ...HP_SECTIONS.map(s => `hp_show_${s}`),
  ...HP_TEXT_KEYS,
  'hp_limited_title',
  'hp_limited_subtitle',
  'hp_limited_image',
  'hp_limited_link',
  'hp_limited_cta',
  'hp_limited_end_date',
  'hp_limited_price',
  'hp_limited_old_price',
  'hp_promo_videos',
  'hp_comparison_before',
  'hp_comparison_after',
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

      const text: Record<string, string> = {};
      HP_TEXT_FIELDS.forEach(f => {
        const v = map[`hp_text_${f.key}`];
        if (v) text[f.key] = v;
      });

      const promoVideos: string[] = (() => {
        try { return JSON.parse(map.hp_promo_videos || '[]'); } catch { return []; }
      })();

      return {
        show,
        text,
        limited: {
          title: map.hp_limited_title || '',
          subtitle: map.hp_limited_subtitle || '',
          image: map.hp_limited_image || '',
          link: map.hp_limited_link || '/products',
          cta: map.hp_limited_cta || '',
          end_date: map.hp_limited_end_date || '',
          price: map.hp_limited_price ? Number(map.hp_limited_price) : null,
          old_price: map.hp_limited_old_price ? Number(map.hp_limited_old_price) : null,
        },
        promoVideos,
        comparison: {
          before: map.hp_comparison_before || '/comparison-before.jpg',
          after: map.hp_comparison_after || '/comparison-after.jpg',
        },
      };
    },
    staleTime: 60 * 1000,
  });
}
