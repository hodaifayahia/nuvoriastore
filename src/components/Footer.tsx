import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreLogo } from '@/hooks/useStoreLogo';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Send, Heart } from 'lucide-react';
import { useTranslation } from '@/i18n';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h3 className="font-cairo font-bold text-base text-foreground">{children}</h3>
      <span className="h-[3px] w-10 rounded-full bg-primary" />
    </div>
  );
}

export default function Footer() {
  const { data: logoUrl } = useStoreLogo();
  const { t } = useTranslation();

  const { data: settings } = useQuery({
    queryKey: ['footer-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*').in('key', [
        'store_name', 'footer_description', 'footer_phone', 'footer_email', 'footer_address',
        'facebook_url', 'instagram_url', 'telegram_url', 'tiktok_url', 'copyright_text',
      ]);
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  const storeName = 'Akram-Mobile';
  const description = settings?.footer_description || '';
  const phone = settings?.footer_phone;
  const email = settings?.footer_email;
  const address = settings?.footer_address || 'Algeria';
  const facebookUrl = settings?.facebook_url;
  const instagramUrl = settings?.instagram_url;
  const telegramUrl = settings?.telegram_url;

  const shopLinks = [
    { to: '/', key: 'nav.home' },
    { to: '/products', key: 'nav.products' },
    { to: '/cart', key: 'nav.cart' },
    { to: '/wishlist', key: 'nav.wishlist' },
  ];

  const helpLinks = [
    { to: '/about', key: 'nav.about' },
    { to: '/track', key: 'nav.track' },
    { to: '/auth', key: 'nav.account' },
  ];

  const IconChip = ({ children }: { children: React.ReactNode }) => (
    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
      {children}
    </div>
  );

  return (
    <footer className="bg-card text-foreground border-t border-border mt-auto">
      <div className="container py-10 md:py-14">
        {/* Brand block */}
        <div className="flex items-start justify-between gap-4 pb-8 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="font-cairo font-bold text-2xl text-primary">{storeName}</h2>
            <p className="font-cairo text-sm text-muted-foreground mt-2 leading-relaxed max-w-md">{description}</p>
            <div className="flex items-center gap-2 mt-4">
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                  className="w-9 h-9 rounded-xl border border-border bg-background flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                  className="w-9 h-9 rounded-xl border border-border bg-background flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {telegramUrl && (
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Telegram"
                  className="w-9 h-9 rounded-xl border border-border bg-background flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                  <Send className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
          {logoUrl && (
            <div className="w-14 h-14 rounded-full bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
              <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 py-8 border-b border-border">
          <div>
            <SectionHeading>{t('footer.quickLinks')}</SectionHeading>
            <nav className="flex flex-col gap-3">
              {shopLinks.map(l => (
                <Link key={l.to} to={l.to} className="font-cairo text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t(l.key)}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <SectionHeading>{t('footer.help') || 'مساعدة وحساب'}</SectionHeading>
            <nav className="flex flex-col gap-3">
              {helpLinks.map(l => (
                <Link key={l.to} to={l.to} className="font-cairo text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t(l.key)}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <SectionHeading>{t('footer.contactUs')}</SectionHeading>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <IconChip><MapPin className="w-4 h-4" /></IconChip>
                <span className="font-cairo text-sm text-muted-foreground">{address}</span>
              </div>
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-3 group">
                  <IconChip><Phone className="w-4 h-4" /></IconChip>
                  <span className="font-roboto text-sm text-muted-foreground group-hover:text-primary transition-colors" dir="ltr">{phone}</span>
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-3 group">
                  <IconChip><Mail className="w-4 h-4" /></IconChip>
                  <span className="font-roboto text-sm text-muted-foreground group-hover:text-primary transition-colors" dir="ltr">{email}</span>
                </a>
              )}
              <div className="flex items-center gap-3">
                <IconChip><Clock className="w-4 h-4" /></IconChip>
                <span className="font-cairo text-sm text-muted-foreground">{t('footer.always') || 'الطلب متاح على مدار الساعة'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Follow card */}
        {(telegramUrl || facebookUrl || instagramUrl) && (
          <div className="my-8 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/[0.03] p-5 text-center">
            <p className="font-cairo font-bold text-primary mb-1">{t('footer.follow.title') || 'لمتابعة الجديد والعروض'}</p>
            <p className="font-cairo text-sm text-muted-foreground">{t('footer.follow.desc') || 'تابعنا على منصاتنا لتصلك آخر العروض والمنتجات.'}</p>
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
          <p className="font-cairo text-xs text-muted-foreground">
            {settings?.copyright_text || `© ${new Date().getFullYear()} ${storeName} — ${t('footer.rightsReserved')}`}
          </p>
          <p className="font-cairo text-[11px] text-muted-foreground flex items-center gap-1">
            {t('footer.madeWith')} <Heart className="w-3 h-3 text-destructive fill-destructive" /> {t('footer.inAlgeria')}
          </p>
        </div>
      </div>
    </footer>
  );
}
