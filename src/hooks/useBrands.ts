import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Brand {
  name: string;
  image?: string | null;
}

const normalize = (raw: unknown): Brand[] => {
  if (!raw) return [];
  const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : raw;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item: any): Brand | null => {
      if (typeof item === 'string') {
        const name = item.trim();
        return name ? { name } : null;
      }
      if (!item || typeof item !== 'object') return null;
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) return null;
      return { name, image: typeof item.image === 'string' ? item.image : null };
    })
    .filter((b): b is Brand => b !== null);
};

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'brands')
        .maybeSingle();
      if (error) throw error;
      return normalize(data?.value);
    },
    staleTime: 5 * 60 * 1000,
  });
}
