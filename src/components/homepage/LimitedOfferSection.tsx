import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Flame, ArrowRight, Clock } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface Props {
  title?: string;
  subtitle?: string;
  image?: string;
  link?: string;
  cta?: string;
  endDate?: string;
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
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    expired: targetTs > 0 && diff === 0,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function LimitedOfferSection({ title, subtitle, image, link, cta, endDate }: Props) {
  const { language } = useTranslation();
  const isAr = language === 'ar';
  const { days, hours, minutes, seconds, expired } = useCountdown(endDate);

  // Bilingual defaults — if the stored value is in the "wrong" language we still show a sensible label
  const L = isAr
    ? {
        badge: 'عرض محدود',
        title: title || 'عرض حصري لفترة محدودة',
        subtitle: subtitle || 'اغتنم الفرصة قبل انتهاء المخزون. توصيل سريع لكل ولايات الجزائر.',
        d: 'يوم', h: 'ساعة', m: 'دقيقة', s: 'ثانية',
        ends: 'ينتهي خلال',
        cta: cta || 'اطلب الآن',
        ended: 'انتهى العرض',
      }
    : {
        badge: 'Offre limitée',
        title: title || 'Offre exclusive à durée limitée',
        subtitle: subtitle || "Profitez-en avant rupture de stock. Livraison rapide dans toute l'Algérie.",
        d: 'j', h: 'h', m: 'min', s: 'sec',
        ends: 'Se termine dans',
        cta: cta || 'Commander',
        ended: 'Offre terminée',
      };

  if (expired && !title && !image) return null;

  const Cell = ({ n, label }: { n: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="min-w-[52px] sm:min-w-[64px] px-2 py-2 sm:py-2.5 rounded-xl bg-foreground text-background text-2xl sm:text-3xl font-black tabular-nums text-center">
        {pad(n)}
      </div>
      <span className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
    </div>
  );

  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl">
          <div className="grid md:grid-cols-2 items-stretch">
            {/* Image */}
            <div className="relative min-h-[220px] md:min-h-[340px] bg-muted">
              {image ? (
                <img
                  src={image}
                  alt={L.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                  <Flame className="w-20 h-20" strokeWidth={1.2} />
                </div>
              )}
              <div className="absolute top-4 start-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-bold text-white bg-red-600 shadow-lg">
                <Flame className="w-3.5 h-3.5" />
                {L.badge}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-10 flex flex-col justify-center">
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl leading-tight tracking-tight text-foreground">
                {L.title}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">
                {L.subtitle}
              </p>

              {endDate && !expired && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                    <Clock className="w-3.5 h-3.5 text-red-500" />
                    {L.ends}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Cell n={days} label={L.d} />
                    <span className="text-muted-foreground/40 text-xl font-bold -mt-5">:</span>
                    <Cell n={hours} label={L.h} />
                    <span className="text-muted-foreground/40 text-xl font-bold -mt-5">:</span>
                    <Cell n={minutes} label={L.m} />
                    <span className="text-muted-foreground/40 text-xl font-bold -mt-5">:</span>
                    <Cell n={seconds} label={L.s} />
                  </div>
                </div>
              )}

              {expired && (
                <p className="mt-6 text-sm text-muted-foreground font-semibold uppercase tracking-widest">{L.ended}</p>
              )}

              <div className="mt-7">
                <Link to={link || '/products'}>
                  <Button size="lg" className="rounded-full gap-2 min-h-[52px] px-7 bg-red-600 hover:bg-red-700 text-white font-bold border-0 shadow-lg">
                    {L.cta}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
