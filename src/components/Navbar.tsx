import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, Home, Package, MapPin, User, LogIn, Info, Search, Shirt, Watch, Footprints, Smartphone, Home as HomeIcon, Grid3X3, ChevronDown, Heart, LayoutDashboard, Headphones, Keyboard, Mouse, Laptop, Cable, BatteryCharging, Gamepad2, Globe, type LucideIcon } from 'lucide-react';
import { useTranslation, type Language } from '@/i18n';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useStoreLogo } from '@/hooks/useStoreLogo';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SmartSearch from '@/components/SmartSearch';

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

// Fallback categories shown when no categories exist in the database yet
const DEFAULT_CATEGORIES = [
  { name: 'Phones',     icon: 'Smartphone' },
  { name: 'Cases',      icon: 'Smartphone' },
  { name: 'Chargers',   icon: 'BatteryCharging' },
  { name: 'Cables',     icon: 'Cable' },
  { name: 'Headphones', icon: 'Headphones' },
  { name: 'Keyboards',  icon: 'Keyboard' },
  { name: 'Mice',       icon: 'Mouse' },
  { name: 'Laptops',    icon: 'Laptop' },
  { name: 'Gaming',     icon: 'Gamepad2' },
  { name: 'Watches',    icon: 'Watch' },
];

const NAV_LINKS: { to: string; key: string; icon: typeof Home }[] = [
  { to: '/', key: 'nav.home', icon: Home },
  { to: '/products', key: 'nav.products', icon: Package },
  { to: '/track', key: 'nav.track', icon: MapPin },
  { to: '/about', key: 'nav.about', icon: Info },
];

export default function Navbar() {
  const { totalItems } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: logoUrl } = useStoreLogo();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const { data: categoriesData } = useCategories();
  const categories = useMemo(
    () => (categoriesData && categoriesData.length > 0 ? categoriesData : DEFAULT_CATEGORIES),
    [categoriesData],
  );
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

  // Brand name is fixed across all languages
  const displayName = 'akram-mobile';

  const LANGS: { code: Language; label: string; short: string }[] = [
    { code: 'ar', label: 'العربية', short: 'AR' },
    { code: 'fr', label: 'Français', short: 'FR' },
    { code: 'en', label: 'English', short: 'EN' },
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
    <header className="sticky top-0 z-50">
      {/* Main Nav */}
      <div className="bg-card/90 backdrop-blur-xl relative">
        <div className="container flex items-center justify-between h-[60px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            {logoUrl ? (
              <img src={logoUrl} alt={displayName} className="w-9 h-9 rounded-lg object-contain transition-transform group-hover:scale-105" />
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
                <span className="text-primary-foreground font-cairo font-bold text-sm">🌴</span>
              </div>
            )}
            <span className="font-cairo font-bold text-lg text-foreground">{displayName}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(link => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-cairo font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-cairo font-medium transition-all duration-200 ${
                    catOpen
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  التصنيفات
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
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
                      الكل
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
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex p-2.5 rounded-xl hover:bg-muted transition-colors"
              aria-label="بحث"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Language switcher */}
            <div
              className="relative"
              onMouseEnter={handleLangEnter}
              onMouseLeave={handleLangLeave}
            >
              <button
                onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl hover:bg-muted transition-colors text-xs font-cairo font-semibold text-muted-foreground"
                aria-label="Language"
              >
                <Globe className="w-4 h-4" />
                <span>{currentLang.short}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute top-full right-0 mt-1 w-36 bg-card border rounded-xl shadow-lg p-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-cairo transition-colors ${
                        language === l.code ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span>{l.label}</span>
                      <span className="text-[10px] opacity-70">{l.short}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!loading && (
              <Link
                to={user ? '/dashboard' : '/auth'}
                className="p-2.5 rounded-xl hover:bg-muted transition-colors"
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
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cairo font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                title="لوحة التحكم"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                لوحة التحكم
              </Link>
            )}

            <Link
              to="/wishlist"
              className="relative p-2.5 rounded-xl hover:bg-muted transition-colors"
              aria-label="المفضلة"
            >
              <Heart className={`w-5 h-5 ${wishlistCount > 0 ? 'text-destructive fill-destructive' : 'text-muted-foreground'}`} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-destructive text-white text-[10px] font-roboto rounded-full flex items-center justify-center font-bold shadow-sm">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              className="relative p-2.5 rounded-xl hover:bg-muted transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-primary text-primary-foreground text-[11px] font-roboto rounded-full flex items-center justify-center font-bold shadow-sm animate-in zoom-in-50 duration-200">
                  {totalItems}
                </span>
              )}
            </Link>
            <Button variant="ghost" size="icon" className="md:hidden rounded-xl" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        {/* Wavy divider at bottom of navbar */}
        <svg
          className="absolute left-0 right-0 -bottom-px w-full h-[18px] text-card/90 pointer-events-none"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,0 L1440,0 L1440,30 C1200,60 960,10 720,30 C480,50 240,10 0,30 Z"
          />
        </svg>
      </div>




      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-b bg-card/95 backdrop-blur-xl animate-fade-in">
          <div className="container py-3 space-y-3">
            {categories && categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-2 border-b border-border/50">
                <Link
                  to="/products"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-cairo font-semibold whitespace-nowrap shrink-0 bg-primary/10 text-primary"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  الكل
                </Link>
                {categories.map(cat => {
                  const Icon = getCategoryIcon(cat.icon);
                  return (
                    <Link
                      key={cat.name}
                      to={`/products?category=${encodeURIComponent(cat.name)}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-cairo font-semibold whitespace-nowrap shrink-0 bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.name}
                    </Link>
                  );
                })}
              </div>
            )}

            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map(link => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-cairo font-medium text-sm transition-colors ${
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
              <Link
                to="/wishlist"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-cairo font-medium text-sm text-muted-foreground hover:bg-muted"
              >
                <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-destructive fill-destructive' : ''}`} />
                المفضلة {wishlistCount > 0 && `(${wishlistCount})`}
              </Link>
              <Link
                to={user ? '/dashboard' : '/auth'}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-cairo font-medium text-sm text-muted-foreground hover:bg-muted"
              >
                <User className="w-4 h-4" />
                {user ? 'حسابي' : 'تسجيل الدخول'}
              </Link>
              {user && isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-cairo font-semibold text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  لوحة التحكم
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
      {/* Smart Search Modal */}
      {searchOpen && <SmartSearch onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
