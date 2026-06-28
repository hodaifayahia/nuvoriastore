import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NUVORIA_LOGO_URL } from './useStoreLogo';

export function useFavicon() {
  const { data: faviconUrl } = useQuery({
    queryKey: ['store-favicon'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'store_favicon').maybeSingle();
      return data?.value || NUVORIA_LOGO_URL;
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [faviconUrl]);
}

