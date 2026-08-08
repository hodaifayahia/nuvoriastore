import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreLogo } from '@/hooks/useStoreLogo';

/**
 * Fixed contact bar shown on mobile only: store logo + name, phone number and a
 * WhatsApp call-to-action. Replaces the floating WhatsApp icon on small screens.
 */
export default function MobileContactBar() {
  const [enabled, setEnabled] = useState(false);
  const [number, setNumber] = useState('');
  const [message, setMessage] = useState('');
  const [storeName, setStoreName] = useState('Nuvoria Store');
  const { data: logo } = useStoreLogo();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('key,value')
        .in('key', ['whatsapp_enabled', 'whatsapp_number', 'whatsapp_message', 'store_name']);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ''; });
      setEnabled(map.whatsapp_enabled === 'true');
      setNumber(map.whatsapp_number || '');
      setMessage(map.whatsapp_message || '');
      if (map.store_name) setStoreName(map.store_name);
    })();
  }, []);

  if (!enabled || !number) return null;

  const digits = number.replace(/[^0-9]/g, '');
  const waHref = `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

  return (
    <div className="lg:hidden fixed bottom-3 inset-x-3 z-50" dir="ltr">
      <div className="flex items-center gap-3 rounded-2xl bg-foreground text-background shadow-xl shadow-foreground/25 px-3 py-2.5">
        <a href={`tel:${number.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="w-11 h-11 rounded-full bg-background/10 border border-background/20 overflow-hidden shrink-0 flex items-center justify-center">
            {logo ? <img src={logo} alt={storeName} className="w-full h-full object-contain" /> : null}
          </span>
          <span className="min-w-0">
            <span className="block font-cairo font-bold text-sm leading-tight truncate">{storeName}</span>
            <span className="block font-roboto text-xs text-background/70 leading-tight truncate">{number}</span>
          </span>
        </a>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#0f8f6c] hover:bg-[#0c7a5c] text-white px-3.5 h-11 font-cairo font-bold text-sm transition-colors"
        >
          <svg viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor" aria-hidden="true">
            <path d="M16.442 25.68a10.32 10.32 0 0 1-5.24-1.417l-.375-.223-3.877 1.013 1.036-3.78-.246-.388a10.31 10.31 0 0 1-1.573-5.492c.004-5.687 4.643-10.32 10.34-10.32a10.263 10.263 0 0 1 7.309 3.03 10.267 10.267 0 0 1 3.021 7.312c-.002 5.688-4.643 10.264-10.395 10.264zM16.5 3C9.043 3 3 8.985 3 16.36c0 2.442.66 4.827 1.916 6.925L3 30l6.897-1.811a13.443 13.443 0 0 0 6.6 1.717h.006c7.457 0 13.5-6.043 13.5-13.418 0-3.585-1.396-6.955-3.933-9.483A13.399 13.399 0 0 0 16.5 3z" />
          </svg>
          WhatsApp
        </a>
      </div>
    </div>
  );
}
