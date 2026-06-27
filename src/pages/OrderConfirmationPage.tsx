import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { useFacebookPixel } from '@/hooks/useFacebookPixel';
import { useTranslation } from '@/i18n';

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { trackEvent } = useFacebookPixel();
  const { t } = useTranslation();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_order_tracking', { p_order_number: orderNumber! })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderNumber,
  });

  useEffect(() => {
    if (order) {
      trackEvent('Purchase', {
        value: Number(order.total_amount),
        currency: 'DZD',
        content_type: 'product',
      });
    }
  }, [order, trackEvent]);

  if (isLoading) return <div className="container py-16"><Skeleton className="h-64 max-w-lg mx-auto rounded-lg" /></div>;

  if (!order) return (
    <div className="container py-16 text-center">
      <p className="font-cairo text-xl text-muted-foreground">{t('orderConf.notFound')}</p>
    </div>
  );

  const paymentLabel = order.payment_method === 'baridimob' ? t('orderConf.pay.baridimob') : order.payment_method === 'flexy' ? t('orderConf.pay.flexy') : order.payment_method;

  return (
    <div className="container py-16 max-w-lg mx-auto text-center">
      <div className="bg-card border rounded-lg p-8 animate-fade-in">
        <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
        <h1 className="font-cairo font-bold text-2xl mb-2">{t('orderConf.successTitle')}</h1>
        <p className="font-cairo text-muted-foreground mb-6">{t('orderConf.thanks')}</p>

        <div className="bg-muted rounded-lg p-4 mb-6">
          <p className="font-cairo text-sm text-muted-foreground">{t('orderConf.orderNumber')}</p>
          <p className="font-roboto font-bold text-2xl text-primary">{order.order_number}</p>
        </div>

        <div className="text-right space-y-2 mb-6">
          <div className="flex justify-between font-cairo text-sm">
            <span className="text-muted-foreground">{t('orderConf.name')}</span>
            <span>{order.customer_name}</span>
          </div>
          <div className="flex justify-between font-cairo text-sm">
            <span className="text-muted-foreground">{t('orderConf.phone')}</span>
            <span className="font-roboto">{order.customer_phone}</span>
          </div>
          <div className="flex justify-between font-cairo text-sm">
            <span className="text-muted-foreground">{t('orderConf.wilaya')}</span>
            <span>{(order as any).wilaya_name}</span>
          </div>
          {order.baladiya && (
            <div className="flex justify-between font-cairo text-sm">
              <span className="text-muted-foreground">{t('orderConf.baladiya')}</span>
              <span>{order.baladiya}</span>
            </div>
          )}
          {order.delivery_type && (
            <div className="flex justify-between font-cairo text-sm">
              <span className="text-muted-foreground">{t('orderConf.deliveryType')}</span>
              <span>{order.delivery_type === 'home' ? t('orderConf.home') : t('orderConf.office')}</span>
            </div>
          )}
          <div className="flex justify-between font-cairo text-sm">
            <span className="text-muted-foreground">{t('orderConf.paymentMethod')}</span>
            <span>{paymentLabel}</span>
          </div>
          <hr />
          <div className="flex justify-between font-cairo font-bold">
            <span>{t('orderConf.total')}</span>
            <span className="font-roboto text-primary">{formatPrice(Number(order.total_amount))}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link to={`/track?order=${order.order_number}`}>
            <Button variant="outline" className="w-full font-cairo font-semibold gap-2">
              <Search className="w-4 h-4" />
              {t('orderConf.trackOrder')}
            </Button>
          </Link>
          <Link to="/">
            <Button className="w-full font-cairo font-semibold">{t('orderConf.backToStore')}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
