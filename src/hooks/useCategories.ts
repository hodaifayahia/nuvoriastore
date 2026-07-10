import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Subcategory {
  name: string;
  image?: string;
}

export interface Category {
  name: string;
  icon: string;
  image?: string;
  subcategories?: Subcategory[];
}

const normalizeSubcategories = (raw: unknown): Subcategory[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: unknown): Subcategory | null => {
      if (typeof item === 'string') {
        const name = item.trim();
        return name ? { name } : null;
      }
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      const name = typeof rec.name === 'string' ? rec.name.trim() : '';
      if (!name) return null;
      return {
        name,
        image: typeof rec.image === 'string' ? rec.image : undefined,
      };
    })
    .filter((s): s is Subcategory => s !== null);
};

const normalizeCategories = (raw: unknown): Category[] => {
  if (!raw) return [];

  const parsed = typeof raw === 'string'
    ? (() => {
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      })()
    : raw;

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item: unknown): Category | null => {
      if (typeof item === 'string') {
        const name = item.trim();
        return name ? { name, icon: 'Tag' } : null;
      }

      if (!item || typeof item !== 'object') return null;

      const rec = item as Record<string, unknown>;
      const name = typeof rec.name === 'string' ? rec.name.trim() : '';
      if (!name) return null;

      return {
        name,
        icon: typeof rec.icon === 'string' && rec.icon.trim() ? rec.icon : 'Tag',
        image: typeof rec.image === 'string' ? rec.image : undefined,
        subcategories: normalizeSubcategories(rec.subcategories),
      };
    })
    .filter((cat): cat is Category => cat !== null);
};

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'categories')
        .maybeSingle();
      if (error) throw error;
      return normalizeCategories(data?.value);
    },
    staleTime: 5 * 60 * 1000,
  });
}
