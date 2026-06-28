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

export const HP_TITLE_SECTIONS: HpSection[] = [
  'categories', 'trending', 'newest', 'deals', 'brands', 'testimonials', 'trusted',
];

export interface HomepageSettings {
  show: Record<HpSection, boolean>;
  title: Partial<Record<HpSection, string>>;
  subtitle: Partial<Record<HpSection, string>>;
  limited: {
    title: string;
    subtitle: string;
    image: string;
    link: string;
    cta: string;
    end_date: string; // ISO
  };
}

const HP_KEYS = [
  ...HP_SECTIONS.map(s => `hp_show_${s}`),
  ...HP_TITLE_SECTIONS.map(s => `hp_title_${s}`),
  ...HP_TITLE_SECTIONS.map(s => `hp_subtitle_${s}`),
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
        .in('key', HP_KEYS);
      const map: Record<string, string> = {};
      data?.forEach(r => { map[r.key] = r.value || ''; });

      const show = {} as Record<HpSection, boolean>;
      HP_SECTIONS.forEach(s => {
        const v = map[`hp_show_${s}`];
        // default visible, except 'limited' is off until configured
        show[s] = v === '' || v === undefined ? s !== 'limited' : v !== 'false';
      });

      const title: Partial<Record<HpSection, string>> = {};
      const subtitle: Partial<Record<HpSection, string>> = {};
      HP_TITLE_SECTIONS.forEach(s => {
        if (map[`hp_title_${s}`]) title[s] = map[`hp_title_${s}`];
        if (map[`hp_subtitle_${s}`]) subtitle[s] = map[`hp_subtitle_${s}`];
      });

      return {
        show,
        title,
        subtitle,
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
