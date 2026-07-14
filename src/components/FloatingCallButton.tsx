import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Phone } from 'lucide-react';

export default function FloatingCallButton() {
  const [enabled, setEnabled] = useState(false);
  const [number, setNumber] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('key,value')
        .in('key', ['whatsapp_enabled', 'whatsapp_number']);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ''; });
      setEnabled(map.whatsapp_enabled === 'true');
      setNumber(map.whatsapp_number || '');
    })();
  }, []);

  if (!enabled || !number) return null;

  return (
    <a
      href={`tel:${number.replace(/[^0-9+]/g, '')}`}
      aria-label="Appeler"
      className="fixed bottom-24 left-6 z-50 h-14 w-14 hover:w-52 group rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 flex items-center justify-start overflow-hidden transition-all duration-500 ease-out border border-white/20 select-none cursor-pointer"
    >
      <div className="w-14 h-14 shrink-0 flex items-center justify-center">
        <Phone className="w-6 h-6 animate-pulse" />
      </div>
      <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap overflow-hidden transition-opacity duration-300 font-bold font-cairo text-sm tracking-wide pl-1 pr-4">
        {number}
      </span>
    </a>
  );
}
