import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';

const DEFAULT_PHRASES_FR = [
  'Acheter maintenant',
  'Marques fiables',
  'Sélection premium',
  'Livraison dans toutes les wilayas',
  'Garantie 1 an',
  'Paiement à la livraison',
];

const DEFAULT_PHRASES_AR = [
  'اشترِ الآن',
  'علامات موثوقة',
  'اختيار مميّز',
  'توصيل لكل الولايات',
  'ضمان سنة كاملة',
  'الدفع عند الاستلام',
];

interface Props {
  phrases?: string[];
  duration?: string;
  className?: string;
}

export default function TextMarquee({
  phrases,
  duration = '40s',
  className = '',
}: Props) {
  const { language } = useTranslation();
  const resolved = phrases ?? (language === 'ar' ? DEFAULT_PHRASES_AR : DEFAULT_PHRASES_FR);

  // A single "track" = one full pass of the phrases. We render it twice inside
  // a flex row and animate translateX from 0 → -50%. Because both tracks are
  // identical and the gap between items is uniform (including the gap between
  // the two tracks), the loop point is invisible — no pause, no jump.
  const Track = ({ ariaHidden = false }: { ariaHidden?: boolean }) => (
    <div
      className="flex items-center gap-6 sm:gap-10 shrink-0"
      aria-hidden={ariaHidden || undefined}
    >
      {resolved.map((phrase, i) => (
        <div key={i} className="flex items-center gap-6 sm:gap-10 shrink-0">
          <span className="font-display font-extrabold uppercase tracking-tight text-base sm:text-xl md:text-2xl whitespace-nowrap">
            {phrase}
          </span>
          <Sparkles
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 opacity-80"
            style={{ color: 'hsl(var(--primary))' }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div
      dir="ltr"
      className={`relative overflow-hidden py-3 sm:py-4 border-y border-border/40 bg-card/40 backdrop-blur-sm ${className}`}
      style={{
        maskImage:
          'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
      }}
    >
      <div
        className="flex w-max gap-6 sm:gap-10 animate-brand-marquee will-change-transform"
        style={{ animationDuration: duration, animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}
      >
        <Track />
        <Track ariaHidden />
      </div>
    </div>
  );
}
