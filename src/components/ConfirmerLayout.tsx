import { useEffect, useState, ReactNode } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, LogOut, Menu, X, Bell, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useStoreLogo } from '@/hooks/useStoreLogo';
import { toast } from 'sonner';
import { useTranslation, Language } from '@/i18n';

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
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

const LANG_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'ar', label: 'العربية', flag: '🇩🇿' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

export default function ConfirmerLayout({ children }: { children: ReactNode }) {
  const { t, language, setLanguage, dir } = useTranslation();
  const isRtl = dir === 'rtl';

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [isConfirmer, setIsConfirmer] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: logoUrl } = useStoreLogo();

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

  // Realtime new order notifications
  useEffect(() => {
    const channel = supabase
      .channel('confirmer-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as any;
          const notif: Notification = {
            id: `order_${order.id}`,
            title: `${t('sidebar.newOrder')} #${order.order_number}`,
            description: order.customer_name,
            timestamp: new Date(),
          };
          setNotifications(prev => [notif, ...prev]);
          setPendingOrdersCount(prev => prev + 1);
          playNotificationSound();
          toast(`${t('sidebar.newOrder')} #${order.order_number}`, {
            description: order.customer_name,
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
  }, [t]);

  useEffect(() => {
    const checkConfirmer = async (userId: string) => {
      const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'confirmer' });
      if (!data) {
        toast.error(t('sidebar.noAccess'));
        navigate('/nuvoria-store/login');
        return;
      }
      setIsConfirmer(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
        navigate('/nuvoria-store/login');
      } else {
        checkConfirmer(session.user.id).finally(() => setLoading(false));
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
        navigate('/nuvoria-store/login');
      } else {
        checkConfirmer(session.user.id).finally(() => setLoading(false));
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, t]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/nuvoria-store/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="w-32 h-8" /></div>;
  if (!user || !isConfirmer) return null;

  const currentLang = LANG_OPTIONS.find(l => l.value === language)!;

  return (
    <div className="min-h-screen flex bg-muted" dir={dir}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 z-50 w-64 bg-card transform transition-transform flex flex-col
        ${isRtl ? 'right-0 border-l' : 'left-0 border-r'}
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-4 border-b">
          <Link to="/confirmer" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Store" className="w-8 h-8 rounded object-contain" />
            ) : (
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-cairo font-bold text-xs">DZ</span>
              </div>
            )}
            <span className="font-cairo font-bold text-lg">{t('confirmer.panel')}</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <Link
            to="/confirmer"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-cairo text-sm transition-colors ${
              location.pathname === '/confirmer' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {t('sidebar.orders')}
            {pendingOrdersCount > 0 && (
              <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingOrdersCount > 9 ? '9+' : pendingOrdersCount}
              </span>
            )}
          </Link>
        </nav>
        <div className="p-3 border-t">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2 font-cairo text-destructive hover:text-destructive">
            <LogOut className="w-4 h-4" />
            {t('sidebar.logout')}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 ${isRtl ? 'lg:mr-64' : 'lg:ml-64'}`}>
        <header className="sticky top-0 z-40 bg-card border-b h-14 flex items-center px-4 gap-2">
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-cairo font-bold text-lg shrink-0">{t('confirmer.panel')}</h1>

          <div className={`flex-1 ${isRtl ? 'mr-auto' : 'ml-auto'}`} />

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

          {/* Notification Bell */}
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
            <PopoverContent align="end" className="w-72 p-0 max-h-[300px] overflow-hidden" sideOffset={8}>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h3 className="font-cairo font-bold text-sm">{t('sidebar.notifications')}</h3>
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setNotifications([])} className="font-cairo text-xs h-7">
                    {t('sidebar.clearAll')}
                  </Button>
                )}
              </div>
              <div className="overflow-y-auto max-h-[240px]">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="font-cairo text-sm text-muted-foreground">{t('sidebar.noNotifications')}</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className="px-4 py-3 border-b last:border-b-0">
                      <p className="font-cairo font-semibold text-sm">{notif.title}</p>
                      <p className="font-cairo text-xs text-muted-foreground">{notif.description}</p>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
