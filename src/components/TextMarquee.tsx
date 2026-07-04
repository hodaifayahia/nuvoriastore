import { Sparkles } from 'lucide-react';

const DEFAULT_PHRASES = [
  'تسوق الآن',
  'علامات موثوقة',
  'مدعوم من الأفضل',
  'شحن سريع لكل الولايات',
  'ضمان سنة كاملة',
  'دفع عند الاستلام',
];

interface Props {
  phrases?: string[];
  /** Animation duration for one full loop */
  duration?: string;
  className?: string;
}

/**
 * Seamless infinite horizontal text marquee.
 * Two identical tracks side-by-side; the outer container translates from 0 to -50%
 * at a linear timing so items exiting one edge re-enter from the opposite edge
 * without any gap, flicker, or reset.
 */
export default function TextMarquee({
  phrases = DEFAULT_PHRASES,
  duration = '35s',
  className = '',
}: Props) {
  const Track = ({ ariaHidden = false }: { ariaHidden?: boolean }) => (
    <div
      className="flex items-center gap-8 sm:gap-12 pr-8 sm:pr-12 shrink-0"
      aria-hidden={ariaHidden || undefined}
    >
      {phrases.map((phrase, i) => (
        <div key={i} className="flex items-center gap-8 sm:gap-12 shrink-0">
          <span className="font-display font-extrabold uppercase tracking-tight text-2xl sm:text-4xl md:text-5xl whitespace-nowrap">
            {phrase}
          </span>
          <Sparkles
            className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-80"
            style={{ color: 'hsl(var(--primary))' }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`relative overflow-hidden py-4 sm:py-6 border-y border-border/40 bg-card/40 backdrop-blur-sm ${className}`}
      style={{
        maskImage:
          'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
      }}
    >
      <div
        className="flex w-max animate-brand-marquee"
        style={{ animationDuration: duration, animationTimingFunction: 'linear' }}
      >
        <Track />
        <Track ariaHidden />
      </div>
    </div>
  );
}
