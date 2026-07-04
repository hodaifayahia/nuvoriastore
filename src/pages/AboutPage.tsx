import SEO from '@/components/SEO';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Store, Heart, Truck, Shield, Phone, Mail, MapPin, Star, Sparkles, Quote, ArrowLeft, MessageCircle, CheckCircle2, Facebook, Instagram, Twitter, Send, Youtube, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';

export default function AboutPage() {
  const { t } = useTranslation();

  const missions = [
    { icon: Heart,  title: t('about.missions.1.title'), desc: t('about.missions.1.description'), tone: 'from-rose-500/15 to-rose-500/5',   accent: 'text-rose-500',   ring: 'ring-rose-500/20' },
    { icon: Truck,  title: t('about.missions.2.title'), desc: t('about.missions.2.description'), tone: 'from-primary/15 to-primary/5',     accent: 'text-primary',    ring: 'ring-primary/20' },
    { icon: Shield, title: t('about.missions.3.title'), desc: t('about.missions.3.description'), tone: 'from-emerald-500/15 to-emerald-500/5', accent: 'text-emerald-500', ring: 'ring-emerald-500/20' },
    { icon: Star,   title: t('about.missions.4.title'), desc: t('about.missions.4.description'), tone: 'from-amber-500/15 to-amber-500/5', accent: 'text-amber-500',  ring: 'ring-amber-500/20' },
  ];

  const { data: settings } = useQuery({
    queryKey: ['about-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*');
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  const storeName = settings?.store_name || 'NuvoriaStore';
  const description = settings?.footer_description || t('about.heroFallbackDescription');
  const phone = settings?.footer_phone;
  const email = settings?.footer_email;
  const address = settings?.footer_address || t('about.defaultAddress');

  const stats = [
    { value: '1000+', label: 'عميل سعيد' },
    { value: '58',    label: 'ولاية مغطاة' },
    { value: '24/7',  label: 'دعم فوري' },
    { value: '100%',  label: 'منتجات أصلية' },
  ];

  const TikTokIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V9.11a8.16 8.16 0 0 0 4.77 1.52V7.19a4.85 4.85 0 0 1-1.84-.5z"/>
    </svg>
  );

  const whatsappHref = settings?.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`
    : phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : '';

  const socials = [
    { url: settings?.instagram_url, Icon: Instagram,   label: 'Instagram', color: 'from-pink-500 to-purple-600' },
    { url: settings?.facebook_url,  Icon: Facebook,    label: 'Facebook',  color: 'from-blue-600 to-blue-700' },
    { url: settings?.tiktok_url,    Icon: TikTokIcon,  label: 'TikTok',    color: 'from-slate-900 to-slate-700' },
    { url: whatsappHref,            Icon: MessageCircle, label: 'WhatsApp', color: 'from-emerald-500 to-emerald-600' },
    { url: settings?.youtube_url,   Icon: Youtube,     label: 'YouTube',   color: 'from-red-500 to-red-600' },
    { url: settings?.twitter_url,   Icon: Twitter,     label: 'Twitter',   color: 'from-sky-500 to-sky-600' },
    { url: settings?.telegram_url,  Icon: Send,        label: 'Telegram',  color: 'from-cyan-500 to-blue-500' },
    { url: settings?.linkedin_url,  Icon: Linkedin,    label: 'LinkedIn',  color: 'from-blue-700 to-blue-800' },
  ].filter(s => s.url);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('about.title')} — ${storeName}`}
        description={description}
        path="/about"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: storeName,
          description,
        }}
      />

      {/* ─────────── EDITORIAL HERO ─────────── */}
      <section className="relative overflow-hidden border-b border-primary/20 bg-gradient-to-br from-primary via-primary to-primary/85">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute -top-40 -right-20 w-[32rem] h-[32rem] rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 w-[32rem] h-[32rem] rounded-full bg-accent/25 blur-3xl" />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '22px 22px',
            color: 'hsl(var(--primary-foreground))',
          }}
        />

        <div className="container relative z-10 py-16 md:py-24 lg:py-28">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Copy column */}
            <div className="lg:col-span-7 space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-primary bg-primary-foreground rounded-full px-4 py-1.5 shadow-lg shadow-primary-foreground/10">
                <Sparkles className="w-3.5 h-3.5" />
                {storeName}
              </div>

              <h1 className="font-cairo font-black text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.05] text-primary-foreground drop-shadow-sm">
                {t('about.title')}
                <span className="block text-primary-foreground/60 font-cairo font-bold text-[clamp(1.25rem,2.5vw,2rem)] mt-3">
                  {t('about.story.heading')}
                </span>
              </h1>

              <p className="font-cairo text-base md:text-lg lg:text-xl text-primary-foreground/85 leading-relaxed max-w-2xl">
                {description}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/products">
                  <Button size="lg" className="font-cairo font-bold h-12 md:h-13 px-6 rounded-2xl bg-primary-foreground text-primary hover:bg-primary-foreground/95 shadow-xl shadow-primary/30 gap-2 group">
                    {t('about.cta.shopNow') || 'تسوق الآن'}
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </Button>
                </Link>
                {phone && (
                  <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" variant="outline" className="font-cairo font-bold h-12 md:h-13 px-6 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground gap-2">
                      <MessageCircle className="w-4 h-4" />
                      {t('about.cta.contact') || 'تواصل معنا'}
                    </Button>
                  </a>
                )}
              </div>

              {/* Trust chips */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-4 text-primary-foreground/85">
                {['شحن سريع', 'ضمان أصلي', 'دفع عند التسليم'].map(chip => (
                  <div key={chip} className="flex items-center gap-2 font-cairo text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    <span>{chip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual column — floating icon medallions */}
            <div className="lg:col-span-5 relative h-[380px] md:h-[440px] hidden lg:block">
              {/* Big glass disc */}
              <div className="absolute inset-4 rounded-[2.5rem] bg-primary-foreground/10 backdrop-blur-xl border border-primary-foreground/20 shadow-2xl shadow-primary/40" />
              <div className="absolute inset-10 rounded-[2rem] border border-primary-foreground/15" />

              {/* Central store medallion */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-accent/40 blur-2xl scale-110 animate-pulse" />
                  <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary-foreground to-primary-foreground/80 flex items-center justify-center shadow-2xl shadow-primary/50">
                    <Store className="w-14 h-14 text-primary" />
                  </div>
                </div>
              </div>

              {/* Orbiting mission chips */}
              {missions.map((m, i) => {
                const positions = [
                  'top-4 right-4',
                  'top-4 left-4',
                  'bottom-4 right-4',
                  'bottom-4 left-4',
                ];
                return (
                  <div
                    key={m.title}
                    className={`absolute ${positions[i]} bg-primary-foreground/95 backdrop-blur-sm rounded-2xl px-3.5 py-2.5 flex items-center gap-2 shadow-xl shadow-primary/30 border border-primary-foreground/50 animate-fade-in`}
                    style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                  >
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${m.tone} ring-1 ${m.ring} flex items-center justify-center`}>
                      <m.icon className={`w-4 h-4 ${m.accent}`} />
                    </div>
                    <span className="font-cairo font-bold text-xs text-primary whitespace-nowrap max-w-[110px] truncate">
                      {m.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom fade to next section */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background/10" />
      </section>

      {/* ─────────── STATS STRIP ─────────── */}
      <section className="relative -mt-8 md:-mt-10 container z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 bg-card/95 backdrop-blur-xl border border-border/60 rounded-3xl p-5 md:p-6 shadow-xl shadow-primary/10 animate-fade-in">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`text-center px-3 py-2 ${i > 0 ? 'md:border-r md:border-border/50 md:first:border-r-0' : ''}`}
            >
              <p className="font-roboto font-black text-3xl md:text-4xl bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                {s.value}
              </p>
              <p className="font-cairo text-xs md:text-sm text-muted-foreground font-semibold mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── STORY (pull quote) ─────────── */}
      <section className="container py-20 md:py-28">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-block font-cairo text-xs font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-4">
              {t('about.storyTitle')}
            </div>
            <h2 className="font-cairo font-bold text-3xl md:text-5xl text-foreground leading-tight">
              {t('about.story.heading')}
            </h2>
          </div>

          <div className="relative bg-gradient-to-br from-card via-card to-primary/[0.03] border border-border/60 rounded-3xl p-8 md:p-12 shadow-sm">
            <Quote className="absolute top-6 right-6 w-14 h-14 text-primary/10 rotate-180" />
            <p className="font-cairo text-muted-foreground leading-loose text-base md:text-lg text-center relative z-10">
              {t('about.story.body').replace('{storeName}', storeName)}
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-gradient-to-l from-primary/40 to-transparent" />
              <div className="font-cairo font-bold text-primary">{storeName}</div>
              <div className="h-px w-12 bg-gradient-to-r from-primary/40 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── MISSIONS (colored medallions) ─────────── */}
      <section className="relative py-20 md:py-28 border-y border-border/60 bg-gradient-to-b from-secondary/40 via-secondary/60 to-secondary/40 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="container relative">
          <div className="text-center mb-14">
            <div className="inline-block font-cairo text-xs font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-4">
              {t('about.features.label')}
            </div>
            <h2 className="font-cairo font-bold text-3xl md:text-5xl text-secondary-foreground max-w-2xl mx-auto leading-tight">
              {t('about.whyChooseUs')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {missions.map((m, i) => (
              <div
                key={m.title}
                className="group relative bg-card border border-border/60 rounded-3xl p-7 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-2 transition-all duration-500 animate-fade-in overflow-hidden"
                style={{ animationDelay: `${0.08 * (i + 1)}s` }}
              >
                {/* Corner gradient wash */}
                <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${m.tone} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />

                <div className="relative">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${m.tone} ring-1 ${m.ring} flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                    <m.icon className={`w-8 h-8 ${m.accent}`} />
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-roboto font-black text-xs text-primary/40">
                      0{i + 1}
                    </span>
                    <h3 className="font-cairo font-bold text-lg text-foreground">{m.title}</h3>
                  </div>
                  <p className="font-cairo text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CONTACT ─────────── */}
      <section className="container py-20 md:py-28">
        <div className="text-center mb-14 animate-fade-in">
          <div className="inline-block font-cairo text-xs font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            {t('about.contactTitle')}
          </div>
          <h2 className="font-cairo font-bold text-3xl md:text-5xl text-foreground leading-tight">
            {t('about.contactTitle')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="group relative bg-card border border-border/60 rounded-3xl p-7 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden animate-fade-in"
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-4 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                  <Phone className="w-6 h-6 text-primary-foreground" />
                </div>
                <p className="font-cairo font-bold text-foreground text-lg mb-1">{t('about.phone')}</p>
                <p className="font-roboto text-muted-foreground group-hover:text-primary transition-colors" dir="ltr">{phone}</p>
              </div>
            </a>
          )}

          {email && (
            <a
              href={`mailto:${email}`}
              className="group relative bg-card border border-border/60 rounded-3xl p-7 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden animate-fade-in"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center mb-4 shadow-lg shadow-accent/30 group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6 text-accent-foreground" />
                </div>
                <p className="font-cairo font-bold text-foreground text-lg mb-1">{t('about.email')}</p>
                <p className="font-roboto text-muted-foreground group-hover:text-primary transition-colors break-all" dir="ltr">{email}</p>
              </div>
            </a>
          )}

          <div
            className="group relative bg-card border border-border/60 rounded-3xl p-7 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <p className="font-cairo font-bold text-foreground text-lg mb-1">{t('about.address')}</p>
              <p className="font-cairo text-muted-foreground">{address}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
