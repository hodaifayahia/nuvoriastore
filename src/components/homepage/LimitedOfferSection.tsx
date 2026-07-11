import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Flame, Truck, RotateCcw, Wallet } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface Props {
  title?: string;
  subtitle?: string;
  image?: string;
  link?: string;
  cta?: string;
  endDate?: string;
  price?: number;
  oldPrice?: number;
  brandLogo?: string;
  discountPct?: number;
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
const formatDzd = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

export default function LimitedOfferSection({
  title, subtitle, image, link, cta, endDate, price, oldPrice, discountPct,
}: Props) {
  const { language } = useTranslation();
  const isAr = language === 'ar';
  const { days, hours, minutes, seconds, expired } = useCountdown(endDate);

  const L = isAr
    ? {
        badge: 'العرض الأسبوعي',
        title: title || 'عرض حصري لفترة محدودة',
        subtitle: subtitle || 'اغتنم الفرصة قبل انتهاء المخزون. توصيل سريع لكل ولايات الجزائر.',
        was: 'يبدأ من', now: 'الآن', save: 'توفير',
        d: 'أيام', h: 'ساعات', m: 'دقائق', s: 'ثواني',
        cta: cta || 'اشتري الآن',
        ended: 'انتهى العرض',
        shipping: 'توصيل 24-72 ساعة',
        cod: 'الدفع عند الاستلام',
        returns: 'استبدال خلال 3 أيام',
        currency: 'د.ج',
      }
    : {
        badge: 'Offre de la semaine',
        title: title || 'Offre exclusive à durée limitée',
        subtitle: subtitle || "Profitez-en avant rupture de stock. Livraison rapide dans toute l'Algérie.",
        was: 'Avant', now: 'Maintenant', save: 'Économie',
        d: 'jours', h: 'heures', m: 'min', s: 'sec',
        cta: cta || 'Acheter maintenant',
        ended: 'Offre terminée',
        shipping: 'Livraison 24-72h',
        cod: 'Paiement à la livraison',
        returns: 'Retour sous 3 jours',
        currency: 'DZD',
      };

  const hasPrice = typeof price === 'number' && price > 0;
  const hasOld = typeof oldPrice === 'number' && oldPrice > (price || 0);
  const savings = hasPrice && hasOld ? (oldPrice as number) - (price as number) : 0;
  const pct = discountPct ?? (hasOld && hasPrice ? Math.round(((oldPrice! - price!) / oldPrice!) * 100) : null);

  if (expired && !title && !image) return null;

  const Cell = ({ n, label }: { n: number; label: string }) => (
    <div className="flex-1 min-w-[64px] rounded-2xl bg-muted/50 border border-border/60 py-3 sm:py-3.5 px-2 flex flex-col items-center">
      <span className="text-2xl sm:text-3xl font-black tabular-nums text-[hsl(217,91%,60%)] leading-none">
        {pad(n)}
      </span>
      <span className="mt-1.5 text-[10px] sm:text-[11px] text-muted-foreground font-medium">{label}</span>
    </div>
  );

  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-2xl">
          <div className="grid md:grid-cols-2 items-stretch">
            {/* Left — content */}
            <div className="relative p-6 sm:p-10 flex flex-col">
              {/* Soft brand tint */}
              <div className="absolute top-0 start-0 w-40 h-40 rounded-full bg-[hsl(258,90%,66%)]/8 blur-3xl pointer-events-none" aria-hidden />

              <div className="flex justify-end">
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[hsl(258,90%,66%)] to-[hsl(217,91%,60%)] shadow-lg shadow-[hsl(258,90%,66%)]/25">
                  <Flame className="w-4 h-4" />
                  {L.badge}
                </span>
              </div>

              <h2 className="mt-5 font-display font-black text-2xl sm:text-3xl lg:text-4xl leading-tight tracking-tight text-foreground">
                {L.title}
              </h2>

              {L.subtitle && (
                <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">
                  {L.subtitle}
                </p>
              )}

              {/* Price panel */}
              {hasPrice && (
                <div className="mt-6 rounded-2xl border border-border/60 bg-background/60 px-5 py-5 text-center">
                  {hasOld && (
                    <div className="text-sm text-muted-foreground line-through">
                      {L.was}: {formatDzd(oldPrice!)} {L.currency}
                    </div>
                  )}
                  <div className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                    {L.now}: <span className="text-foreground">{formatDzd(price!)}</span> <span className="text-2xl">{L.currency}</span>
                  </div>
                  {savings > 0 && (
                    <div className="mt-2 text-sm font-semibold text-emerald-600">
                      {L.save}: {formatDzd(savings)} {L.currency}
                    </div>
                  )}
                </div>
              )}

              {/* Countdown */}
              {endDate && !expired && (
                <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
                  <Cell n={seconds} label={L.s} />
                  <Cell n={minutes} label={L.m} />
                  <Cell n={hours} label={L.h} />
                  <Cell n={days} label={L.d} />
                </div>
              )}

              {expired && (
                <p className="mt-5 text-sm text-muted-foreground font-semibold uppercase tracking-widest">{L.ended}</p>
              )}

              {/* CTA */}
              <div className="mt-6 flex justify-end">
                <Link to={link || '/products'}>
                  <Button
                    size="lg"
                    className="rounded-full min-h-[52px] px-8 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,52%)] text-white font-bold border-0 shadow-lg shadow-[hsl(217,91%,60%)]/25"
                  >
                    {L.cta}
                  </Button>
                </Link>
              </div>

              {/* Trust chips */}
              <div className="mt-5 flex flex-wrap gap-2 justify-center md:justify-end">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/60 text-xs font-semibold text-foreground">
                  <Truck className="w-3.5 h-3.5 text-[hsl(217,91%,60%)]" />
                  {L.shipping}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/60 text-xs font-semibold text-foreground">
                  <Wallet className="w-3.5 h-3.5 text-[hsl(217,91%,60%)]" />
                  {L.cod}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/60 text-xs font-semibold text-foreground">
                  <RotateCcw className="w-3.5 h-3.5 text-[hsl(217,91%,60%)]" />
                  {L.returns}
                </span>
              </div>
            </div>

            {/* Right — product */}
            <div className="relative min-h-[280px] md:min-h-full bg-white flex items-center justify-center p-6 sm:p-8">
              {pct !== null && pct > 0 && (
                <div className="absolute top-4 start-4 w-14 h-14 rounded-full bg-[hsl(217,91%,60%)] text-white flex items-center justify-center font-black text-sm shadow-lg z-10">
                  -{pct}%
                </div>
              )}
              {image ? (
                <img
                  src={image}
                  alt={L.title}
                  loading="lazy"
                  decoding="async"
                  className="relative max-h-[420px] w-auto object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="flex items-center justify-center text-muted-foreground/30">
                  <Flame className="w-24 h-24" strokeWidth={1.2} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
