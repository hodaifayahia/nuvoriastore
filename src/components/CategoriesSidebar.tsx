import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Grid3X3, Home, Package, MapPin, Info, HelpCircle, User, LogIn, LayoutDashboard, Shirt, Watch, Footprints, Smartphone, Headphones, Keyboard, Mouse, Laptop, Cable, BatteryCharging, Gamepad2, Home as HomeIcon, Globe, type LucideIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCategories } from '@/hooks/useCategories';
import { useTranslation, type Language } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreLogo } from '@/hooks/useStoreLogo';
import { useState, type ReactNode } from 'react';

const ICON_MAP: Record<string, LucideIcon> = {
  Shirt, Watch, Footprints, Smartphone, Headphones, Keyboard, Mouse,
  Laptop, Cable, BatteryCharging, Gamepad2, Home: HomeIcon,
};

const getCatIcon = (name: string): LucideIcon => ICON_MAP[name] || Grid3X3;

interface Props {
  trigger: ReactNode;
}

export default function CategoriesSidebar({ trigger }: Props) {
  const { data: categories = [] } = useCategories();
  const { t, language, setLanguage } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const { data: logoUrl } = useStoreLogo();
  const { data: storeName } = useQuery({
    queryKey: ['store-name'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'store_name').maybeSingle();
      return data?.value || 'NuvoriaStore';
    },
    staleTime: 10 * 60 * 1000,
  });
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isRTL = language === 'ar';
  // In RTL, menu opens from the right; in LTR, from the left.
  const side: 'left' | 'right' = isRTL ? 'right' : 'left';

  const { data: isAdmin } = useQuery({
    queryKey: ['sidebar-is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      return !!data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const navLinks = [
    { to: '/', key: 'nav.home', icon: Home },
    { to: '/products', key: 'nav.products', icon: Package },
    { to: '/track', key: 'nav.track', icon: MapPin },
    { to: '/about', key: 'nav.about', icon: Info },
    { to: '/faq', key: 'nav.faq', icon: HelpCircle },
  ];

  const close = () => setOpen(false);
  const toggle = (name: string) => setExpanded((s) => ({ ...s, [name]: !s[name] }));

  const LANGS: { code: Language; label: string }[] = [
    { code: 'ar', label: 'العربية' },
    { code: 'fr', label: 'Français' },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side={side}
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-[86vw] sm:w-[400px] p-0 bg-background overflow-hidden flex flex-col border-0 shadow-2xl"
      >
        {/* Header — Brand logo + name */}
        <SheetHeader className="relative px-6 pt-6 pb-5 border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <div className="absolute inset-0 opacity-40 pointer-events-none"
               style={{ background: 'radial-gradient(60% 100% at 100% 0%, hsl(var(--primary) / 0.15), transparent 60%)' }} />
          <SheetTitle asChild>
            <Link to="/" onClick={close} className="relative flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl overflow-hidden bg-background/80 border border-primary/20 shadow-md flex items-center justify-center shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={storeName || 'Logo'} className="w-full h-full object-contain" />
                ) : (
                  <Grid3X3 className="w-6 h-6 text-primary" />
                )}
              </span>
              <span className="flex flex-col items-start min-w-0">
                <span className="font-display font-extrabold text-lg tracking-tight text-foreground truncate max-w-[200px]">
                  {storeName || 'NuvoriaStore'}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-semibold">
                  {t('nav.menu')}
                </span>
              </span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Language switcher */}
          <div className="px-5 pt-5 pb-3">
            <p className="pb-2.5 text-[10px] font-cairo font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              {t('nav.language')}
            </p>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-muted/50">
              {LANGS.map((l) => {
                const active = language === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    className={`px-3 py-2 rounded-xl text-sm font-cairo font-semibold transition-all ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : 'text-foreground hover:bg-background'
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nav links */}
          <div className="px-3 pt-3 pb-2 border-t border-border/60">
            <p className="px-3 pb-2 text-[10px] font-cairo font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
              {t('nav.menu')}
            </p>
            <nav className="flex flex-col gap-0.5">
              {navLinks.map((link) => {
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={close}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-cairo font-semibold text-sm transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <link.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{t(link.key)}</span>
                  </Link>
                );
              })}

              <Link
                to={user ? '/dashboard' : '/auth'}
                onClick={close}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-cairo font-semibold text-sm text-foreground hover:bg-muted transition-colors"
              >
                {user ? <User className="w-4 h-4 shrink-0" /> : <LogIn className="w-4 h-4 shrink-0" />}
                <span className="flex-1">{user ? t('nav.account') : t('nav.signIn')}</span>
              </Link>

              {user && isAdmin && (
                <Link
                  to="/admin"
                  onClick={close}
                  className="mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl font-cairo font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{t('nav.adminPanel')}</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Categories */}
          <div className="px-3 pt-3 pb-6 border-t border-border/60">
            <p className="px-3 pb-2 text-[10px] font-cairo font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
              {t('nav.categories')}
            </p>

            <Link
              to="/products"
              onClick={close}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Grid3X3 className="w-5 h-5 text-primary" />
              </div>
              <span className="flex-1 font-cairo font-semibold text-sm">{t('nav.all')}</span>
            </Link>

            <div className="flex flex-col">
              {categories.map((cat) => {
                const Icon = getCatIcon(cat.icon);
                const hasSubs = (cat.subcategories?.length ?? 0) > 0;
                const isOpen = !!expanded[cat.name];
                return (
                  <div key={cat.name}>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group">
                      <Link
                        to={`/products?category=${encodeURIComponent(cat.name)}`}
                        onClick={close}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
                          {cat.image ? (
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <Icon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="flex-1 font-cairo font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {cat.name}
                        </span>
                      </Link>
                      {hasSubs && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(cat.name);
                          }}
                          className="p-1.5 rounded-md hover:bg-background transition-colors shrink-0"
                          aria-label="toggle subcategories"
                        >
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                      )}
                    </div>

                    {hasSubs && isOpen && (
                      <div className="ms-14 me-3 mb-1 border-s-2 border-primary/20 ps-3 flex flex-col gap-0.5">
                        {cat.subcategories!.map((sub) => (
                          <Link
                            key={sub.name}
                            to={`/products?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                            onClick={close}
                            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors"
                          >
                            <div className="w-8 h-8 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
                              {sub.image ? (
                                <img src={sub.image} alt={sub.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <Grid3X3 className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="flex-1 font-cairo text-sm text-foreground truncate">{sub.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {categories.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t('categoriesPage.empty.title')}
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
