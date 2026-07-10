import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Flame, ArrowRight, Clock, Zap } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface Props {
  title?: string;
  subtitle?: string;
  image?: string;
  link?: string;
  cta?: string;
  endDate?: string; // ISO
}

function useCountdown(target?: string) {
  const targetTs = useMemo(() => (target ? new Date(target).getTime() : 0), [target]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetTs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetTs]);
  const diff = Math.max(0, targetTs - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, expired: targetTs > 0 && diff === 0 };
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function LimitedOfferSection({ title, subtitle, image, link, cta, endDate }: Props) {
  const { language } = useTranslation();
  const isAr = language === 'ar';
  const { days, hours, minutes, seconds, expired } = useCountdown(endDate);

  if (expired && !title && !image) return null;

  const labels = isAr
    ? { badge: 'عرض محدود', d: 'يوم', h: 'ساعة', m: 'دقيقة', s: 'ثانية', ends: 'ينتهي العرض خلال', cta: cta || 'اغتنم الفرصة', ended: 'انتهى العرض' }
    : { badge: 'Offre limitée', d: 'jours', h: 'h', m: 'min', s: 'sec', ends: 'Se termine dans', cta: cta || 'Profiter maintenant', ended: 'Offre terminée' };

  const Cell = ({ n, label }: { n: number; label: string }) => (
    <div className="flex flex-col items-center min-w-[64px] sm:min-w-[78px]">
      <div className="relative w-full">
        <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08)] px-3 py-3 sm:py-4 text-white text-3xl sm:text-4xl font-black font-roboto tabular-nums text-center tracking-tight">
          {pad(n)}
        </div>
        <div className="absolute inset-x-3 top-1/2 h-px bg-white/10" aria-hidden />
      </div>
      <span className="mt-2 text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-white/70 font-semibold">{label}</span>
    </div>
  );

  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_40px_100px_-30px_hsl(0_85%_50%/0.45)]">
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0410] via-[#3a0a1a] to-[#0b0510]" aria-hidden />
          {image && (
            <img
              src={image}
              alt={title || labels.badge}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
            />
          )}
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, hsl(0 90% 60% / 0.6), transparent 40%), radial-gradient(circle at 80% 80%, hsl(30 100% 55% / 0.5), transparent 45%)',
            }}
            aria-hidden
          />
          {/* Animated ember */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-red-500/30 blur-3xl animate-pulse" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-amber-400/20 blur-3xl animate-pulse" aria-hidden />

          <div className="relative grid md:grid-cols-[1.15fr_1fr] gap-6 sm:gap-10 p-6 sm:p-10 lg:p-14">
            {/* Left — content */}
            <div className="flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold text-white bg-gradient-to-r from-red-600 to-orange-500 shadow-lg shadow-red-900/40 mb-5">
                <Flame className="w-3.5 h-3.5" /> {labels.badge}
              </span>

              <h2 className="font-display font-black uppercase text-white text-3xl sm:text-4xl lg:text-5xl leading-[1.02] tracking-tight">
                {title || (isAr ? 'عرض حصري ينتهي قريبًا' : 'Offre exclusive à durée limitée')}
              </h2>

              {subtitle && (
                <p className="mt-4 text-sm sm:text-base text-white/75 max-w-md leading-relaxed">{subtitle}</p>
              )}

              {/* Countdown */}
              {endDate && !expired && (
                <div className="mt-7">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/80 font-semibold mb-3">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    {labels.ends}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Cell n={days} label={labels.d} />
                    <span className="text-white/40 text-2xl font-black -mt-5">:</span>
                    <Cell n={hours} label={labels.h} />
                    <span className="text-white/40 text-2xl font-black -mt-5">:</span>
                    <Cell n={minutes} label={labels.m} />
                    <span className="text-white/40 text-2xl font-black -mt-5">:</span>
                    <Cell n={seconds} label={labels.s} />
                  </div>
                </div>
              )}

              {expired && (
                <p className="mt-6 text-sm text-white/60 font-semibold uppercase tracking-widest">{labels.ended}</p>
              )}

              <div className="mt-8">
                <Link to={link || '/products'}>
                  <Button
                    size="lg"
                    className="rounded-full gap-2 min-h-[52px] px-7 bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 text-white font-bold border-0 shadow-lg shadow-red-900/40 hover:shadow-red-900/60 hover:brightness-110 transition-all"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    {labels.cta}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right — product visual */}
            <div className="relative min-h-[240px] md:min-h-[360px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/0">
              {image ? (
                <>
                  <img
                    src={image}
                    alt={title || labels.badge}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/30">
                  <Flame className="w-24 h-24" strokeWidth={1.2} />
                </div>
              )}
              {/* Corner discount stamp */}
              <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white shadow-2xl shadow-red-900/50 rotate-[-8deg] border-2 border-white/20">
                <div className="text-center leading-tight">
                  <div className="text-[9px] uppercase tracking-widest font-bold">{isAr ? 'حصري' : 'Deal'}</div>
                  <div className="text-2xl font-black">-30%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
