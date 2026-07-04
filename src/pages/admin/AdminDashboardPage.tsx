import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Clock, ShoppingCart, DollarSign, AlertTriangle, TrendingUp, Package,
  ChevronLeft, Plus, PhoneCall, RotateCcw, CheckCircle, XCircle, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/format';

function OpsCard({
  icon: Icon, label, value, subtext, tone = 'default', onClick,
}: {
  icon: any; label: string; value: string | number; subtext?: string;
  tone?: 'default' | 'warning' | 'success' | 'primary';
  onClick?: () => void;
}) {
  const tones = {
    default: 'bg-card border-border',
    warning: 'bg-orange-500/5 border-orange-500/30',
    success: 'bg-emerald-500/5 border-emerald-500/30',
    primary: 'bg-primary/5 border-primary/30',
  };
  const iconTones = {
    default: 'bg-muted text-foreground',
    warning: 'bg-orange-500/15 text-orange-600',
    success: 'bg-emerald-500/15 text-emerald-600',
    primary: 'bg-primary/15 text-primary',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-right border rounded-2xl p-4 md:p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-cairo text-xs text-muted-foreground">{label}</p>
          <p className="font-roboto font-black text-2xl md:text-3xl mt-1">{value}</p>
          {subtext && <p className="font-cairo text-[11px] text-muted-foreground mt-1">{subtext}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconTones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </button>
  );
}

const STATUS_STYLES: Record<string, string> = {
  'جديد': 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  'قيد المعالجة': 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'تم الشحن': 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  'تم التسليم': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'ملغي': 'bg-destructive/15 text-destructive',
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data: orders = [] } = useQuery({
    queryKey: ['dash-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, total_amount, status, created_at, wilayas(name)')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['dash-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, name, stock, is_active');
      return data || [];
    },
  });

  const { data: returns = [] } = useQuery({
    queryKey: ['dash-returns'],
    queryFn: async () => {
      const { data } = await supabase.from('return_requests').select('id, status').eq('status', 'pending');
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const today = orders.filter(o => new Date(o.created_at!).toDateString() === todayStr);
    const pending = orders.filter(o => o.status === 'جديد');
    const processing = orders.filter(o => o.status === 'قيد المعالجة');
    const shipped = orders.filter(o => o.status === 'تم الشحن');
    const todayRevenue = today
      .filter(o => o.status === 'تم التسليم')
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const todayConfirmedCount = today.filter(o => o.status !== 'ملغي').length;
    const lowStock = products.filter(p => p.is_active && (p.stock ?? 0) <= 5);
    const outOfStock = products.filter(p => p.is_active && (p.stock ?? 0) === 0);
    return { today, pending, processing, shipped, todayRevenue, todayConfirmedCount, lowStock, outOfStock };
  }, [orders, products]);

  const recentPending = stats.pending.slice(0, 6);
  const recentAll = orders.slice(0, 8);

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-cairo font-black text-2xl md:text-3xl">لوحة التحكم</h1>
          <p className="font-cairo text-sm text-muted-foreground mt-1">
            نظرة سريعة على العمليات اليومية للمتجر — {formatDate(new Date().toISOString())}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => navigate('/admin/orders/create')} className="font-cairo gap-2">
            <Plus className="w-4 h-4" /> طلب جديد
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/orders')} className="font-cairo gap-2">
            <ShoppingCart className="w-4 h-4" /> كل الطلبات
          </Button>
        </div>
      </div>

      {/* Urgent Ops Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <OpsCard
          icon={Clock}
          label="طلبات بانتظار التأكيد"
          value={stats.pending.length}
          subtext={stats.pending.length > 0 ? 'تحتاج مراجعتك الآن' : 'كل شيء تحت السيطرة ✅'}
          tone={stats.pending.length > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/admin/orders?status=%D8%AC%D8%AF%D9%8A%D8%AF')}
        />
        <OpsCard
          icon={DollarSign}
          label="مبيعات اليوم"
          value={formatPrice(stats.todayRevenue)}
          subtext={`${stats.today.length} طلب اليوم`}
          tone="primary"
          onClick={() => navigate('/admin/orders')}
        />
        <OpsCard
          icon={AlertTriangle}
          label="مخزون منخفض"
          value={stats.lowStock.length}
          subtext={stats.outOfStock.length > 0 ? `${stats.outOfStock.length} نفدت من المخزون` : 'أقل من 5 قطع'}
          tone={stats.outOfStock.length > 0 ? 'warning' : 'default'}
          onClick={() => navigate('/admin/inventory')}
        />
        <OpsCard
          icon={RotateCcw}
          label="طلبات إرجاع"
          value={returns.length}
          subtext={returns.length > 0 ? 'قيد المراجعة' : 'لا يوجد'}
          tone={returns.length > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/admin/returns')}
        />
      </div>

      {/* Order pipeline snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PipelineCell label="جديد" count={stats.pending.length} color="bg-blue-500" />
        <PipelineCell label="قيد المعالجة" count={stats.processing.length} color="bg-amber-500" />
        <PipelineCell label="تم الشحن" count={stats.shipped.length} color="bg-purple-500" />
        <PipelineCell label="تم التسليم اليوم" count={stats.today.filter(o => o.status === 'تم التسليم').length} color="bg-emerald-500" />
      </div>

      {/* Two columns: Pending queue + Recent activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Pending queue */}
        <div className="xl:col-span-2 bg-card border rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                طلبات بانتظار التأكيد
              </h2>
              <p className="font-cairo text-xs text-muted-foreground mt-0.5">
                اتصل بالعميل واضغط «تأكيد» بعد التحقق.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="font-cairo" onClick={() => navigate('/admin/orders')}>
              الكل <ArrowRight className="w-3.5 h-3.5 mr-1" />
            </Button>
          </div>

          {recentPending.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-cairo text-sm text-muted-foreground">لا توجد طلبات معلقة. أحسنت! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPending.map((o: any) => (
                <button
                  key={o.id}
                  onClick={() => navigate('/admin/orders')}
                  className="w-full text-right flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-cairo font-semibold text-sm truncate">{o.customer_name}</p>
                      <span className="font-roboto text-[11px] text-muted-foreground">#{o.order_number}</span>
                    </div>
                    <p className="font-roboto text-xs text-muted-foreground truncate" dir="ltr">
                      {o.customer_phone} · {o.wilayas?.name || '—'}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-roboto font-bold text-sm">{formatPrice(Number(o.total_amount || 0))}</p>
                    <p className="font-cairo text-[10px] text-muted-foreground">{formatDate(o.created_at)}</p>
                  </div>
                  <a
                    href={`tel:${o.customer_phone}`}
                    onClick={e => e.stopPropagation()}
                    className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shrink-0"
                    aria-label="اتصل بالعميل"
                  >
                    <PhoneCall className="w-4 h-4" />
                  </a>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="bg-card border rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              تنبيهات المخزون
            </h2>
            <Button variant="ghost" size="sm" className="font-cairo" onClick={() => navigate('/admin/inventory')}>
              إدارة <ArrowRight className="w-3.5 h-3.5 mr-1" />
            </Button>
          </div>
          {stats.lowStock.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-cairo text-sm text-muted-foreground">المخزون بحالة جيدة.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {stats.lowStock.slice(0, 8).map((p: any) => {
                const oos = (p.stock ?? 0) === 0;
                return (
                  <div key={p.id} className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${oos ? 'bg-destructive/5 border-destructive/30' : 'bg-orange-500/5 border-orange-500/30'}`}>
                    <p className="font-cairo text-sm truncate flex-1">{p.name}</p>
                    <Badge variant="outline" className={`font-roboto text-[11px] ${oos ? 'text-destructive border-destructive/40' : 'text-orange-600 border-orange-500/40'}`}>
                      {oos ? 'نفد' : `${p.stock} متبقي`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-card border rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            آخر الطلبات
          </h2>
          <Button variant="ghost" size="sm" className="font-cairo" onClick={() => navigate('/admin/orders')}>
            عرض الكل <ArrowRight className="w-3.5 h-3.5 mr-1" />
          </Button>
        </div>

        <div className="overflow-x-auto -mx-4 md:-mx-5">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-right text-xs text-muted-foreground border-b">
                <th className="font-cairo font-semibold px-4 md:px-5 py-2">الطلب</th>
                <th className="font-cairo font-semibold px-4 py-2">العميل</th>
                <th className="font-cairo font-semibold px-4 py-2">الولاية</th>
                <th className="font-cairo font-semibold px-4 py-2">المبلغ</th>
                <th className="font-cairo font-semibold px-4 py-2">الحالة</th>
                <th className="font-cairo font-semibold px-4 md:px-5 py-2">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {recentAll.map((o: any) => (
                <tr key={o.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate('/admin/orders')}>
                  <td className="font-roboto text-xs px-4 md:px-5 py-3">#{o.order_number}</td>
                  <td className="font-cairo text-sm px-4 py-3 truncate max-w-[160px]">{o.customer_name}</td>
                  <td className="font-cairo text-xs text-muted-foreground px-4 py-3">{o.wilayas?.name || '—'}</td>
                  <td className="font-roboto font-semibold text-sm px-4 py-3">{formatPrice(Number(o.total_amount || 0))}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex font-cairo text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[o.status as string] || 'bg-muted'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="font-cairo text-[11px] text-muted-foreground px-4 md:px-5 py-3">{formatDate(o.created_at)}</td>
                </tr>
              ))}
              {recentAll.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 font-cairo text-sm text-muted-foreground">
                    لا توجد طلبات بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PipelineCell({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-card border rounded-xl p-3 flex items-center gap-3">
      <span className={`w-2 h-8 rounded-full ${color}`} />
      <div>
        <p className="font-cairo text-[11px] text-muted-foreground">{label}</p>
        <p className="font-roboto font-black text-lg leading-none mt-1">{count}</p>
      </div>
    </div>
  );
}
