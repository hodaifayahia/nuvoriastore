import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_TEXT = '✨ نوفر جميع المنتجات الأصلية مع ضمان لمدة عام كامل من طرف المحل وتوصيل سريع لكامل الولايات 🚚';

export default function TopMarquee() {
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

  // Enabled by default unless explicitly set to 'false'
  const enabled = data?.top_marquee_enabled !== 'false';
  const text = (data?.top_marquee_text?.trim() || DEFAULT_TEXT);

  if (!enabled) return null;

  // Build a long repeated line so the animation is seamless on wide screens
  const chunk = `  •  ${text}`;
  const line = Array(6).fill(chunk).join('');

  return (
    <div
      className="sticky top-0 z-[60] w-full overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground shadow-sm"
      dir="ltr"
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
