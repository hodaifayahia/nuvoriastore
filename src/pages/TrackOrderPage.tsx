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
        title={`${t('trackOrder.title')} — NuvoriaStore`}
        description={t('trackOrder.inputPlaceholder')}
        path="/track"
      />
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden border-b border-primary/20 bg-gradient-to-br from-primary via-primary to-primary/90">
        <div className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px',
            color: 'hsl(var(--primary-foreground))',
          }}
        />
        <div className="container relative z-10 py-14 md:py-20">
          <div className="text-center space-y-5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary bg-primary-foreground rounded-full px-5 py-2 shadow-lg shadow-primary-foreground/10">
              <Sparkles className="w-4 h-4" />
              {t('trackOrder.title')}
            </div>
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20 backdrop-blur-sm flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
              <Package className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-cairo font-black text-4xl md:text-5xl text-primary-foreground leading-tight drop-shadow-sm">
              {t('trackOrder.title')}
            </h1>
            <p className="text-primary-foreground/85 text-base md:text-lg">
              {t('trackOrder.inputPlaceholder')}
            </p>

            {/* Search */}
            <div className="max-w-xl mx-auto pt-4 flex gap-2">
              <div className="relative flex-1 group">
                <div className="absolute inset-0 rounded-2xl bg-primary-foreground/30 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder={t('trackOrder.inputPlaceholder')}
                  className="relative font-roboto h-14 pr-12 rounded-2xl bg-background/95 backdrop-blur-sm border-primary-foreground/10 text-foreground text-right shadow-xl"
                  dir="ltr"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading} className="font-cairo h-14 px-6 rounded-2xl shrink-0 gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg">
                <Search className="w-4 h-4" />
                {t('trackOrder.search')}
              </Button>
            </div>
          </div>
        </div>
      </section>


      <div className="container max-w-2xl py-10">
        {order && (
          <div className="bg-card border border-border rounded-3xl p-6 md:p-10 animate-fade-in shadow-sm">
            {/* Order header */}
            <div className="text-center pb-8 border-b border-border">
              <p className="font-cairo text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('trackOrder.orderNumber')}</p>
              <p className="font-roboto font-black text-3xl md:text-4xl text-primary mt-2 tracking-tight">{order.order_number}</p>
              <p className="font-cairo text-sm text-muted-foreground mt-2">{formatDate(order.created_at)}</p>
            </div>

            {/* Timeline */}
            {order.status === 'ملغي' ? (
              <div className="flex items-center justify-center gap-2 text-destructive py-10">
                <XCircle className="w-6 h-6" />
                <span className="font-cairo font-bold text-lg">{t('trackOrder.cancelled')}</span>
              </div>
            ) : (
              <div className="relative py-10">
                {/* Rail — full width behind the icons */}
                <div className="absolute left-6 right-6 top-[52px] h-0.5 bg-border" />
                {(() => {
                  const total = statusStepLabels.length;
                  // In RTL, active steps fill from the right — width of the progress rail
                  const filled = currentStep < 0 ? 0 : currentStep / (total - 1);
                  return (
                    <div
                      className="absolute top-[52px] h-0.5 bg-primary transition-all duration-500"
                      style={{ right: '1.5rem', width: `calc((100% - 3rem) * ${filled})` }}
                    />
                  );
                })()}
                <div className="relative flex items-start justify-between">
                  {statusStepLabels.map((step, i) => {
                    const Icon = STATUS_ICONS[i];
                    const active = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <div key={step} className="flex flex-col items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                            active
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                              : 'bg-muted text-muted-foreground'
                          } ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`font-cairo text-xs text-center leading-tight px-1 ${active ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="grid sm:grid-cols-2 gap-3 pt-6 border-t border-border">
              <div className="flex items-center gap-3 bg-muted/40 rounded-2xl p-4 border border-border/50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-cairo text-[11px] uppercase tracking-wider text-muted-foreground">{t('trackOrder.customerName')}</p>
                  <p className="font-cairo font-semibold text-foreground truncate mt-0.5">{order.customer_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-muted/40 rounded-2xl p-4 border border-border/50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-cairo text-[11px] uppercase tracking-wider text-muted-foreground">{t('trackOrder.wilaya')}</p>
                  <p className="font-cairo font-semibold text-foreground truncate mt-0.5">{order.wilaya_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl p-5 sm:col-span-2 shadow-lg shadow-primary/20">
                <div className="w-11 h-11 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="flex-1 flex items-center justify-between gap-3">
                  <p className="font-cairo font-semibold">{t('trackOrder.total')}</p>
                  <p className="font-roboto font-black text-xl tracking-tight">{formatPrice(Number(order.total_amount))}</p>
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
