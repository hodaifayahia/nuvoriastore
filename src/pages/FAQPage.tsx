import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HelpCircle, MessageCircle, Phone, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';
import { useTranslation } from '@/i18n';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function FAQPage() {
  const { t } = useTranslation();

  const { data: settings } = useQuery({
    queryKey: ['faq-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*').in('key', [
        'store_name', 'footer_phone',
      ]);
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  const storeName = settings?.store_name || 'NuvoriaStore';
  const whatsappNumber = settings?.footer_phone || '';

  const faqs = Array.from({ length: 10 }, (_, i) => ({
    question: t(`faq.items.${i + 1}.question`),
    answer: t(`faq.items.${i + 1}.answer`),
  }));

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('faq.title')} — ${storeName}`}
        description={t('faq.subtitle')}
        path="/faq"
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
            <HelpCircle className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-cairo font-black text-4xl md:text-5xl lg:text-6xl text-primary-foreground mb-4 animate-fade-in drop-shadow-sm" style={{ animationDelay: '0.1s' }}>
            {t('faq.title')}
          </h1>
          <p className="font-cairo text-lg md:text-xl text-primary-foreground/85 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {t('faq.subtitle')}
          </p>
        </div>
      </section>


      {/* FAQ Accordion */}
      <section className="container py-16 md:py-20">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="text-center mb-10">
            <div className="inline-block font-cairo text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-4">
              {t('faq.title')}
            </div>
            <h2 className="font-cairo font-bold text-3xl md:text-4xl text-foreground">
              {t('faq.subtitle')}
            </h2>
          </div>

          <div className="space-y-3">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border border-border/60 bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300"
                >
                  <AccordionTrigger className="px-5 md:px-6 py-5 text-right hover:no-underline hover:bg-primary/[0.03] transition-colors group [&[data-state=open]]:bg-primary/[0.04]">
                    <div className="flex items-center gap-3 flex-1 text-right">
                      <span className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center font-roboto font-bold text-sm text-primary">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-cairo font-semibold text-foreground text-base group-hover:text-primary transition-colors flex-1">
                        {faq.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 md:px-6 pb-5 pt-1 font-cairo text-muted-foreground leading-loose">
                    <div className="pr-12">{faq.answer}</div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

        </div>
      </section>

      {/* Help / Contact — matches AboutPage mission block */}
      <section className="bg-secondary py-16 md:py-24 border-y border-border">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-block font-cairo text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-4">
              {t('faq.help.title')}
            </div>
            <h2 className="font-cairo font-bold text-3xl md:text-4xl text-secondary-foreground mb-4">
              {t('faq.help.title')}
            </h2>
            <p className="font-cairo text-muted-foreground text-lg leading-relaxed mb-8">
              {t('faq.help.description')}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="font-cairo font-bold h-14 px-8 rounded-xl">
                    <MessageCircle className="w-5 h-5 ml-2" />
                    {t('faq.help.whatsapp')}
                  </Button>
                </a>
              )}
              <Link to="/about">
                <Button size="lg" variant="outline" className="font-cairo font-bold h-14 px-8 rounded-xl border-border">
                  <Phone className="w-5 h-5 ml-2" />
                  {t('faq.help.callSupport')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 md:py-20 text-center animate-fade-in">
        <h2 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-4">
          {t('faq.cta.title')}
        </h2>
        <p className="font-cairo text-muted-foreground text-lg max-w-md mx-auto mb-8">
          {t('faq.cta.description')}
        </p>
        <Link to="/products">
          <Button size="lg" className="font-cairo font-bold h-14 px-10 rounded-xl group">
            {t('faq.cta.button')}
            <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
