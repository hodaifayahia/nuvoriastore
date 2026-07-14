import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function WhatsAppFloat() {
  const [enabled, setEnabled] = useState(false);
  const [number, setNumber] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('key,value')
        .in('key', ['whatsapp_enabled', 'whatsapp_number', 'whatsapp_message']);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ''; });
      setEnabled(map.whatsapp_enabled === 'true');
      setNumber((map.whatsapp_number || '').replace(/[^0-9]/g, ''));
      setMessage(map.whatsapp_message || '');
    })();
  }, []);

  if (!enabled || !number) return null;

  const href = `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-40 left-6 z-50 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white shadow-lg shadow-[#25D366]/30 flex items-center justify-center transition-transform hover:scale-110 ring-4 ring-white/20"
    >
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="currentColor" aria-hidden="true">
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.115-.28.229-.86.229-1.16 0-.245-.688-.395-.887-.483-.518-.216-1.087-.417-1.588-.717-.53-.244-.774-.373-1.088-.373zM16.442 25.68a10.32 10.32 0 0 1-5.24-1.417l-.375-.223-3.877 1.013 1.036-3.78-.246-.388a10.31 10.31 0 0 1-1.573-5.492c.004-5.687 4.643-10.32 10.34-10.32a10.263 10.263 0 0 1 7.309 3.03 10.267 10.267 0 0 1 3.021 7.312c-.002 5.688-4.643 10.264-10.395 10.264zM16.5 3C9.043 3 3 8.985 3 16.36c0 2.442.66 4.827 1.916 6.925L3 30l6.897-1.811a13.443 13.443 0 0 0 6.6 1.717h.006c7.457 0 13.5-6.043 13.5-13.418 0-3.585-1.396-6.955-3.933-9.483A13.399 13.399 0 0 0 16.5 3z" />
      </svg>
    </a>
  );
}
