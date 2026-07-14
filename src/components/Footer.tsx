import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreLogo } from '@/hooks/useStoreLogo';
import { Facebook, Instagram, Send, Twitter, MessageCircle, Phone } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function Footer() {
  const { data: logoUrl } = useStoreLogo();
  const { t } = useTranslation();

  const { data: settings } = useQuery({
    queryKey: ['footer-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*').in('key', [
        'store_name', 'footer_description',
        'facebook_url', 'instagram_url', 'telegram_url', 'twitter_url',
        'tiktok_url', 'whatsapp_number',
        'copyright_text',
      ]);
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  const storeName = 'NuvoriaStore';
  const isAr = t('nav.home') === 'الرئيسية';
  const description =
    settings?.footer_description ||
    (isAr
      ? 'متجر متخصص في الأجهزة الكهرومنزلية والإلكترونيات بأفضل الأسعار في الجزائر.'
      : 'Boutique spécialisée en électroménager et électronique aux meilleurs prix en Algérie.');

  const TikTokIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V9.11a8.16 8.16 0 0 0 4.77 1.52V7.19a4.85 4.85 0 0 1-1.84-.5z"/>
    </svg>
  );

  const whatsappHref = settings?.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`
    : '';

  const socials = [
    { url: settings?.instagram_url, Icon: Instagram, label: 'Instagram' },
    { url: settings?.facebook_url, Icon: Facebook, label: 'Facebook' },
    { url: settings?.tiktok_url, Icon: TikTokIcon, label: 'TikTok' },
    { url: whatsappHref, Icon: MessageCircle, label: 'WhatsApp' },
    { url: settings?.twitter_url, Icon: Twitter, label: 'Twitter' },
    { url: settings?.telegram_url, Icon: Send, label: 'Telegram' },
  ].filter(s => s.url);

  const columns: { title: string; links: { to: string; label: string }[] }[] = isAr
    ? [
        {
          title: 'المتجر',
          links: [
            { to: '/', label: 'الرئيسية' },
            { to: '/products', label: 'المنتجات' },
            { to: '/cart', label: 'السلة' },
          ],
        },
        {
          title: 'الشركة',
          links: [
            { to: '/about', label: 'من نحن' },
            { to: '/track', label: 'تتبع الطلب' },
            { to: '/contact', label: 'اتصل بنا' },
            { to: '/faq', label: 'الأسئلة الشائعة' },
          ],
        },
        {
          title: 'موارد',
          links: [
            { to: '/auth', label: 'حسابي' },
            { to: '/returns', label: 'الإرجاع والاستبدال' },
            { to: '/warranty', label: 'الضمان' },
            { to: '/privacy', label: 'الخصوصية' },
          ],
        },
      ]
    : [
        {
          title: 'Boutique',
          links: [
            { to: '/', label: 'Accueil' },
            { to: '/products', label: 'Produits' },
            { to: '/cart', label: 'Panier' },
          ],
        },
        {
          title: 'Entreprise',
          links: [
            { to: '/about', label: 'À propos' },
            { to: '/track', label: 'Suivi de commande' },
            { to: '/contact', label: 'Contact' },
            { to: '/faq', label: 'FAQ' },
          ],
        },
        {
          title: 'Ressources',
          links: [
            { to: '/auth', label: 'Mon compte' },
            { to: '/returns', label: 'Retours et échanges' },
            { to: '/warranty', label: 'Garantie' },
            { to: '/privacy', label: 'Confidentialité' },
          ],
        },
      ];


  return (
    <footer className="bg-background text-foreground border-t border-border/50 mt-auto">
      <div className="container py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand block */}
          <div className="md:col-span-5 lg:col-span-6">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="w-9 h-9 rounded-lg object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/60" />
              )}
              <h2 className="font-display font-bold text-xl tracking-tight">{storeName}</h2>
            </div>

            <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-sm">
              {description}
            </p>

            {socials.length > 0 && (
              <div className="mt-6 flex items-center gap-4">
                {socials.map(({ url, Icon, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="text-muted-foreground/80 hover:text-foreground transition-colors"
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns */}
          {columns.map(col => (
            <div key={col.title} className="md:col-span-2">
              <h3 className="font-display font-semibold text-sm text-foreground mb-5">
                {col.title}
              </h3>
              <ul className="space-y-4">
                {col.links.map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Phone Contact Block */}
        {settings?.whatsapp_number && (
          <div className="mt-12 pt-6 border-t border-border/50 flex items-center gap-4">
            <a
              href={`tel:${settings.whatsapp_number.replace(/\D/g, '')}`}
              className="w-14 h-14 rounded-full bg-card border flex items-center justify-center text-foreground hover:bg-muted transition-all duration-300 shadow-sm hover:scale-105 active:scale-95"
            >
              <Phone className="w-5 h-5" />
            </a>
            <div>
              <a
                href={`tel:${settings.whatsapp_number.replace(/\D/g, '')}`}
                className="block font-cairo font-extrabold text-lg text-foreground hover:underline"
              >
                {settings.whatsapp_number}
              </a>
              <span className="block text-xs text-muted-foreground font-cairo">
                {isAr ? 'أوقات العمل : 8:00 - 22:00' : 'Horaires : 8h00 - 22h00'}
              </span>
            </div>
          </div>
        )}

        {/* Divider + bottom row */}
        <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {settings?.copyright_text ||
              `© ${new Date().getFullYear()} ${storeName}. ${t('footer.rightsReserved') || 'Tous droits réservés.'}`}
          </p>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {isAr ? 'الشروط العامة' : 'Conditions générales'}
            </Link>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {isAr ? 'سياسة الخصوصية' : 'Politique de confidentialité'}
            </Link>
          </div>

        </div>
      </div>
    </footer>
  );
}
