import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStoreLogo() {
  return useQuery({
    queryKey: ['store-logo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'store_logo')
        .maybeSingle();
      // Return store logo if set, otherwise use local fallback
      return data?.value || '/akram-mobile-logo.jpg';
    },
    staleTime: 10 * 60 * 1000,
  });
}
