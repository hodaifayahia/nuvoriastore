import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreLogo } from '@/hooks/useStoreLogo';
import { Facebook, Instagram, Send, Twitter } from 'lucide-react';
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
        'copyright_text',
      ]);
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  const storeName = 'NuvoriaStore';
  const description =
    settings?.footer_description ||
    'متجر متخصص في الأجهزة الكهرومنزلية والإلكترونيات بأفضل الأسعار في الجزائر.';

  const socials = [
    { url: settings?.instagram_url, Icon: Instagram, label: 'Instagram' },
    { url: settings?.facebook_url, Icon: Facebook, label: 'Facebook' },
    { url: settings?.twitter_url, Icon: Twitter, label: 'Twitter' },
    { url: settings?.telegram_url, Icon: Send, label: 'Telegram' },
  ].filter(s => s.url);

  const columns: { title: string; links: { to: string; label: string }[] }[] = [
    {
      title: 'المتجر',
      links: [
        { to: '/', label: 'الرئيسية' },
        { to: '/products', label: 'المنتجات' },
        { to: '/cart', label: 'السلة' },
        { to: '/wishlist', label: 'المفضلة' },
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

        {/* Divider + bottom row */}
        <div className="mt-14 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {settings?.copyright_text ||
              `© ${new Date().getFullYear()} ${storeName}. ${t('footer.rightsReserved') || 'جميع الحقوق محفوظة.'}`}
          </p>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              الشروط والأحكام
            </Link>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              سياسة الخصوصية
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
