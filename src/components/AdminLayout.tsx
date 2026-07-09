import { useEffect, useState, useCallback, useRef, ReactNode, FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDashboard, Package, MapPin, ShoppingCart, Tag, Settings, LogOut, Menu, X, Layers, Users, UserCheck, Bell, AlertTriangle, Clock, Palette, Search, ExternalLink, User, ChevronDown, PackageX, RotateCcw, DollarSign, Globe, Store, CreditCard, Bot, FormInput, Paintbrush, Shield, Rocket, Truck, ChevronRight, BarChart3, Award, Sun, Moon, Sparkles } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useStoreLogo } from '@/hooks/useStoreLogo';
import { toast } from 'sonner';
import { useTranslation, Language } from '@/i18n';

interface Notification {
  id: string;
  type: 'order' | 'low_stock';
  title: string;
  description: string;
  timestamp: Date;
  link: string;
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

const NAV_KEYS = [
  { href: '/admin', key: 'sidebar.dashboard', icon: LayoutDashboard },
  { href: '/admin/products', key: 'sidebar.products', icon: Package },
  { href: '/admin/inventory', key: 'sidebar.inventory', icon: Layers },
  { href: '/admin/variations', key: 'sidebar.variations', icon: Palette },
  { href: '/admin/categories', key: 'sidebar.categories', icon: Layers },
  { href: '/admin/orders', key: 'sidebar.orders', icon: ShoppingCart },
  { href: '/admin/returns', key: 'sidebar.returns', icon: RotateCcw },
  { href: '/admin/costs', key: 'sidebar.costs', icon: DollarSign },
  { href: '/admin/statistics', key: 'sidebar.statistics', icon: BarChart3 },
  { href: '/admin/leads', key: 'sidebar.leads', icon: Users },
  { href: '/admin/confirmers', key: 'sidebar.confirmers', icon: UserCheck },
  { href: '/admin/abandoned', key: 'sidebar.abandoned', icon: PackageX },
  { href: '/admin/wilayas', key: 'sidebar.wilayas', icon: MapPin },
  { href: '/admin/coupons', key: 'sidebar.coupons', icon: Tag },
  { href: '/admin/suppliers', key: 'sidebar.suppliers', icon: Truck },
  { href: '/admin/clients', key: 'sidebar.clients', icon: Users },
  { href: '/admin/delivery', key: 'delivery.title', icon: Truck },
];

// Grouped sidebar navigation for world-class UX
const NAV_GROUPS = [
  {
    groupKey: null, // No group header for dashboard
    items: [
      { href: '/admin', key: 'sidebar.dashboard', icon: LayoutDashboard },
    ],
  },
  {
    groupKey: 'sidebar.catalog',
    items: [
      { href: '/admin/products', key: 'sidebar.products', icon: Package },
      { href: '/admin/inventory', key: 'sidebar.inventory', icon: Layers },
      { href: '/admin/variations', key: 'sidebar.variations', icon: Palette },
      { href: '/admin/categories', key: 'sidebar.categories', icon: Layers },
      { href: '/admin/brands', key: 'sidebar.brands', icon: Award },
    ],
  },
  {
    groupKey: 'sidebar.sales',
    items: [
      { href: '/admin/orders', key: 'sidebar.orders', icon: ShoppingCart },
      { href: '/admin/returns', key: 'sidebar.returns', icon: RotateCcw },
      { href: '/admin/costs', key: 'sidebar.costs', icon: DollarSign },
      { href: '/admin/statistics', key: 'sidebar.statistics', icon: BarChart3 },
      { href: '/admin/abandoned', key: 'sidebar.abandoned', icon: PackageX },
    ],
  },
  {
    groupKey: 'sidebar.management',
    items: [
      { href: '/admin/wilayas', key: 'sidebar.wilayas', icon: MapPin },
      { href: '/admin/delivery', key: 'delivery.title', icon: Truck },
    ],
  },
  // {
  //   groupKey: 'sidebar.marketing',
  //   items: [
  //     { href: '/admin/landing-generator', key: 'sidebar.landingGenerator', icon: Sparkles },
  //   ],
  // },
];

const SETTINGS_SUB_KEYS = [
  { href: '/admin/settings/identity', key: 'settings.storeIdentity', icon: Store },
  { href: '/admin/settings/payment', key: 'settings.paymentDelivery', icon: CreditCard },
  { href: '/admin/settings/delivery', key: 'delivery.title', icon: Truck },
  { href: '/admin/settings/telegram', key: 'settings.telegram', icon: Bot },
  { href: '/admin/settings/returns', key: 'settings.returnsTab', icon: RotateCcw },
  { href: '/admin/settings/form', key: 'sidebar.form', icon: FormInput },
  
  { href: '/admin/settings/security', key: 'settings.security', icon: Shield },
  { href: '/admin/settings/pixels', key: 'pixels.title', icon: Globe },
];

const LANG_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'ar', label: 'العربية', flag: '🇩🇿' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { t, language, setLanguage, dir } = useTranslation();
  const isRtl = dir === 'rtl';
  const { theme: adminTheme, toggle: toggleAdminTheme } = useAdminTheme();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [headerSearch, setHeaderSearch] = useState('');
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { data: logoUrl } = useStoreLogo();
  const sidebarNavRef = useRef<HTMLElement>(null);

  // Keep sidebar scroll position; only reset main window on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  function timeAgo(date: Date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return t('sidebar.now');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('sidebar.minutesAgo').replace('{n}', String(minutes));
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('sidebar.hoursAgo').replace('{n}', String(hours));
    return t('sidebar.daysAgo').replace('{n}', String(Math.floor(hours / 24)));
  }

  // Fetch low stock products on mount
  useEffect(() => {
    const fetchLowStock = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, stock')
        .eq('is_active', true)
        .lte('stock', 5);
      if (data) {
        const lowStockNotifs: Notification[] = data.map(p => ({
          id: `low_stock_${p.id}`,
          type: 'low_stock',
          title: `${t('sidebar.lowStock')}: ${p.name}`,
          description: t('sidebar.piecesLeft').replace('{n}', String(p.stock ?? 0)),
          timestamp: new Date(),
          link: '/admin/products',
        }));
        setNotifications(prev => {
          return [...prev.filter(n => n.type === 'order'), ...lowStockNotifs];
        });
      }
    };
    fetchLowStock();
  }, [t]);

  // Fetch pending orders count
  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'جديد');
      setPendingOrdersCount(count ?? 0);
    };
    fetchPending();
  }, []);

  // Realtime new order notifications + update pending count
  useEffect(() => {
    const channel = supabase
      .channel('new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as any;
          const notif: Notification = {
            id: `order_${order.id}`,
            type: 'order',
            title: `${t('sidebar.newOrder')} #${order.order_number}`,
            description: order.customer_name,
            timestamp: new Date(),
            link: '/admin/orders',
          };
          setNotifications(prev => [notif, ...prev]);
          setPendingOrdersCount(prev => prev + 1);
          playNotificationSound();
          toast(`${t('sidebar.newOrder')} #${order.order_number}`, {
            description: order.customer_name,
            action: {
              label: t('sidebar.show'),
              onClick: () => navigate('/admin/orders'),
            },
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'جديد')
            .then(({ count }) => setPendingOrdersCount(count ?? 0));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [navigate, t]);

  const handleHeaderSearch = (e: FormEvent) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/admin/orders?search=${encodeURIComponent(headerSearch.trim())}`);
      setHeaderSearch('');
    }
  };

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async (userId: string) => {
      const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (!data) {
        toast.error(t('sidebar.noAccess'));
        navigate('/');
        return;
      }
      setIsAdmin(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
        navigate('/nuvoria-store/login');
      } else {
        checkAdmin(session.user.id).finally(() => setLoading(false));
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
        navigate('/nuvoria-store/login');
      } else {
        checkAdmin(session.user.id).finally(() => setLoading(false));
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, t]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/nuvoria-store/login');
  };

  const clearNotifications = () => setNotifications([]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="w-32 h-8" /></div>;
  if (!user || !isAdmin) return null;

  const currentPageLabel = NAV_KEYS.find(i => i.href === location.pathname)?.key
    || SETTINGS_SUB_KEYS.find(i => i.href === location.pathname)?.key;
  const isSettingsActive = location.pathname.startsWith('/admin/settings');
  const currentLang = LANG_OPTIONS.find(l => l.value === language)!;

  // Primary bottom-nav items (mobile)
  const BOTTOM_NAV_ITEMS = [
    { href: '/admin', key: 'sidebar.dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', key: 'sidebar.orders', icon: ShoppingCart },
    { href: '/admin/products', key: 'sidebar.products', icon: Package },
    { href: '/admin/statistics', key: 'sidebar.statistics', icon: BarChart3 },
  ];

  return (
    <div className="admin-deep-horizon min-h-screen flex bg-background" dir={dir} data-theme={adminTheme}>
      {/* Sidebar — desktop persistent / mobile slide-over "More" panel */}
      <aside className={`fixed inset-y-0 z-50 w-72 flex flex-col transform transition-transform duration-300 ease-out
        bg-gradient-to-b from-sidebar to-card/95 backdrop-blur-xl
        shadow-[0_0_40px_-10px_hsl(217_100%_55%/0.25)]
        ${isRtl ? 'right-0 border-l border-border/60' : 'left-0 border-r border-border/60'}
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
          <Link to="/admin" className="flex items-center gap-2.5 group">
            <div className="relative">
              {logoUrl ? (
                <img src={logoUrl} alt="DZ Store" className="w-9 h-9 rounded-lg object-contain ring-1 ring-border/60 bg-card" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/30">
                  <span className="text-primary-foreground font-cairo font-bold text-xs">DZ</span>
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-card" style={{ backgroundColor: 'hsl(var(--success))' }} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-cairo font-bold text-base text-foreground">{t('sidebar.controlPanel')}</span>
              <span className="font-cairo text-[10px] uppercase tracking-wider text-muted-foreground">Admin Console</span>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav ref={sidebarNavRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-hide">
          {/* Sidebar Search */}
          <div className="relative mb-3 sticky top-0 z-10 bg-gradient-to-b from-sidebar to-sidebar/95 pb-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none ${isRtl ? 'right-3' : 'left-3'}`} />
            <Input
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
              placeholder={t('sidebar.searchSidebar')}
              className={`h-9 text-xs font-cairo bg-muted/40 border border-border/40 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg ${isRtl ? 'pr-9' : 'pl-9'}`}
            />
          </div>

          {/* Grouped Navigation */}
          {NAV_GROUPS.map((group, gi) => {
            const filteredItems = sidebarSearch
              ? group.items.filter(item => t(item.key).toLowerCase().includes(sidebarSearch.toLowerCase()))
              : group.items;

            if (filteredItems.length === 0) return null;

            const isCollapsed = !sidebarSearch && group.groupKey && collapsedGroups[group.groupKey];

            return (
              <div key={gi} className={gi > 0 ? 'pt-3' : ''}>
                {group.groupKey && !sidebarSearch && (
                  <button
                    onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.groupKey!]: !prev[group.groupKey!] }))}
                    className="w-full flex items-center justify-between px-2 py-1 mb-1 group/header hover:opacity-100 opacity-70 transition"
                  >
                    <span className="font-cairo text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                      {t(group.groupKey)}
                    </span>
                    <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                  </button>
                )}
                {!isCollapsed && filteredItems.map(item => {
                  const active = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`relative flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-lg font-cairo text-sm transition-all duration-200 group/link ${
                        active
                          ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`}
                    >
                      {/* Active accent bar */}
                      <span className={`absolute top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-primary transition-all ${
                        isRtl ? 'right-0' : 'left-0'
                      } ${active ? 'opacity-100' : 'opacity-0 group-hover/link:opacity-40'}`} />
                      <span className={`flex items-center justify-center w-7 h-7 rounded-md transition ${
                        active ? 'bg-primary/20 text-primary' : 'text-muted-foreground group-hover/link:text-foreground'
                      }`}>
                        <item.icon className="w-4 h-4 shrink-0" />
                      </span>
                      <span className="truncate flex-1">{t(item.key)}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* Settings link */}
          {(!sidebarSearch || t('sidebar.settings').toLowerCase().includes(sidebarSearch.toLowerCase())) && (
            <div className="pt-3">
              {!sidebarSearch && (
                <div className="px-2 py-1 mb-1">
                  <span className="font-cairo text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                    {t('sidebar.settings')}
                  </span>
                </div>
              )}
              <Link
                to="/admin/settings"
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg font-cairo text-sm transition-all duration-200 group/link ${
                  isSettingsActive
                    ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <span className={`absolute top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-primary transition-all ${
                  isRtl ? 'right-0' : 'left-0'
                } ${isSettingsActive ? 'opacity-100' : 'opacity-0 group-hover/link:opacity-40'}`} />
                <span className={`flex items-center justify-center w-7 h-7 rounded-md transition ${
                  isSettingsActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground group-hover/link:text-foreground'
                }`}>
                  <Settings className="w-4 h-4 shrink-0" />
                </span>
                <span className="truncate flex-1">{t('sidebar.settings')}</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Footer: user card + logout */}
        <div className="p-3 border-t border-border/60 bg-card/40 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-muted/30">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
              {(user?.email?.[0] || 'A').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-cairo text-xs font-semibold text-foreground truncate">{user?.email?.split('@')[0]}</p>
              <p className="font-cairo text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2 font-cairo text-destructive hover:text-destructive hover:bg-destructive/10 h-9">
            <LogOut className="w-4 h-4" />
            {t('sidebar.logout')}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 min-w-0 ${isRtl ? 'lg:mr-72' : 'lg:ml-72'}`}>
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/60 h-14 flex items-center px-3 sm:px-4 gap-1.5 sm:gap-2 overflow-x-auto">
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-cairo font-bold text-base sm:text-lg shrink-0 hidden lg:block truncate">
            {currentPageLabel ? t(currentPageLabel) : t('sidebar.controlPanel')}
          </h1>

          {/* Global Order Search */}
          <form onSubmit={handleHeaderSearch} className={`flex-1 max-w-xs hidden sm:flex items-center gap-1 ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
            <div className="relative w-full">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none ${isRtl ? 'right-2.5' : 'left-2.5'}`} />
              <Input
                value={headerSearch}
                onChange={e => setHeaderSearch(e.target.value)}
                placeholder={t('sidebar.searchOrder')}
                className={`h-9 font-cairo text-sm ${isRtl ? 'pr-8' : 'pl-8'}`}
              />
            </div>
          </form>




          {/* Language Switcher */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 text-xs h-8 px-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{currentLang.flag} {currentLang.value.toUpperCase()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1" sideOffset={8}>
              {LANG_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLanguage(opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    language === opt.value ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted'
                  }`}
                >
                  <span>{opt.flag}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Pending Orders Badge */}
          {pendingOrdersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 font-cairo text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => navigate('/admin/orders?status=جديد')}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{pendingOrdersCount} {t('sidebar.newOrders')}</span>
            </Button>
          )}

          {/* Notification Bell Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative shrink-0">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 max-h-[420px] overflow-hidden" sideOffset={8}>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h3 className="font-cairo font-bold text-sm">{t('sidebar.notifications')}</h3>
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearNotifications} className="font-cairo text-xs h-7 text-muted-foreground hover:text-foreground">
                    {t('sidebar.clearAll')}
                  </Button>
                )}
              </div>
              <div className="overflow-y-auto max-h-[340px]">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="font-cairo text-sm text-muted-foreground">{t('sidebar.noNotifications')}</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <button
                      key={notif.id}
                      onClick={() => navigate(notif.link)}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 ${
                        notif.type === 'order' ? 'bg-primary/10' : 'bg-destructive/10'
                      }`}>
                        {notif.type === 'order' ? (
                          <ShoppingCart className="w-4 h-4 text-primary" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-cairo font-semibold text-sm text-foreground truncate">{notif.title}</p>
                        <p className="font-cairo text-xs text-muted-foreground truncate">{notif.description}</p>
                        <p className="font-cairo text-[11px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(notif.timestamp)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* User Profile Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 font-cairo text-xs h-8">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="hidden lg:inline max-w-[120px] truncate">{user?.email?.split('@')[0]}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground hidden lg:block" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2" sideOffset={8}>
              <div className="px-2 py-1.5 mb-1 border-b">
                <p className="font-cairo text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => window.open('/', '_blank')}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted transition-colors font-cairo text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                {t('sidebar.viewStore')}
              </button>
              <button
                onClick={() => navigate('/admin/settings')}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted transition-colors font-cairo text-sm"
              >
                <Settings className="w-4 h-4" />
                {t('sidebar.settings')}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted transition-colors font-cairo text-sm text-destructive"
              >
                <LogOut className="w-4 h-4" />
                {t('sidebar.logout')}
              </button>
            </PopoverContent>
          </Popover>
        </header>
        <main className="p-3 sm:p-4 md:p-6 overflow-x-hidden min-w-0 pb-24 lg:pb-6">{children}</main>
      </div>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in" onClick={() => setSidebarOpen(false)} />}

      {/* Mobile bottom navigation bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/60 shadow-[0_-8px_24px_-12px_hsl(217_100%_55%/0.25)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {BOTTOM_NAV_ITEMS.map(item => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`relative flex flex-col items-center justify-center gap-0.5 font-cairo text-[10px] transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-primary transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
                <span className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                  active ? 'bg-primary/15 scale-105' : ''
                }`}>
                  <item.icon className="w-5 h-5" />
                </span>
                <span className="truncate max-w-[64px]">{t(item.key)}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="relative flex flex-col items-center justify-center gap-0.5 font-cairo text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-xl">
              <Menu className="w-5 h-5" />
            </span>
            <span>{t('sidebar.more') !== 'sidebar.more' ? t('sidebar.more') : 'More'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
