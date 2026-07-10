import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, ExternalLink, AlertTriangle, MoreHorizontal, PackageCheck, Truck, Clock, Ban, PackageOpen, CheckCircle, Filter, ChevronDown, ChevronUp, Loader2, CheckSquare, Zap, Plus, Download, Trash2, ShoppingCart, Phone, MapPin, User, CreditCard, Package, Calendar, MessageCircle } from 'lucide-react';
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

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string; row: string; border: string }> = {
  'جديد': { icon: Clock, color: 'text-sky-600', bg: 'bg-sky-500/10', row: 'bg-sky-50/60 hover:bg-sky-100/60 dark:bg-sky-500/5 dark:hover:bg-sky-500/10', border: 'border-l-4 border-l-sky-500' },
  'قيد المعالجة': { icon: PackageOpen, color: 'text-orange-500', bg: 'bg-orange-500/10', row: 'bg-orange-50/60 hover:bg-orange-100/60 dark:bg-orange-500/5 dark:hover:bg-orange-500/10', border: 'border-l-4 border-l-orange-500' },
  'تم الشحن': { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-500/10', row: 'bg-blue-50/60 hover:bg-blue-100/60 dark:bg-blue-500/5 dark:hover:bg-blue-500/10', border: 'border-l-4 border-l-blue-500' },
  'تم التسليم': { icon: PackageCheck, color: 'text-primary', bg: 'bg-primary/10', row: 'bg-emerald-50/60 hover:bg-emerald-100/60 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10', border: 'border-l-4 border-l-emerald-500' },
  'ملغي': { icon: Ban, color: 'text-destructive', bg: 'bg-destructive/10', row: 'bg-red-50/60 hover:bg-red-100/60 dark:bg-red-500/5 dark:hover:bg-red-500/10', border: 'border-l-4 border-l-red-500' },
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

  // Pagination
  const PAGE_SIZE = 30;
  const [page, setPage] = useState(1);

  // Reset to page 1 when any filter/search changes
  const filterKey = `${search}|${statusFilter}|${sourceFilter}|${wilayaFilter}|${paymentFilter}|${dateFrom}|${dateTo}|${minTotal}|${maxTotal}`;
  useMemo(() => { setPage(1); }, [filterKey]);

  const { data: ordersResult, isFetching } = useQuery({
    queryKey: ['admin-orders', page, search, statusFilter, sourceFilter, wilayaFilter, paymentFilter, dateFrom, dateTo, minTotal, maxTotal],
    queryFn: async () => {
      let q = supabase.from('orders').select('*, wilayas(name)', { count: 'exact' });

      if (search.trim()) {
        const s = search.trim().replace(/[%,]/g, '');
        q = q.or(`order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`);
      }
      if (statusFilter !== 'الكل') q = q.eq('status', statusFilter);
      if (paymentFilter !== 'الكل') q = q.eq('payment_method', paymentFilter);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
      if (minTotal) q = q.gte('total_amount', Number(minTotal));
      if (maxTotal) q = q.lte('total_amount', Number(maxTotal));
      if (sourceFilter === 'landing') q = q.not('landing_page_id', 'is', null);
      else if (sourceFilter === 'website') q = q.is('landing_page_id', null);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      q = q.order('created_at', { ascending: false }).range(from, to);

      const { data, count } = await q;
      return { rows: data || [], count: count || 0 };
    },
  });

  const orders = ordersResult?.rows;
  const totalCount = ordersResult?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
    // Server already applied search/status/source/payment/dates/totals.
    // Wilaya is a joined field, so filter client-side against the current page.
    return (orders || []).filter(o => {
      const wilayaName = (o as any).wilayas?.name;
      return wilayaFilter === 'الكل' || wilayaName === wilayaFilter;
    });
  }, [orders, wilayaFilter]);

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
                  <tr key={o.id} className={`border-b transition-colors ${selectedIds.has(o.id) ? 'bg-primary/5' : statusCfg.row}`}>
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
              <div key={o.id} className={`bg-card ${statusCfg.border} border rounded-xl p-4 space-y-3 transition-colors ${statusCfg.row}`}>
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
                  <div className="flex gap-1 items-center flex-nowrap overflow-x-auto">
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setSelectedOrder(o); setNewStatus(o.status || 'جديد'); }} title={t('common.view')}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {STATUSES.filter(s => s !== o.status).slice(0, 3).map(s => {
                      const cfg = STATUS_CONFIG[s]; const Icon = cfg.icon;
                      return (
                        <Button key={s} variant="outline" size="icon" className={`h-8 w-8 shrink-0 ${cfg.color}`} onClick={() => handleQuickStatus(o.id, s)} title={t(STATUS_KEYS[s])}>
                          <Icon className="w-4 h-4" />
                        </Button>
                      );
                    })}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border z-50">
                        {STATUSES.map(s => { const cfg = STATUS_CONFIG[s]; const Icon = cfg.icon; return (
                          <DropdownMenuItem key={s} onClick={() => handleQuickStatus(o.id, s)} className={`font-cairo gap-2 cursor-pointer ${cfg.color}`}><Icon className="w-4 h-4" /> {t(STATUS_KEYS[s])}</DropdownMenuItem>
                        ); })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Dialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            {selectedOrder && (() => {
              const sc = STATUS_CONFIG[selectedOrder.status || 'جديد'] || STATUS_CONFIG['جديد'];
              const SIcon = sc.icon;
              const phone = selectedOrder.customer_phone || '';
              const waPhone = phone.replace(/\D/g, '');
              return (
                <>
                  <DialogHeader className="p-4 sm:p-6 pb-0">
                    <DialogTitle className="font-cairo flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${sc.bg} ${sc.color}`}>
                        <SIcon className="w-3.5 h-3.5" /> {t(STATUS_KEYS[selectedOrder.status || 'جديد'])}
                      </span>
                      <span>{t('orders.orderDetails')}</span>
                      <span className="font-roboto text-primary">{selectedOrder.order_number}</span>
                    </DialogTitle>
                  </DialogHeader>

                  <Tabs defaultValue="overview" className="w-full p-4 sm:p-6 pt-4">
                    <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto gap-1 bg-muted/50">
                      <TabsTrigger value="overview" className="font-cairo text-xs sm:text-sm gap-1.5 py-2">
                        <Eye className="w-3.5 h-3.5" /> نظرة عامة
                      </TabsTrigger>
                      <TabsTrigger value="customer" className="font-cairo text-xs sm:text-sm gap-1.5 py-2">
                        <User className="w-3.5 h-3.5" /> معلومات العميل
                      </TabsTrigger>
                      <TabsTrigger value="product" className="font-cairo text-xs sm:text-sm gap-1.5 py-2">
                        <Package className="w-3.5 h-3.5" /> تفاصيل المنتج
                      </TabsTrigger>
                      <TabsTrigger value="timeline" className="font-cairo text-xs sm:text-sm gap-1.5 py-2">
                        <Calendar className="w-3.5 h-3.5" /> الجدول الزمني
                      </TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW */}
                    <TabsContent value="overview" className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className={`rounded-xl p-4 flex flex-col items-center justify-center text-center ${sc.bg}`}>
                          <div className={`w-14 h-14 rounded-full ${sc.color} bg-white/70 dark:bg-black/20 flex items-center justify-center mb-2`}>
                            <SIcon className="w-7 h-7" />
                          </div>
                          <p className={`font-cairo font-bold ${sc.color}`}>{t(STATUS_KEYS[selectedOrder.status || 'جديد'])}</p>
                          <p className="font-cairo text-xs text-muted-foreground mt-1">حالة الطلب</p>
                        </div>
                        <div className="rounded-xl p-4 border bg-card">
                          <p className="font-cairo text-xs text-muted-foreground mb-1">رقم الطلب</p>
                          <p className="font-roboto font-bold text-primary text-lg">{selectedOrder.order_number}</p>
                          <p className="font-cairo text-xs text-muted-foreground mt-3 mb-1">تاريخ الإنشاء</p>
                          <p className="font-cairo text-sm">{formatDate(selectedOrder.created_at)}</p>
                        </div>
                        <div className="rounded-xl p-4 border bg-card">
                          <p className="font-cairo text-xs text-muted-foreground mb-1">المبلغ الإجمالي</p>
                          <p className="font-roboto font-bold text-primary text-xl">{formatPrice(Number(selectedOrder.total_amount))}</p>
                          <p className="font-cairo text-xs text-muted-foreground mt-3 mb-1">طريقة الدفع</p>
                          <p className="font-cairo text-sm">{selectedOrder.payment_method === 'baridimob' ? t('orders.baridimob') : selectedOrder.payment_method === 'flexy' ? t('orders.flexy') : selectedOrder.payment_method === 'cod' ? t('orders.cod') : selectedOrder.payment_method || '—'}</p>
                        </div>
                      </div>

                      <div className="border rounded-xl p-4 space-y-2">
                        <div className="flex justify-between font-cairo text-sm">
                          <span className="text-muted-foreground">{t('orders.subtotal')}</span>
                          <span className="font-roboto">{formatPrice(Number(selectedOrder.subtotal))}</span>
                        </div>
                        <div className="flex justify-between font-cairo text-sm">
                          <span className="text-muted-foreground">{t('orders.shipping')}</span>
                          <span className="font-roboto">{formatPrice(Number(selectedOrder.shipping_cost))}</span>
                        </div>
                        {Number(selectedOrder.discount_amount) > 0 && (
                          <div className="flex justify-between font-cairo text-sm text-primary">
                            <span>{t('orders.discount')} {selectedOrder.coupon_code && `(${selectedOrder.coupon_code})`}</span>
                            <span className="font-roboto">-{formatPrice(Number(selectedOrder.discount_amount))}</span>
                          </div>
                        )}
                        <hr />
                        <div className="flex justify-between font-cairo font-bold">
                          <span>{t('common.total')}</span>
                          <span className="font-roboto text-primary">{formatPrice(Number(selectedOrder.total_amount))}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                        <div className="flex-1">
                          <Label className="font-cairo">تحديث الحالة</Label>
                          <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger className="font-cairo mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => {
                                const cfg = STATUS_CONFIG[s]; const Icon = cfg.icon;
                                return (
                                  <SelectItem key={s} value={s} className="font-cairo">
                                    <span className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${cfg.color}`} /> {t(STATUS_KEYS[s])}</span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={() => { updateStatus.mutate({ id: selectedOrder.id, status: newStatus }); setSelectedOrder(null); }} disabled={updateStatus.isPending} className="font-cairo">{t('common.save')}</Button>
                      </div>
                    </TabsContent>

                    {/* CUSTOMER */}
                    <TabsContent value="customer" className="mt-4 space-y-3">
                      <div className="border rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-cairo font-bold">{selectedOrder.customer_name}</p>
                            <p className="font-cairo text-xs text-muted-foreground">العميل</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                          <div className="flex items-start gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="font-cairo text-xs text-muted-foreground">الهاتف</p>
                              <p className="font-roboto" dir="ltr">{selectedOrder.customer_phone}</p>
                              <div className="flex gap-2 mt-2">
                                <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-xs font-cairo bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-md hover:bg-emerald-500/20">
                                  <Phone className="w-3 h-3" /> اتصال
                                </a>
                                <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-cairo bg-green-500/10 text-green-600 px-2 py-1 rounded-md hover:bg-green-500/20">
                                  <MessageCircle className="w-3 h-3" /> واتساب
                                </a>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-cairo text-xs text-muted-foreground">الولاية</p>
                              <p className="font-cairo">{(selectedOrder as any).wilayas?.name || '—'}</p>
                            </div>
                          </div>
                          {selectedOrder.address && (
                            <div className="flex items-start gap-2 sm:col-span-2">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="font-cairo text-xs text-muted-foreground">العنوان</p>
                                <p className="font-cairo">{selectedOrder.address}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <Truck className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-cairo text-xs text-muted-foreground">نوع التوصيل</p>
                              <p className="font-cairo">{selectedOrder.delivery_type || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-cairo text-xs text-muted-foreground">طريقة الدفع</p>
                              <p className="font-cairo">{selectedOrder.payment_method === 'baridimob' ? t('orders.baridimob') : selectedOrder.payment_method === 'flexy' ? t('orders.flexy') : selectedOrder.payment_method === 'cod' ? t('orders.cod') : selectedOrder.payment_method || '—'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* PRODUCT */}
                    <TabsContent value="product" className="mt-4 space-y-3">
                      <div className="border rounded-xl overflow-hidden">
                        <div className="bg-muted/50 px-4 py-2 font-cairo font-semibold text-sm flex items-center gap-2">
                          <Package className="w-4 h-4" /> {t('orders.items')} ({orderItems?.length || 0})
                        </div>
                        <div className="divide-y">
                          {orderItems?.map((item: any) => (
                            <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-cairo truncate">{item.products?.name || '—'}</p>
                                <p className="font-cairo text-xs text-muted-foreground">الكمية: {item.quantity} × <span className="font-roboto">{formatPrice(Number(item.unit_price))}</span></p>
                              </div>
                              <p className="font-roboto font-bold text-primary shrink-0">{formatPrice(Number(item.unit_price) * item.quantity)}</p>
                            </div>
                          )) || <div className="p-4 text-center text-sm text-muted-foreground font-cairo">لا توجد منتجات</div>}
                        </div>
                      </div>
                      {selectedOrder.payment_receipt_url && (
                        <div className="border rounded-xl p-3 space-y-2">
                          <a href={selectedOrder.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary font-cairo hover:underline text-sm">
                            <ExternalLink className="w-3 h-3" /> عرض إيصال الدفع
                          </a>
                          <img src={selectedOrder.payment_receipt_url} alt="إيصال الدفع" className="max-w-full max-h-64 rounded-lg border object-contain" />
                        </div>
                      )}
                    </TabsContent>

                    {/* TIMELINE */}
                    <TabsContent value="timeline" className="mt-4">
                      <div className="border rounded-xl p-4">
                        <ol className="relative border-r-2 border-muted pr-5 space-y-5">
                          <li className="relative">
                            <span className="absolute -right-[27px] top-0 w-4 h-4 rounded-full bg-sky-500 ring-4 ring-sky-500/20" />
                            <p className="font-cairo font-semibold text-sm">تم إنشاء الطلب</p>
                            <p className="font-cairo text-xs text-muted-foreground">{formatDate(selectedOrder.created_at)}</p>
                          </li>
                          {selectedOrder.updated_at && selectedOrder.updated_at !== selectedOrder.created_at && (
                            <li className="relative">
                              <span className={`absolute -right-[27px] top-0 w-4 h-4 rounded-full ring-4 ${sc.color.replace('text-', 'bg-')} ring-current/20`} />
                              <p className="font-cairo font-semibold text-sm flex items-center gap-2">
                                <SIcon className={`w-4 h-4 ${sc.color}`} /> الحالة الحالية: {t(STATUS_KEYS[selectedOrder.status || 'جديد'])}
                              </p>
                              <p className="font-cairo text-xs text-muted-foreground">{formatDate(selectedOrder.updated_at)}</p>
                            </li>
                          )}
                        </ol>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              );
            })()}
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

        
      </div>
    </TooltipProvider>
  );
}
