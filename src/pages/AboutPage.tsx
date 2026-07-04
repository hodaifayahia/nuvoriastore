import SEO from '@/components/SEO';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Store, Heart, Truck, Shield, Phone, Mail, MapPin, Star, Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function AboutPage() {
  const { t } = useTranslation();

  const missions = [
    { icon: Heart,  title: t('about.missions.1.title'), desc: t('about.missions.1.description') },
    { icon: Truck,  title: t('about.missions.2.title'), desc: t('about.missions.2.description') },
    { icon: Shield, title: t('about.missions.3.title'), desc: t('about.missions.3.description') },
    { icon: Star,   title: t('about.missions.4.title'), desc: t('about.missions.4.description') },
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
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-primary/20 bg-gradient-to-br from-primary via-primary to-primary/90">
        <div className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px',
            color: 'hsl(var(--primary-foreground))',
          }}
        />
        <div className="container relative z-10 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary bg-primary-foreground rounded-full px-5 py-2 mb-6 animate-fade-in shadow-lg shadow-primary-foreground/10">
            <Sparkles className="w-4 h-4" />
            {storeName}
          </div>
          <div className="w-20 h-20 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 animate-fade-in shadow-xl shadow-primary/20">
            <Store className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-cairo font-black text-4xl md:text-5xl lg:text-6xl text-primary-foreground mb-4 animate-fade-in drop-shadow-sm" style={{ animationDelay: '0.1s' }}>
            {t('about.title')}
          </h1>
          <p className="font-cairo text-lg md:text-xl text-primary-foreground/85 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {description}
          </p>
        </div>
      </section>


      {/* Story */}
      <section className="container py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <div className="inline-block font-cairo text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            {t('about.storyTitle')}
          </div>
          <h2 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-6">{t('about.story.heading')}</h2>
          <p className="font-cairo text-muted-foreground leading-loose text-lg">
            {t('about.story.body').replace('{storeName}', storeName)}
          </p>
        </div>
      </section>

      {/* Mission Cards */}
      <section className="bg-secondary py-16 md:py-24 border-y border-border">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-block font-cairo text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-4">
              {t('about.features.label')}
            </div>
            <h2 className="font-cairo font-bold text-3xl md:text-4xl text-secondary-foreground">{t('about.whyChooseUs')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {missions.map((m, i) => (
              <div
                key={m.title}
                className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${0.1 * (i + 1)}s` }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
                  <m.icon className="w-7 h-7" />
                </div>
                <h3 className="font-cairo font-bold text-lg text-foreground mb-2">{m.title}</h3>
                <p className="font-cairo text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="container py-16 md:py-24">
        <h2 className="font-cairo font-bold text-3xl text-foreground text-center mb-12 animate-fade-in">{t('about.contactTitle')}</h2>
        <div className="max-w-xl mx-auto space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-4 bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-cairo font-semibold text-foreground">{t('about.phone')}</p>
                <p className="font-roboto text-muted-foreground" dir="ltr">{phone}</p>
              </div>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-4 bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Mail className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="font-cairo font-semibold text-foreground">{t('about.email')}</p>
                <p className="font-roboto text-muted-foreground" dir="ltr">{email}</p>
              </div>
            </a>
          )}
          <div className="flex items-center gap-4 bg-card border rounded-xl p-5">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <MapPin className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-cairo font-semibold text-foreground">{t('about.address')}</p>
              <p className="font-cairo text-muted-foreground">{address}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
