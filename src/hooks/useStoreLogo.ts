import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import nuvoriaLogo from '@/assets/nuvoria-logo.png.asset.json';

export const NUVORIA_LOGO_URL = nuvoriaLogo.url;

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

