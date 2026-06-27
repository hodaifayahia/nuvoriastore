import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, Package, ShoppingBag, User } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTranslation } from '@/i18n';

const STATUS_MAP: Record<string, { key: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'جديد': { key: 'dash.status.new', variant: 'default' },
  'قيد التحضير': { key: 'dash.status.preparing', variant: 'secondary' },
  'تم الشحن': { key: 'dash.status.shipped', variant: 'outline' },
  'تم التسليم': { key: 'dash.status.delivered', variant: 'default' },
  'ملغي': { key: 'dash.status.cancelled', variant: 'destructive' },
};

export default function CustomerDashboardPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, images, main_image_index))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading) return null;
  if (!user) return null;

  const displayName = user.user_metadata?.display_name || user.email;

  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="font-cairo font-bold text-2xl text-foreground">
              {t('dash.welcome').replace('{name}', displayName)}
            </h1>
            <p className="font-cairo text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={async () => { await signOut(); navigate('/'); }}
          className="font-cairo gap-2 rounded-xl"
        >
          <LogOut className="w-4 h-4" />
          {t('dash.logout')}
        </Button>
      </div>

      <div className="bg-card border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="font-cairo font-bold text-xl">{t('dash.myOrders')}</h2>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : orders && orders.length > 0 ? (
          <Accordion type="single" collapsible className="space-y-3">
            {orders.map(order => {
              const status = STATUS_MAP[order.status || 'جديد'] || STATUS_MAP['جديد'];
              return (
                <AccordionItem key={order.id} value={order.id} className="border rounded-xl px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center justify-between w-full pl-4">
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                        <div className="text-right">
                          <p className="font-cairo font-bold text-sm">{order.order_number}</p>
                          <p className="font-cairo text-xs text-muted-foreground">{formatDate(order.created_at!)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={status.variant} className="font-cairo">{t(status.key)}</Badge>
                        <span className="font-roboto font-bold text-sm text-primary">{formatPrice(Number(order.total_amount))}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-3 pt-2">
                      {(order as any).order_items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
                          {item.products?.images?.[item.products?.main_image_index ?? 0] && (
                            <img
                              src={item.products.images[item.products.main_image_index ?? 0]}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-cairo font-semibold text-sm truncate">{item.products?.name}</p>
                            <p className="font-cairo text-xs text-muted-foreground">×{item.quantity}</p>
                          </div>
                          <span className="font-roboto font-bold text-sm">{formatPrice(item.unit_price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-cairo text-muted-foreground">{t('dash.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
