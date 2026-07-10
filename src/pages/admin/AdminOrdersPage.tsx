import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, ExternalLink, AlertTriangle, MoreHorizontal, PackageCheck, Truck, Clock, Ban, PackageOpen, CheckCircle, Filter, ChevronDown, ChevronUp, Loader2, CheckSquare, Zap, Plus, Download, Trash2, ShoppingCart } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/format';
import { useTranslation } from '@/i18n';

const STATUSES = ['جديد', 'قيد المعالجة', 'تم الشحن', 'تم التسليم', 'ملغي'];

const STATUS_KEYS: Record<string, string> = {
  'جديد': 'status.new',
  'قيد المعالجة': 'status.processing',
  'تم الشحن': 'status.shipped',
  'تم التسليم': 'status.delivered',
  'ملغي': 'status.cancelled',
};

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  'جديد': { icon: Clock, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  'قيد المعالجة': { icon: PackageOpen, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  'تم الشحن': { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'تم التسليم': { icon: PackageCheck, color: 'text-primary', bg: 'bg-primary/10' },
  'ملغي': { icon: Ban, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export default function AdminOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [wilayaFilter, setWilayaFilter] = useState('الكل');
  const [paymentFilter, setPaymentFilter] = useState('الكل');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusDialog, setBulkStatusDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [exportingDelivery, setExportingDelivery] = useState(false);

  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*, wilayas(name)').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: orderItems } = useQuery({
    queryKey: ['order-items', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const { data } = await supabase.from('order_items').select('*, products(name)').eq('order_id', selectedOrder.id);
      return data || [];
    },
    enabled: !!selectedOrder,
  });

  const { data: wilayas } = useQuery({
    queryKey: ['wilayas-list'],
    queryFn: async () => {
      const { data } = await supabase.from('wilayas').select('name, code').order('code', { ascending: true, nullsFirst: false });
      return data?.map(w => w.name) || [];
    },
  });

  const { data: deliveryCompanies } = useQuery({
    queryKey: ['delivery-companies-active'],
    queryFn: async () => {
      const { data } = await (supabase.from('delivery_companies' as any) as any).select('id, name, api_key, api_url').eq('is_active', true).order('name');
      return (data || []) as { id: string; name: string; api_key: string | null; api_url: string | null }[];
    },
  });

  const handleExportToDelivery = async () => {
    if (!selectedCompanyId || selectedIds.size === 0) return;
    setExportingDelivery(true);
    try {
      const { data, error } = await supabase.functions.invoke('delivery-export', {
        body: { order_ids: Array.from(selectedIds), company_id: selectedCompanyId },
      });
      if (error) throw error;

      if (data.api_result) {
        // API was called (company has API configured)
        if (data.api_result.success) {
          toast({ title: `✅ ${data.order_count} ${t('delivery.ordersSentSuccess')} ${data.company_name}` });
        } else {
          toast({ title: t('common.errorOccurred'), description: data.api_result.message });
        }
      } else {
        // No API configured — fallback to CSV download
        const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.company_name}-orders-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: t('delivery.csvExported') });
      }
      setDeliveryDialog(false);
      setSelectedCompanyId('');
    } catch (err: any) {
      toast({ title: t('common.errorOccurred'), description: err.message });
    } finally {
      setExportingDelivery(false);
    }
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: t('status.updated') });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete order items first, then the order
      const { error: itemsError } = await supabase.from('order_items').delete().eq('order_id', id);
      if (itemsError) throw itemsError;
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setDeleteOrderId(null);
      toast({ title: 'تم حذف الطلبية ✅' });
    },
    onError: (error: any) => {
      toast({ title: 'خطأ في حذف الطلبية', description: error.message, variant: 'destructive' });
    },
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase.from('orders').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedIds(new Set());
      setBulkStatusDialog(false);
      toast({ title: t('orders.bulkStatusUpdate').replace('{n}', String(selectedIds.size)) });
    },
  });

  const riskyWilayas = useMemo(() => {
    if (!orders) return new Map<string, number>();
    const stats: Record<string, { total: number; cancelled: number }> = {};
    orders.forEach(o => {
      const name = (o as any).wilayas?.name;
      if (!name) return;
      if (!stats[name]) stats[name] = { total: 0, cancelled: 0 };
      stats[name].total++;
      if (o.status === 'ملغي') stats[name].cancelled++;
    });
    const result = new Map<string, number>();
    Object.entries(stats).forEach(([name, s]) => {
      if (s.total >= 3 && s.cancelled / s.total > 0.3) {
        result.set(name, Math.round((s.cancelled / s.total) * 100));
      }
    });
    return result;
  }, [orders]);

  const filtered = useMemo(() => {
    return (orders || []).filter(o => {
      const matchSearch = !search || o.order_number?.includes(search) || o.customer_name?.includes(search) || o.customer_phone?.includes(search);
      const matchStatus = statusFilter === 'الكل' || o.status === statusFilter;
      const wilayaName = (o as any).wilayas?.name;
      const matchWilaya = wilayaFilter === 'الكل' || wilayaName === wilayaFilter;
      const matchPayment = paymentFilter === 'الكل' || o.payment_method === paymentFilter;
      const matchDateFrom = !dateFrom || (o.created_at && o.created_at >= dateFrom);
      const matchDateTo = !dateTo || (o.created_at && o.created_at <= dateTo + 'T23:59:59');
      const matchMinTotal = !minTotal || Number(o.total_amount) >= Number(minTotal);
      const matchMaxTotal = !maxTotal || Number(o.total_amount) <= Number(maxTotal);
      const matchSource = sourceFilter === 'all' || (sourceFilter === 'landing' ? !!(o as any).landing_page_id : !(o as any).landing_page_id);
      return matchSearch && matchStatus && matchWilaya && matchPayment && matchDateFrom && matchDateTo && matchMinTotal && matchMaxTotal && matchSource;
    });
  }, [orders, search, statusFilter, wilayaFilter, paymentFilter, dateFrom, dateTo, minTotal, maxTotal, sourceFilter]);

  const handleQuickStatus = (orderId: string, status: string) => {
    updateStatus.mutate({ id: orderId, status });
  };

  // Selection helpers
  const allSelected = filtered.length > 0 && filtered.every(o => selectedIds.has(o.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const clearAdvanced = () => {
    setWilayaFilter('الكل');
    setPaymentFilter('الكل');
    setDateFrom('');
    setDateTo('');
    setMinTotal('');
    setMaxTotal('');
  };

  const hasAdvancedFilters = wilayaFilter !== 'الكل' || paymentFilter !== 'الكل' || dateFrom || dateTo || minTotal || maxTotal;

  // Quick bulk status for filtered orders
  const handleBulkQuickStatus = (status: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkUpdateStatus.mutate({ ids, status });
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search & basic filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('orders.searchPlaceholder')} className="pr-10 font-cairo" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 font-cairo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="الكل" className="font-cairo">{t('common.all')}</SelectItem>
              {STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                return (
                  <SelectItem key={s} value={s} className="font-cairo">
                    <span className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      {t(STATUS_KEYS[s])}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-40 font-cairo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-cairo">{t('orders.sourceAll')}</SelectItem>
              <SelectItem value="website" className="font-cairo">🌐 {t('orders.sourceWebsite')}</SelectItem>
              <SelectItem value="landing" className="font-cairo">🚀 {t('orders.sourceLanding')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showAdvanced ? 'default' : 'outline'}
            className="font-cairo gap-1.5"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="w-4 h-4" />
            {t('orders.advancedFilter')}
            {hasAdvancedFilters && <span className="w-2 h-2 rounded-full bg-destructive" />}
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
           </Button>
          <Button className="font-cairo gap-1.5" onClick={() => navigate('/admin/orders/create')}>
            <Plus className="w-4 h-4" /> إنشاء طلب
          </Button>
          <Button variant="secondary" className="font-cairo gap-1.5" onClick={() => navigate('/admin/orders/create?fast=1')}>
            <ShoppingCart className="w-4 h-4" /> طلب سريع
          </Button>
          <Button
            variant="outline"
            className="font-cairo gap-1.5"
            onClick={() => {
              if (filtered.length === 0) return;
              setSelectedIds(new Set(filtered.map(o => o.id)));
              setDeliveryDialog(true);
            }}
          >
            <Truck className="w-4 h-4" /> {t('delivery.exportToDelivery')}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-cairo font-semibold text-sm flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> {t('orders.advancedFilter')}
              </h3>
              {hasAdvancedFilters && (
                <Button variant="ghost" size="sm" className="font-cairo text-xs" onClick={clearAdvanced}>
                  {t('orders.clearFilters')}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <Label className="font-cairo text-xs">{t('orders.wilaya')}</Label>
                <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                  <SelectTrigger className="font-cairo mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الكل" className="font-cairo">{t('common.all')}</SelectItem>
                    {wilayas?.map(w => <SelectItem key={w} value={w} className="font-cairo">{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-cairo text-xs">{t('orders.paymentMethod')}</Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="font-cairo mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الكل" className="font-cairo">{t('common.all')}</SelectItem>
                    <SelectItem value="cod" className="font-cairo">{t('orders.cod')}</SelectItem>
                    <SelectItem value="baridimob" className="font-cairo">{t('orders.baridimob')}</SelectItem>
                    <SelectItem value="flexy" className="font-cairo">{t('orders.flexy')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-cairo text-xs">{t('orders.fromDate')}</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 h-9 text-xs" />
              </div>
              <div>
                <Label className="font-cairo text-xs">{t('orders.toDate')}</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 h-9 text-xs" />
              </div>
              <div>
                <Label className="font-cairo text-xs">{t('orders.minAmount')}</Label>
                <Input type="number" value={minTotal} onChange={e => setMinTotal(e.target.value)} placeholder="0" className="mt-1 h-9 text-xs font-roboto" />
              </div>
              <div>
                <Label className="font-cairo text-xs">{t('orders.maxAmount')}</Label>
                <Input type="number" value={maxTotal} onChange={e => setMaxTotal(e.target.value)} placeholder="∞" className="mt-1 h-9 text-xs font-roboto" />
              </div>
            </div>
            <p className="font-cairo text-xs text-muted-foreground">{t('orders.matchingOrders').replace('{n}', String(filtered.length))}</p>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {someSelected && (
          <div className="flex flex-wrap items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span className="font-cairo text-sm font-medium text-primary">{t('common.selected').replace('{n}', String(selectedIds.size))}</span>
            <div className="flex flex-wrap gap-2 mr-auto">
              {STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    className={`font-cairo gap-1.5 text-xs ${cfg.color}`}
                    onClick={() => handleBulkQuickStatus(s)}
                    disabled={bulkUpdateStatus.isPending}
                  >
                    <Icon className="w-3.5 h-3.5" /> {t(STATUS_KEYS[s])}
                  </Button>
                );
              })}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="font-cairo gap-1.5 text-xs"
              onClick={() => setDeliveryDialog(true)}
            >
              <Download className="w-3.5 h-3.5" /> {t('delivery.exportToDelivery')}
            </Button>
            <Button size="sm" variant="ghost" className="font-cairo text-xs" onClick={() => setSelectedIds(new Set())}>
              {t('common.deselectAll')}
            </Button>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block bg-card border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-right"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></th>
                <th className="p-3 text-right font-cairo">{t('orders.orderNumber')}</th>
                <th className="p-3 text-right font-cairo">{t('orders.customer')}</th>
                <th className="p-3 text-right font-cairo">{t('orders.phone')}</th>
                <th className="p-3 text-right font-cairo">{t('orders.wilaya')}</th>
                <th className="p-3 text-right font-cairo">{t('orders.total')}</th>
                <th className="p-3 text-right font-cairo">{t('orders.status')}</th>
                <th className="p-3 text-right font-cairo">{t('orders.date')}</th>
                <th className="p-3 text-right font-cairo">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const wilayaName = (o as any).wilayas?.name;
                const cancelRate = wilayaName ? riskyWilayas.get(wilayaName) : undefined;
                const statusCfg = STATUS_CONFIG[o.status || 'جديد'] || STATUS_CONFIG['جديد'];
                const StatusIcon = statusCfg.icon;
                return (
                  <tr key={o.id} className={`border-b hover:bg-muted/50 ${selectedIds.has(o.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-3"><Checkbox checked={selectedIds.has(o.id)} onCheckedChange={() => toggleSelect(o.id)} /></td>
                    <td className="p-3 font-roboto font-bold text-primary">
                      {o.order_number}
                      {(o as any).landing_page_id && <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-cairo">🚀</span>}
                    </td>
                    <td className="p-3 font-cairo">{o.customer_name}</td>
                    <td className="p-3 font-roboto text-xs">{o.customer_phone}</td>
                    <td className="p-3 font-cairo text-xs">
                      <span className="flex items-center gap-1">
                        {wilayaName}
                        {cancelRate !== undefined && (
                          <Tooltip><TooltipTrigger><AlertTriangle className="w-3.5 h-3.5 text-destructive" /></TooltipTrigger><TooltipContent className="font-cairo">{t('orders.highCancelRate').replace('{n}', String(cancelRate))}</TooltipContent></Tooltip>
                        )}
                      </span>
                    </td>
                    <td className="p-3 font-roboto">{formatPrice(Number(o.total_amount))}</td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-cairo cursor-pointer hover:opacity-80 transition-opacity ${statusCfg.bg} ${statusCfg.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" /> {t(STATUS_KEYS[o.status || 'جديد'])}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-popover border z-50 min-w-[160px]">
                          {STATUSES.map(s => { const cfg = STATUS_CONFIG[s]; const Icon = cfg.icon; const isActive = o.status === s; return (
                            <DropdownMenuItem key={s} onClick={() => !isActive && handleQuickStatus(o.id, s)} className={`font-cairo gap-2 cursor-pointer ${isActive ? 'bg-muted font-bold' : ''}`}>
                              <Icon className={`w-4 h-4 ${cfg.color}`} /> {t(STATUS_KEYS[s])} {isActive && <CheckCircle className="w-3.5 h-3.5 text-primary mr-auto" />}
                            </DropdownMenuItem>
                          ); })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="p-3 font-cairo text-xs text-muted-foreground">{formatDate(o.created_at!)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedOrder(o); setNewStatus(o.status || 'جديد'); }}><Eye className="w-4 h-4" /></Button></TooltipTrigger>
                          <TooltipContent className="font-cairo">{t('common.view')}</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border z-50 min-w-[160px]">
                            {STATUSES.map(s => {
                              const cfg = STATUS_CONFIG[s];
                              const Icon = cfg.icon;
                              return (
                                <DropdownMenuItem key={s} onClick={() => handleQuickStatus(o.id, s)} className="font-cairo gap-2 cursor-pointer">
                                  <Icon className={`w-4 h-4 ${cfg.color}`} /> {t(STATUS_KEYS[s])}
                                </DropdownMenuItem>
                              );
                            })}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteOrderId(o.id)} className="font-cairo gap-2 cursor-pointer text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4" /> حذف الطلبية
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filtered.map(o => {
            const wilayaName = (o as any).wilayas?.name;
            const statusCfg = STATUS_CONFIG[o.status || 'جديد'] || STATUS_CONFIG['جديد'];
            const StatusIcon = statusCfg.icon;
            return (
              <div key={o.id} className="bg-card border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-roboto font-bold text-primary text-sm">
                    {o.order_number}
                    {(o as any).landing_page_id && <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-cairo">🚀</span>}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-cairo ${statusCfg.bg} ${statusCfg.color}`}>
                    <StatusIcon className="w-3 h-3" /> {t(STATUS_KEYS[o.status || 'جديد'])}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-cairo">
                  <div><span className="text-muted-foreground">{t('orders.customer')}:</span> {o.customer_name}</div>
                  <div><span className="text-muted-foreground">{t('orders.phone')}:</span> <span className="font-roboto">{o.customer_phone}</span></div>
                  <div><span className="text-muted-foreground">{t('orders.wilaya')}:</span> {wilayaName || '—'}</div>
                  <div><span className="text-muted-foreground">{t('orders.date')}:</span> {formatDate(o.created_at!)}</div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="font-roboto font-bold text-sm">{formatPrice(Number(o.total_amount))}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 font-cairo text-xs" onClick={() => { setSelectedOrder(o); setNewStatus(o.status || 'جديد'); }}>
                      <Eye className="w-3.5 h-3.5 ml-1" /> {t('common.view')}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border z-50">
                        {STATUSES.map(s => { const cfg = STATUS_CONFIG[s]; const Icon = cfg.icon; return (
                          <DropdownMenuItem key={s} onClick={() => handleQuickStatus(o.id, s)} className={`font-cairo gap-2 cursor-pointer ${cfg.color}`}><Icon className="w-4 h-4" /> {t(STATUS_KEYS[s])}</DropdownMenuItem>
                        ); })}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteOrderId(o.id)} className="font-cairo gap-2 cursor-pointer text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4" /> حذف الطلبية
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Dialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-cairo">{t('orders.orderDetails')} {selectedOrder?.order_number}</DialogTitle></DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2 font-cairo">
                  <div><span className="text-muted-foreground">{t('orders.customer')}:</span> {selectedOrder.customer_name}</div>
                  <div><span className="text-muted-foreground">{t('orders.phone')}:</span> <span className="font-roboto">{selectedOrder.customer_phone}</span></div>
                  <div><span className="text-muted-foreground">{t('orders.wilaya')}:</span> {(selectedOrder as any).wilayas?.name}</div>
                  <div><span className="text-muted-foreground">{t('orders.paymentMethod')}:</span> {selectedOrder.payment_method === 'baridimob' ? t('orders.baridimob') : selectedOrder.payment_method === 'flexy' ? t('orders.flexy') : selectedOrder.payment_method === 'cod' ? t('orders.cod') : selectedOrder.payment_method}</div>
                </div>
                {selectedOrder.address && <div className="font-cairo"><span className="text-muted-foreground">{t('orders.address')}:</span> {selectedOrder.address}</div>}
                {selectedOrder.payment_receipt_url && (
                  <div className="space-y-2">
                    <a href={selectedOrder.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary font-cairo hover:underline">
                      <ExternalLink className="w-3 h-3" /> عرض إيصال الدفع
                    </a>
                    <img src={selectedOrder.payment_receipt_url} alt="إيصال الدفع" className="max-w-full max-h-48 rounded-lg border object-contain" />
                  </div>
                )}
                <div className="border rounded-lg p-3">
                  <h3 className="font-cairo font-bold mb-2">{t('orders.items')}</h3>
                  {orderItems?.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-1 font-cairo">
                      <span>{item.products?.name} ×{item.quantity}</span>
                      <span className="font-roboto">{formatPrice(Number(item.unit_price) * item.quantity)}</span>
                    </div>
                  ))}
                  <hr className="my-2" />
                  <div className="flex justify-between font-cairo text-sm">
                    <span>{t('orders.subtotal')}</span>
                    <span className="font-roboto">{formatPrice(Number(selectedOrder.subtotal))}</span>
                  </div>
                  <div className="flex justify-between font-cairo text-sm">
                    <span>{t('orders.shipping')}</span>
                    <span className="font-roboto">{formatPrice(Number(selectedOrder.shipping_cost))}</span>
                  </div>
                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="flex justify-between font-cairo text-sm text-primary">
                      <span>{t('orders.discount')} {selectedOrder.coupon_code && `(${selectedOrder.coupon_code})`}</span>
                      <span className="font-roboto">-{formatPrice(Number(selectedOrder.discount_amount))}</span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="flex justify-between font-cairo font-bold">
                    <span>{t('common.total')}</span>
                    <span className="font-roboto text-primary">{formatPrice(Number(selectedOrder.total_amount))}</span>
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="font-cairo">{t('common.status')}</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="font-cairo mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => {
                          const cfg = STATUS_CONFIG[s];
                          const Icon = cfg.icon;
                          return (
                            <SelectItem key={s} value={s} className="font-cairo">
                              <span className="flex items-center gap-2">
                                <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                {t(STATUS_KEYS[s])}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => { updateStatus.mutate({ id: selectedOrder.id, status: newStatus }); setSelectedOrder(null); }} disabled={updateStatus.isPending} className="font-cairo">{t('common.save')}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delivery Export Dialog */}
        <Dialog open={deliveryDialog} onOpenChange={setDeliveryDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><Truck className="w-5 h-5" /> {t('delivery.exportToDelivery')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="font-cairo text-sm text-muted-foreground">
                {t('delivery.exportDesc').replace('{n}', String(selectedIds.size))}
              </p>
              <div>
                <Label className="font-cairo">{t('delivery.selectCompany')}</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="font-cairo mt-1"><SelectValue placeholder={t('delivery.selectCompany')} /></SelectTrigger>
                  <SelectContent>
                    {deliveryCompanies?.map(c => (
                      <SelectItem key={c.id} value={c.id} className="font-cairo">
                        <span className="flex items-center gap-2">
                          {c.name}
                          {c.api_key ? <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> : <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" />}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCompanyId && (() => {
                const comp = deliveryCompanies?.find(c => c.id === selectedCompanyId);
                return comp ? (
                  <p className="text-xs font-cairo text-muted-foreground bg-muted/50 p-2 rounded">
                    {comp.api_key ? `📡 ${t('delivery.willSendApi')}` : `📄 ${t('delivery.willDownloadCsv')}`}
                  </p>
                ) : null;
              })()}
              <Button
                onClick={handleExportToDelivery}
                disabled={!selectedCompanyId || exportingDelivery}
                className="w-full font-cairo gap-2"
              >
                {exportingDelivery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                {t('delivery.sendToDelivery')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Order Confirmation */}
        <AlertDialog open={!!deleteOrderId} onOpenChange={open => !open && setDeleteOrderId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-cairo">تأكيد حذف الطلبية</AlertDialogTitle>
              <AlertDialogDescription className="font-cairo">
                هل أنت متأكد من حذف هذه الطلبية؟ سيتم حذف جميع عناصرها بشكل نهائي ولا يمكن التراجع.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteOrderId && deleteOrderMutation.mutate(deleteOrderId)}
                className="font-cairo bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteOrderMutation.isPending}
              >
                {deleteOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Trash2 className="w-4 h-4 ml-1" />}
                حذف نهائياً
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
      </div>
    </TooltipProvider>
  );
}
