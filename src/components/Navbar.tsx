import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, Home, Package, MapPin, User, LogIn, Info, Search, Shirt, Watch, Footprints, Smartphone, Home as HomeIcon, Grid3X3, ChevronDown, LayoutDashboard, Headphones, Keyboard, Mouse, Laptop, Cable, BatteryCharging, Gamepad2, Globe, Sun, Moon, HelpCircle, Facebook, Instagram, MessageCircle, type LucideIcon } from 'lucide-react';
import { useTranslation, type Language } from '@/i18n';
import { useCart } from '@/contexts/CartContext';
import { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useStoreLogo, NUVORIA_LOGO_URL } from '@/hooks/useStoreLogo';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SmartSearch from '@/components/SmartSearch';
import { useTheme } from '@/hooks/useTheme';
import CategoriesSidebar from '@/components/CategoriesSidebar';

const ICON_MAP: Record<string, LucideIcon> = {
  Shirt,
  Watch,
  Footprints,
  Smartphone,
  Headphones,
  Keyboard,
  Mouse,
  Laptop,
  Cable,
  BatteryCharging,
  Gamepad2,
  Home: HomeIcon,
};

function getCategoryIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Grid3X3;
}


const NAV_LINKS: { to: string; key: string; icon: typeof Home }[] = [
  { to: '/', key: 'nav.home', icon: Home },
  { to: '/products', key: 'nav.products', icon: Package },
  { to: '/track', key: 'nav.track', icon: MapPin },
  { to: '/about', key: 'nav.about', icon: Info },
  { to: '/faq', key: 'nav.faq', icon: HelpCircle },
];

export default function Navbar() {
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: logoUrl } = useStoreLogo();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const { data: categoriesData = [] } = useCategories();
  const { theme, toggle: toggleTheme } = useTheme();
  const categories = categoriesData;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: isAdmin } = useQuery({
    queryKey: ['navbar-is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      return !!data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });



  // Brand name — always the same across languages
  const displayName = 'Nuvoria Store';

  const LANGS: { code: Language; label: string; short: string }[] = [
    { code: 'ar', label: 'العربية', short: 'AR' },
    { code: 'fr', label: 'Français', short: 'FR' },
  ];
  const currentLang = LANGS.find(l => l.code === language) ?? LANGS[0];

  const handleLangEnter = useCallback(() => {
    if (langTimeoutRef.current) clearTimeout(langTimeoutRef.current);
    setLangOpen(true);
  }, []);
  const handleLangLeave = useCallback(() => {
    langTimeoutRef.current = setTimeout(() => setLangOpen(false), 150);
  }, []);

  const handleCatEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCatOpen(true);
  }, []);

  const handleCatLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setCatOpen(false), 150);
  }, []);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3">
      {/* Floating glass nav */}
      <div className="relative mx-auto max-w-6xl rounded-2xl border border-border/60 bg-background/75 backdrop-blur-xl shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-black/[0.02]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-70"
          style={{
            background:
              'radial-gradient(70% 120% at 100% 0%, hsl(var(--primary) / 0.10), transparent 60%)',
          }}
        />
        <div className="relative container flex items-center justify-between h-[60px] gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0 min-w-0">
            <span className="h-9 w-9 rounded-full bg-white border border-border overflow-hidden flex items-center justify-center shadow-sm ring-2 ring-primary/10 transition-transform group-hover:scale-105 shrink-0">
              <img src={logoUrl || NUVORIA_LOGO_URL} alt={displayName} className="h-full w-full object-cover" />
            </span>
            <span className="font-serif font-bold text-base lg:text-lg tracking-tight text-primary italic truncate">{displayName}</span>
          </Link>


          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(link => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1.5 rounded-lg text-[11px] lg:text-[12px] font-cairo font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <link.icon className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                  {t(link.key)}
                </Link>
              );
            })}

            {/* Categories dropdown trigger */}
            {categories && categories.length > 0 && (
              <div
                className="relative"
                onMouseEnter={handleCatEnter}
                onMouseLeave={handleCatLeave}
              >
                <button
                  className={`flex items-center gap-1 px-2 lg:px-2.5 py-1.5 rounded-lg text-[11px] lg:text-[12px] font-cairo font-medium whitespace-nowrap transition-all duration-200 ${
                    catOpen
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Grid3X3 className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                  {t('nav.categories')}
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {catOpen && (
                  <div className="absolute top-full right-0 mt-1 w-72 bg-card border rounded-xl shadow-lg p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link
                      to="/products"
                      onClick={() => setCatOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-cairo font-semibold transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Grid3X3 className="w-4 h-4" />
                      {t('nav.all')}
                    </Link>
                    <div className="grid grid-cols-2 gap-0.5">
                      {categories.map(cat => {
                        const Icon = getCategoryIcon(cat.icon);
                        const isActive = location.search.includes(`category=${encodeURIComponent(cat.name)}`);
                        return (
                          <Link
                            key={cat.name}
                            to={`/products?category=${encodeURIComponent(cat.name)}`}
                            onClick={() => setCatOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-cairo font-medium transition-colors ${
                              isActive
                                ? 'text-primary bg-primary/10'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {cat.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Language switcher */}
            <div
              className="relative hidden md:block"
              onMouseEnter={handleLangEnter}
              onMouseLeave={handleLangLeave}
            >
              <button
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-cairo font-semibold whitespace-nowrap transition-all duration-200 ${
                  langOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                aria-label={t('nav.language')}
              >
                <Globe className="w-3.5 h-3.5" />
                {currentLang.short}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute top-full right-0 mt-1 min-w-[140px] bg-card border rounded-xl shadow-lg p-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {LANGS.map((l) => {
                    const active = language === l.code;
                    return (
                      <button
                        key={l.code}
                        onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-cairo font-semibold transition-colors ${
                          active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{l.label}</span>
                        <span className="text-[10px] text-muted-foreground">{l.short}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label={t('nav.search')}
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>


            {!loading && (
              <Link
                to={user ? '/dashboard' : '/auth'}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {user ? (
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                ) : (
                  <LogIn className="w-5 h-5 text-muted-foreground" />
                )}
              </Link>
            )}

            {/* Admin Dashboard button - visible only for admin users */}
            {!loading && user && isAdmin && (
              <Link
                to="/admin"
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-cairo font-semibold whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                title={t('nav.adminPanel')}
              >
                <LayoutDashboard className="w-3 h-3" />
                <span className="hidden xl:inline">{t('nav.adminPanel')}</span>
              </Link>
            )}


            <Link
              to="/cart"
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-primary text-primary-foreground text-[11px] font-roboto rounded-full flex items-center justify-center font-bold shadow-sm animate-in zoom-in-50 duration-200">
                  {totalItems}
                </span>
              )}
            </Link>
            <CategoriesSidebar
              trigger={
                <Button variant="ghost" size="icon" className="md:hidden rounded-xl" aria-label="Menu">
                  <Menu className="w-5 h-5" />
                </Button>
              }
            />
          </div>
        </div>
      </div>




      {/* Smart Search Modal */}
      {searchOpen && <SmartSearch onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
