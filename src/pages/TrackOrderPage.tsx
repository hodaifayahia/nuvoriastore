import SEO from '@/components/SEO';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, MapPin, User, Receipt, Sparkles } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/i18n';

const STATUS_STEPS = ['جديد', 'قيد المعالجة', 'تم الشحن', 'تم التسليم'];
const STATUS_ICONS = [Clock, Package, Truck, CheckCircle];

export default function TrackOrderPage() {
  const { t } = useTranslation();
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();
  const statusStepLabels = [
    t('trackOrder.status.new'),
    t('trackOrder.status.processing'),
    t('trackOrder.status.shipped'),
    t('trackOrder.status.delivered'),
  ];

  const handleSearch = async () => {
    if (!orderNumber.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data, error } = await supabase
      .rpc('get_order_tracking', { p_order_number: orderNumber.trim().toUpperCase() })
      .maybeSingle();
    setOrder(data);
    setLoading(false);
    if (error || !data) {
      toast({ title: t('trackOrder.toast.notFoundTitle'), description: t('trackOrder.toast.notFoundDescription'), variant: 'destructive' });
    }
  };

  const currentStep = order ? (order.status === 'ملغي' ? -1 : STATUS_STEPS.indexOf(order.status)) : -1;

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="تتبع طلبك — سوق دزاير إكسبرس"
        description="تتبع حالة طلبك في الوقت الفعلي على متجر سوق دزاير إكسبرس. أدخل رقم الطلب لمعرفة حالة الشحن."
        path="/track"
      />
      {/* ─── Hero ─── */}
      <section className="relative bg-primary border-b border-primary/20">
        <div className="container relative z-10 py-12 md:py-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary bg-primary-foreground rounded-full px-5 py-2">
              <Sparkles className="w-4 h-4" />
              {t('trackOrder.title')}
            </div>
            <h1 className="font-cairo font-black text-4xl md:text-5xl text-primary-foreground leading-tight">
              {t('trackOrder.title')}
            </h1>
            <p className="text-primary-foreground/80 text-lg">
              {t('trackOrder.inputPlaceholder')}
            </p>

            {/* Search */}
            <div className="max-w-xl mx-auto pt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder={t('trackOrder.inputPlaceholder')}
                  className="font-roboto h-14 pr-12 rounded-2xl bg-background border-border text-foreground text-right"
                  dir="ltr"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading} className="font-cairo h-14 px-6 rounded-2xl shrink-0 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Search className="w-4 h-4" />
                {t('trackOrder.search')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container max-w-2xl py-10">
        {order && (
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 animate-fade-in space-y-8 shadow-sm">
            <div className="text-center pb-6 border-b border-border">
              <p className="font-cairo text-sm text-muted-foreground">{t('trackOrder.orderNumber')}</p>
              <p className="font-roboto font-bold text-2xl text-primary mt-1">{order.order_number}</p>
              <p className="font-cairo text-sm text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
            </div>

            {order.status === 'ملغي' ? (
              <div className="flex items-center justify-center gap-2 text-destructive py-4">
                <XCircle className="w-6 h-6" />
                <span className="font-cairo font-bold text-lg">{t('trackOrder.cancelled')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between px-2">
                {statusStepLabels.map((step, i) => {
                  const Icon = STATUS_ICONS[i];
                  const active = i <= currentStep;
                  return (
                    <div key={step} className="flex flex-col items-center gap-2 relative flex-1">
                      {i > 0 && (
                        <div className={`absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2 ${i <= currentStep ? 'bg-primary' : 'bg-border'}`} style={{ right: '50%', width: '100%', zIndex: 0 }} />
                      )}
                      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`font-cairo text-xs text-center ${active ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{step}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3 pt-6 border-t border-border">
              <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-cairo text-xs text-muted-foreground">{t('trackOrder.customerName')}</p>
                  <p className="font-cairo font-semibold text-foreground truncate">{order.customer_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-cairo text-xs text-muted-foreground">{t('trackOrder.wilaya')}</p>
                  <p className="font-cairo font-semibold text-foreground truncate">{order.wilaya_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary text-primary-foreground rounded-xl p-4 sm:col-span-2">
                <div className="w-10 h-10 rounded-lg bg-primary-foreground/15 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <p className="font-cairo font-semibold">{t('trackOrder.total')}</p>
                  <p className="font-roboto font-bold text-lg">{formatPrice(Number(order.total_amount))}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {searched && !order && !loading && (
          <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl">
            <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-cairo text-muted-foreground text-lg">{t('trackOrder.notFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
