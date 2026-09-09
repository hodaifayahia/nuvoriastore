import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export const NUVORIA_LOGO_URL = '/nuvoria-logo.png';

export function useStoreLogo() {
  return useQuery({
    queryKey: ['store-logo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'store_logo')
        .maybeSingle();
      return data?.value || NUVORIA_LOGO_URL;
    },
    staleTime: 10 * 60 * 1000,
  });
}

