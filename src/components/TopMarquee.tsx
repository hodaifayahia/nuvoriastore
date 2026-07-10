import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/i18n';

const DEFAULT_TEXT_FR = '🎁 Produits 100% originaux 💯  ✦  🛡️ Garantie magasin 1 an  ✦  🚚 Livraison rapide dans les 58 wilayas  ✦  💳 Paiement à la livraison  ✦  🔥 Offres exclusives chaque semaine';
const DEFAULT_TEXT_AR = '🎁 منتجات أصلية 100% 💯  ✦  🛡️ ضمان المتجر لمدة سنة  ✦  🚚 توصيل سريع لكل 58 ولاية  ✦  💳 الدفع عند الاستلام  ✦  🔥 عروض حصرية كل أسبوع';

export default function TopMarquee() {
  const { language, dir } = useTranslation();
  const { data } = useQuery({
    queryKey: ['top-marquee'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['top_marquee_enabled', 'top_marquee_text']);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ''; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const enabled = data?.top_marquee_enabled !== 'false';
  const defaultText = language === 'ar' ? DEFAULT_TEXT_AR : DEFAULT_TEXT_FR;
  const text = (data?.top_marquee_text?.trim() || defaultText);

  if (!enabled) return null;

  const chunk = `  •  ${text}`;
  const line = Array(6).fill(chunk).join('');

  return (
    <div
      className="sticky top-0 z-40 w-full overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground shadow-sm"
      dir={dir}
      role="marquee"
      aria-label={text}
    >
      <div className="flex whitespace-nowrap animate-brand-marquee py-2" style={{ animationDuration: '40s', animationTimingFunction: 'linear' }}>
        <span className="font-cairo font-semibold text-sm sm:text-base px-4">{line}</span>
        <span className="font-cairo font-semibold text-sm sm:text-base px-4" aria-hidden>{line}</span>
      </div>
    </div>
  );
}
