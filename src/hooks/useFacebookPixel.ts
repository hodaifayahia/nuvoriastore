import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export function useFacebookPixel() {
  const { data: pixels } = useQuery({
    queryKey: ['facebook-pixels-active'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_active_facebook_pixels');
      return data?.map((p: { pixel_id: string }) => p.pixel_id).filter(Boolean) || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fallback: also check legacy single pixel from settings
  const { data: legacyPixelId } = useQuery({
    queryKey: ['facebook-pixel-id'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'facebook_pixel_id')
        .maybeSingle();
      return data?.value || '';
    },
    staleTime: 1000 * 60 * 10,
  });

  const allPixelIds = [...new Set([
    ...(pixels || []),
    ...(legacyPixelId ? [legacyPixelId] : []),
  ])];

  useEffect(() => {
    if (allPixelIds.length === 0) return;
    if (document.getElementById('fb-pixel-script')) return;

    // Inject Facebook Pixel base code
    const n: any = (window.fbq = function (...args: any[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];

    const script = document.createElement('script');
    script.id = 'fb-pixel-script';
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    // Initialize ALL pixels
    allPixelIds.forEach(pixelId => {
      window.fbq('init', pixelId);
    });
    window.fbq('track', 'PageView');
  }, [allPixelIds.join(',')]);

  const trackEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      if (window.fbq) {
        window.fbq('track', eventName, params);
      }
    },
    []
  );

  return { trackEvent, pixelId: allPixelIds[0] || '' };
}
