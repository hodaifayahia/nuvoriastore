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
  // Repeat phrases inside each track so it is always wider than any viewport,
  // guaranteeing a seamless loop with no visible gap on wrap.
  const trackPhrases = [...phrases, ...phrases, ...phrases];

  const Track = ({ ariaHidden = false }: { ariaHidden?: boolean }) => (
    <div
      className="flex items-center gap-6 sm:gap-10 pr-6 sm:pr-10 shrink-0"
      aria-hidden={ariaHidden || undefined}
    >
      {trackPhrases.map((phrase, i) => (
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
      className={`relative overflow-hidden py-3 sm:py-4 border-y border-border/40 bg-card/40 backdrop-blur-sm ${className}`}
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
