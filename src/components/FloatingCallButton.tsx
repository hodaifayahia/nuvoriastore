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
      setNumber((map.whatsapp_number || '').replace(/[^0-9+]/g, ''));
    })();
  }, []);

  if (!enabled || !number) return null;

  return (
    <a
      href={`tel:+${number}`}
      aria-label="Appeler"
      className="fixed bottom-24 left-6 z-50 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white shadow-lg shadow-[#25D366]/30 flex items-center justify-center transition-all hover:scale-110 ring-4 ring-white/20 animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <Phone className="w-6 h-6" fill="currentColor" />
    </a>
  );
}
