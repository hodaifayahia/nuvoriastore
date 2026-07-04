import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Star, X, Upload, ImageIcon, Loader2, Package, Search, Copy, Download, FileUp, ChevronLeft, ChevronRight, DollarSign, Tag, CheckSquare, ExternalLink, PackageX, AlertTriangle, EyeOff, Layers } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { useCategories } from '@/hooks/useCategories';
import { useBrands } from '@/hooks/useBrands';
import { useTranslation } from '@/i18n';

const ITEMS_PER_PAGE = 10;

export default function AdminProductsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: categoriesData } = useCategories();
  const { data: brandsData } = useBrands();
  const categoryNames = categoriesData?.map(c => c.name) || [];
  const brandNames = brandsData?.map(b => b.name) || [];
  const importRef = useRef<HTMLInputElement>(null);

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPriceDialog, setBulkPriceDialog] = useState(false);
  const [bulkCategoryDialog, setBulkCategoryDialog] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Best sellers query
  const { data: bestSellersData } = useQuery({
    queryKey: ['best-sellers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('order_items')
        .select('product_id, quantity');
      if (!data) return {};
      const map: Record<string, number> = {};
      data.forEach(item => {
        map[item.product_id] = (map[item.product_id] || 0) + item.quantity;
      });
      return map;
    },
  });

  // KPI calculations
  const kpis = useMemo(() => {
    const all = products || [];
    return {
      total: all.length,
      outOfStock: all.filter(p => (p.stock ?? 0) <= 0).length,
      lowStock: all.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length,
      hidden: all.filter(p => !p.is_active).length,
    };
  }, [products]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') {
          throw new Error('لا يمكن حذف هذا المنتج لأنه مرتبط بطلبيات. يرجى تطبيق آخر تحديث لقاعدة البيانات (migration) أو إخفاء المنتج بدلاً من حذفه.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'تم حذف المنتج ✅' });
    },
    onError: (error: any) => {
      toast({ title: 'خطأ في الحذف', description: error.message, variant: 'destructive' });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('products').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'تم تحديث الحالة' });
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from('products').update({ is_featured } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: vars.is_featured ? 'تمت إضافته إلى المميزة ⭐' : 'تمت إزالته من المميزة' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (p: any) => {
      const { id, created_at, sku, ...rest } = p;
      const { error } = await supabase.from('products').insert({ ...rest, name: `${rest.name} (نسخة)` });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'تم نسخ المنتج ✅' });
    },
  });

  // Bulk mutations
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) {
        if (error.code === '23503') {
          throw new Error('بعض المنتجات لا يمكن حذفها لأنها مرتبطة بطلبيات. يرجى تطبيق آخر تحديث لقاعدة البيانات.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setSelectedIds(new Set());
      setBulkDeleteDialog(false);
      toast({ title: `تم حذف ${selectedIds.size} منتج ✅` });
    },
    onError: (error: any) => {
      toast({ title: 'خطأ في الحذف', description: error.message, variant: 'destructive' });
    },
  });

  const bulkUpdatePriceMutation = useMutation({
    mutationFn: async ({ ids, price }: { ids: string[]; price: number }) => {
      const { error } = await supabase.from('products').update({ price }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setSelectedIds(new Set());
      setBulkPriceDialog(false);
      setBulkPrice('');
      toast({ title: `تم تحديث السعر لـ ${selectedIds.size} منتج ✅` });
    },
  });

  const bulkUpdateCategoryMutation = useMutation({
    mutationFn: async ({ ids, category }: { ids: string[]; category: string }) => {
      const { error } = await supabase.from('products').update({ category: [category] }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setSelectedIds(new Set());
      setBulkCategoryDialog(false);
      setBulkCategory('');
      toast({ title: `تم تحديث الفئة لـ ${selectedIds.size} منتج ✅` });
    },
  });

  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  const openCreate = () => { setEditingProduct(null); setShowForm(true); };
  const openEdit = (p: any) => { setEditingProduct(p); setShowForm(true); };
  const handleFormClose = () => { setShowForm(false); setEditingProduct(null); };

  // Filtered products with smart tabs
  const filteredProducts = useMemo(() => {
    let list = products || [];

    // Smart tab filtering
    if (activeTab === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      list = list.filter(p => new Date(p.created_at || '') >= sevenDaysAgo);
      list = [...list].sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    } else if (activeTab === 'bestsellers') {
      const sellers = bestSellersData || {};
      list = [...list].sort((a, b) => (sellers[b.id] || 0) - (sellers[a.id] || 0));
      list = list.filter(p => (bestSellersData?.[p.id] || 0) > 0);
    }

    return list.filter(p => {
      const matchSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((p as any).sku && (p as any).sku.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory = filterCategory === 'الكل' || (Array.isArray(p.category) ? p.category.includes(filterCategory) : p.category === filterCategory);
      const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? p.is_active : !p.is_active);
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, searchQuery, filterCategory, filterStatus, activeTab, bestSellersData]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (v: string) => { setter(v); setCurrentPage(1); };

  // Selection helpers
  const allPageSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedIds);
      paginatedProducts.forEach(p => next.delete(p.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginatedProducts.forEach(p => next.add(p.id));
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  // --- Export CSV ---
  const exportCSV = () => {
    if (!products || products.length === 0) return;
    const headers = ['name', 'description', 'price', 'category', 'stock', 'is_active', 'sku'];
    const rows = products.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      p.price,
      `"${Array.isArray(p.category) ? p.category.join(';') : p.category}"`,
      p.stock ?? 0,
      p.is_active ? 'true' : 'false',
      `"${((p as any).sku || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `products-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: `تم تصدير ${products.length} منتج ✅` });
  };

  // --- Import CSV ---
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { toast({ title: 'الملف فارغ', variant: 'destructive' }); return; }
    const rows = lines.slice(1);
    let imported = 0, errors = 0;
    for (const row of rows) {
      try {
        const cols = row.match(/(".*?"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
        if (cols.length < 3) { errors++; continue; }
        const { error } = await supabase.from('products').insert({
          name: cols[0],
          description: cols[1] || '',
          price: Number(cols[2]) || 0,
          category: cols[3] ? cols[3].split(';') : [],
          stock: Number(cols[4]) || 0,
          is_active: cols[5] !== 'false',
        } as any);
        if (error) { errors++; } else { imported++; }
      } catch { errors++; }
    }
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    toast({ title: `تم استيراد ${imported} منتج${errors > 0 ? ` (${errors} أخطاء)` : ''} ✅` });
    e.target.value = '';
  };

  if (showForm) {
    return <ProductForm product={editingProduct} categoryNames={categoryNames} brandNames={brandNames} onClose={handleFormClose} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-cairo font-bold text-2xl text-foreground">{t('products.title')}</h2>
          <p className="font-cairo text-sm text-muted-foreground mt-1">{products?.length || 0} {t('common.product')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCSV} className="font-cairo gap-1.5" size="sm">
            <Download className="w-4 h-4" /> {t('common.export')}
          </Button>
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          <Button variant="outline" onClick={() => importRef.current?.click()} className="font-cairo gap-1.5" size="sm">
            <FileUp className="w-4 h-4" /> {t('common.import')}
          </Button>
          <Button onClick={openCreate} className="font-cairo gap-1.5" size="sm">
            <Plus className="w-4 h-4" /> {t('products.addProduct')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-cairo text-xs text-muted-foreground">{t('products.allProducts')}</p>
              <p className="font-roboto font-bold text-xl text-foreground">{kpis.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <PackageX className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-cairo text-xs text-muted-foreground">{t('products.outOfStock')}</p>
              <p className="font-roboto font-bold text-xl text-foreground">{kpis.outOfStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="font-cairo text-xs text-muted-foreground">{t('products.lowStock')}</p>
              <p className="font-roboto font-bold text-xl text-foreground">{kpis.lowStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <EyeOff className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-cairo text-xs text-muted-foreground">{t('products.hidden')}</p>
              <p className="font-roboto font-bold text-xl text-foreground">{kpis.hidden}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }}>
        <TabsList className="font-cairo">
          <TabsTrigger value="all" className="font-cairo">{t('products.allProducts')}</TabsTrigger>
          <TabsTrigger value="recent" className="font-cairo">{t('products.recentlyAdded')}</TabsTrigger>
          <TabsTrigger value="bestsellers" className="font-cairo">{t('products.bestSellers')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('products.searchPlaceholder')} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10 font-cairo h-10" />
        </div>
        <Select value={filterCategory} onValueChange={handleFilterChange(setFilterCategory)}>
          <SelectTrigger className="w-full sm:w-44 font-cairo h-10"><SelectValue placeholder={t('products.category')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="الكل" className="font-cairo">{t('common.allCategories')}</SelectItem>
            {categoryNames.map(c => <SelectItem key={c} value={c} className="font-cairo">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={handleFilterChange(setFilterStatus)}>
          <SelectTrigger className="w-full sm:w-36 font-cairo h-10"><SelectValue placeholder={t('common.status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-cairo">{t('common.allStatuses')}</SelectItem>
            <SelectItem value="active" className="font-cairo">{t('common.active')}</SelectItem>
            <SelectItem value="inactive" className="font-cairo">{t('common.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions Bar */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
          <CheckSquare className="w-5 h-5 text-primary" />
          <span className="font-cairo text-sm font-medium text-primary">{selectedIds.size} منتج محدد</span>
          <div className="flex flex-wrap gap-2 mr-auto w-full sm:w-auto">
            <Button size="sm" variant="outline" className="font-cairo gap-1.5" onClick={() => { setBulkPrice(''); setBulkPriceDialog(true); }}>
              <DollarSign className="w-3.5 h-3.5" /> تغيير السعر
            </Button>
            <Button size="sm" variant="outline" className="font-cairo gap-1.5" onClick={() => { setBulkCategory(categoryNames[0] || ''); setBulkCategoryDialog(true); }}>
              <Tag className="w-3.5 h-3.5" /> تغيير الفئة
            </Button>
            <Button size="sm" variant="destructive" className="font-cairo gap-1.5" onClick={() => setBulkDeleteDialog(true)}>
              <Trash2 className="w-3.5 h-3.5" /> حذف
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="font-cairo text-xs" onClick={() => setSelectedIds(new Set())}>
            إلغاء التحديد
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 font-cairo text-muted-foreground">جاري التحميل...</div>
      ) : filteredProducts.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-card border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 text-right"><Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} /></th>
                  <th className="p-3 text-right font-cairo font-semibold">{t('products.image')}</th>
                  <th className="p-3 text-right font-cairo font-semibold">{t('products.productName')}</th>
                  <th className="p-3 text-right font-cairo font-semibold">{t('products.sku')}</th>
                  <th className="p-3 text-right font-cairo font-semibold">{t('products.preview')}</th>
                  <th className="p-3 text-right font-cairo font-semibold">{t('common.quantity')}</th>
                  <th className="p-3 text-right font-cairo font-semibold">{t('common.price')}</th>
                  <th className="p-3 text-right font-cairo font-semibold">{t('common.status')}</th>
                  <th className="p-3 text-right font-cairo font-semibold">مميز</th>
                  <th className="p-3 text-right font-cairo font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedProducts.map(p => {
                  const mainIdx = p.main_image_index ?? 0;
                  const mainImage = p.images?.[mainIdx] || p.images?.[0];
                  return (
                    <tr key={p.id} className={`hover:bg-muted/30 transition-colors group ${selectedIds.has(p.id) ? 'bg-primary/5' : ''}`}>
                      <td className="p-3"><Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></td>
                      <td className="p-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                          {mainImage ? <img src={mainImage} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/40" /></div>}
                        </div>
                      </td>
                      <td className="p-3 font-cairo font-medium text-foreground max-w-[200px] truncate">{p.name}</td>
                      <td className="p-3 font-roboto text-muted-foreground text-xs">{(p as any).sku || '—'}</td>
                      <td className="p-3">
                        <a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 inline-flex items-center gap-1 font-cairo text-xs">
                          عرض <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="p-3">
                        <span className={`font-roboto ${(p.stock ?? 0) <= 0 ? 'text-destructive font-bold' : (p.stock ?? 0) <= 5 ? 'text-orange-500 font-semibold' : ''}`}>
                          {p.stock ?? 0}
                        </span>
                      </td>
                      <td className="p-3 font-roboto font-bold text-primary">{formatPrice(Number(p.price))}</td>
                      <td className="p-3">
                        <Switch
                          checked={p.is_active ?? false}
                          onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: p.id, is_active: checked })}
                          disabled={toggleStatusMutation.isPending}
                        />
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => toggleFeaturedMutation.mutate({ id: p.id, is_featured: !(p as any).is_featured })}
                          className="p-1.5 rounded-md hover:bg-amber-500/10 transition-colors"
                          title={(p as any).is_featured ? 'إزالة من المميزة' : 'إضافة إلى المميزة'}
                        >
                          <Star className={`w-5 h-5 ${(p as any).is_featured ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/50'}`} />
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(p)} title="تعديل"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary/10 hover:text-secondary" onClick={() => duplicateMutation.mutate(p)} title="نسخ"><Copy className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteDialog(p.id)} title="حذف"><Trash2 className="w-3.5 h-3.5" /></Button>
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
            {paginatedProducts.map(p => {
              const mainIdx = p.main_image_index ?? 0;
              const mainImage = p.images?.[mainIdx] || p.images?.[0];
              return (
                <div key={p.id} className="bg-card border rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      {mainImage ? <img src={mainImage} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground/40" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-cairo font-medium text-sm truncate">{p.name}</h4>
                      {(p as any).sku && <p className="font-roboto text-xs text-muted-foreground">SKU: {(p as any).sku}</p>}
                      <p className="font-roboto font-bold text-primary text-sm mt-0.5">{formatPrice(Number(p.price))}</p>
                    </div>
                    <Switch
                      checked={p.is_active ?? false}
                      onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: p.id, is_active: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-3">
                      <span className="font-cairo text-xs text-muted-foreground">المخزون: <span className="font-roboto font-bold">{p.stock}</span></span>
                      <a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-cairo inline-flex items-center gap-1">
                        عرض <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex gap-1 items-center">
                      <button
                        type="button"
                        onClick={() => toggleFeaturedMutation.mutate({ id: p.id, is_featured: !(p as any).is_featured })}
                        className="p-1.5 rounded-md hover:bg-amber-500/10"
                        title="مميز"
                      >
                        <Star className={`w-4 h-4 ${(p as any).is_featured ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/50'}`} />
                      </button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => duplicateMutation.mutate(p)}><Copy className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteDialog(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <span className="font-cairo text-sm text-muted-foreground">
                صفحة {currentPage} من {totalPages} ({filteredProducts.length} منتج)
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, idx, arr) => (
                    <span key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-muted-foreground">...</span>}
                      <Button
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 font-roboto text-xs"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    </span>
                  ))}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-card border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-cairo text-muted-foreground font-medium">لا توجد منتجات بعد</p>
          <Button onClick={openCreate} variant="outline" className="font-cairo mt-4 gap-1">
            <Plus className="w-4 h-4" /> إضافة أول منتج
          </Button>
        </div>
      )}

      {/* Delete single confirmation */}
      <Dialog open={deleteDialog !== null} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-cairo text-center">حذف المنتج</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <p className="font-cairo text-muted-foreground">هل أنت متأكد من حذف هذا المنتج؟</p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => setDeleteDialog(null)} className="font-cairo px-6">إلغاء</Button>
              <Button variant="destructive" onClick={() => { if (deleteDialog) { deleteMutation.mutate(deleteDialog); setDeleteDialog(null); } }} className="font-cairo px-6">حذف</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-cairo text-center">حذف {selectedIds.size} منتج</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <p className="font-cairo text-muted-foreground">هل أنت متأكد من حذف {selectedIds.size} منتج محدد؟</p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => setBulkDeleteDialog(false)} className="font-cairo px-6">إلغاء</Button>
              <Button variant="destructive" onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))} disabled={bulkDeleteMutation.isPending} className="font-cairo px-6">
                {bulkDeleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حذف الكل'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Price Dialog */}
      <Dialog open={bulkPriceDialog} onOpenChange={setBulkPriceDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-cairo text-center">تغيير سعر {selectedIds.size} منتج</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="font-cairo">السعر الجديد (دج)</Label>
              <Input type="number" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} className="font-roboto mt-1.5" placeholder="0" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBulkPriceDialog(false)} className="font-cairo">إلغاء</Button>
              <Button onClick={() => bulkUpdatePriceMutation.mutate({ ids: Array.from(selectedIds), price: Number(bulkPrice) })} disabled={!bulkPrice || Number(bulkPrice) <= 0 || bulkUpdatePriceMutation.isPending} className="font-cairo gap-1.5">
                {bulkUpdatePriceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                تطبيق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Category Dialog */}
      <Dialog open={bulkCategoryDialog} onOpenChange={setBulkCategoryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-cairo text-center">تغيير فئة {selectedIds.size} منتج</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="font-cairo">الفئة الجديدة</Label>
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="font-cairo mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryNames.map(c => <SelectItem key={c} value={c} className="font-cairo">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBulkCategoryDialog(false)} className="font-cairo">إلغاء</Button>
              <Button onClick={() => bulkUpdateCategoryMutation.mutate({ ids: Array.from(selectedIds), category: bulkCategory })} disabled={!bulkCategory || bulkUpdateCategoryMutation.isPending} className="font-cairo gap-1.5">
                {bulkUpdateCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                تطبيق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Cartesian product helper ─── */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap(combo => arr.map(val => [...combo, val])),
    [[]]
  );
}

/* ─── Types for option groups ─── */
interface OptionGroupState {
  id?: string; // DB id if editing existing
  name: string;
  displayType: string;
  values: { id?: string; label: string; colorHex: string }[];
}

interface VariantRow {
  id?: string; // DB id if editing existing
  comboKey: string; // serialized option values for matching
  optionValues: Record<string, string>; // { "اللون": "أحمر", "المقاس": "XL" }
  sku: string;
  price: string;
  quantity: string;
  imageUrl: string;
  isActive: boolean;
}

/* ─── Product Form (full page) ─── */

function ProductForm({ product, categoryNames, brandNames, onClose }: { product: any; categoryNames: string[]; brandNames: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [sku, setSku] = useState(product?.sku || '');
  const [category, setCategory] = useState(product ? (Array.isArray(product.category) ? product.category[0] : product.category) : categoryNames[0] || '');
  const [brand, setBrand] = useState<string>(product?.brand || '');
  const [stock, setStock] = useState(product ? String(product.stock) : '0');
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [mainImageIndex, setMainImageIndex] = useState<number>(product?.main_image_index ?? 0);
  const [uploading, setUploading] = useState(false);
  const [productType, setProductType] = useState<string>((product as any)?.product_type || 'physical');

  // New fields
  const [oldPrice, setOldPrice] = useState(product?.old_price ? String(product.old_price) : '');
  const [shortDescription, setShortDescription] = useState(product?.short_description || '');
  const [isFreeShipping, setIsFreeShipping] = useState(product?.is_free_shipping ?? false);
  const [slug, setSlug] = useState(product?.slug || '');
  const [offerTitle, setOfferTitle] = useState((product as any)?.offer_title || '');
  const [offerEndsAt, setOfferEndsAt] = useState((product as any)?.offer_ends_at ? new Date((product as any).offer_ends_at).toISOString().slice(0, 16) : '');

  // Bundle offers
  type Offer = { description: string; quantity: string; price: string };
  const [offers, setOffers] = useState<Offer[]>([]);

  // Load existing offers
  const { data: existingOffers } = useQuery({
    queryKey: ['product-offers', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data } = await supabase.from('product_offers').select('*').eq('product_id', product.id).order('position');
      return data || [];
    },
    enabled: !!product?.id,
  });

  // Sync existing offers into state
  useMemo(() => {
    if (existingOffers && existingOffers.length > 0 && offers.length === 0) {
      setOffers(existingOffers.map((o: any) => ({ description: o.description, quantity: String(o.quantity), price: String(o.price) })));
    }
  }, [existingOffers]);

  const addOffer = () => setOffers(prev => [...prev, { description: '', quantity: '2', price: '' }]);
  const removeOffer = (idx: number) => setOffers(prev => prev.filter((_, i) => i !== idx));
  const updateOffer = (idx: number, field: keyof Offer, value: string) => {
    setOffers(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  };

  // ─── NEW: Option Groups + Variants ───
  const [optionGroups, setOptionGroups] = useState<OptionGroupState[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [newValueInputs, setNewValueInputs] = useState<Record<number | string, string>>({});
  const [variantImagePicker, setVariantImagePicker] = useState<number | null>(null); // which variant row is picking an image
  const variantImageInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch variation library ───
  const { data: variationLibrary } = useQuery({
    queryKey: ['variation-options-library'],
    queryFn: async () => {
      const { data } = await supabase
        .from('variation_options')
        .select('*')
        .eq('is_active', true)
        .order('variation_type')
        .order('variation_value');
      return data || [];
    },
  });

  const variationTypes = useMemo(() => {
    if (!variationLibrary) return [];
    const types = [...new Set(variationLibrary.map(v => v.variation_type))];
    return types;
  }, [variationLibrary]);

  const isColorType = (type: string) => {
    const tt = type.toLowerCase();
    return tt.includes('لون') || tt.includes('color') || tt.includes('colour');
  };

  const handleVariationTypeSelect = (gIdx: number, selectedType: string) => {
    if (selectedType === '__custom__') {
      const newGroups = optionGroups.map((g, i) =>
        i === gIdx ? { ...g, name: '', displayType: 'button', values: [] } : g
      );
      setOptionGroups(newGroups);
      regenerateVariants(newGroups);
      return;
    }
    const libraryValues = (variationLibrary || []).filter(v => v.variation_type === selectedType);
    const displayType = isColorType(selectedType) ? 'color_swatch' : 'button';
    const values = libraryValues.map(v => ({
      label: v.variation_value,
      colorHex: v.color_code || '',
    }));
    const newGroups = optionGroups.map((g, i) =>
      i === gIdx ? { ...g, name: selectedType, displayType, values } : g
    );
    setOptionGroups(newGroups);
    regenerateVariants(newGroups);
  };

  // Load existing option groups, values, and variants
  const { data: existingOptionGroups } = useQuery({
    queryKey: ['product-option-groups', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data: groups } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', product.id)
        .order('position');
      if (!groups || groups.length === 0) return [];

      const { data: values } = await supabase
        .from('product_option_values')
        .select('*')
        .in('option_group_id', groups.map(g => g.id))
        .order('position');

      return groups.map(g => ({
        id: g.id,
        name: g.name,
        displayType: g.display_type,
        values: (values || [])
          .filter(v => v.option_group_id === g.id)
          .map(v => ({ id: v.id, label: v.label, colorHex: v.color_hex || '' })),
      })) as OptionGroupState[];
    },
    enabled: !!product?.id,
  });

  const { data: existingVariants } = useQuery({
    queryKey: ['product-variants', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at');
      return data || [];
    },
    enabled: !!product?.id,
  });

  // Sync existing data into state
  useMemo(() => {
    if (existingOptionGroups && existingOptionGroups.length > 0 && optionGroups.length === 0) {
      setOptionGroups(existingOptionGroups);
    }
  }, [existingOptionGroups]);

  useMemo(() => {
    if (existingVariants && existingVariants.length > 0 && variantRows.length === 0 && optionGroups.length > 0) {
      setVariantRows(existingVariants.map((v: any) => ({
        id: v.id,
        comboKey: JSON.stringify(v.option_values || {}),
        optionValues: v.option_values || {},
        sku: v.sku || '',
        price: String(v.price),
        quantity: String(v.quantity),
        imageUrl: v.image_url || '',
        isActive: v.is_active ?? true,
      })));
    }
  }, [existingVariants, optionGroups]);

  // Regenerate variant matrix when option groups change
  const regenerateVariants = (groups: OptionGroupState[]) => {
    const validGroups = groups.filter(g => g.values.length > 0);
    if (validGroups.length === 0) {
      setVariantRows([]);
      return;
    }

    const valueArrays = validGroups.map(g => g.values.map(v => ({ groupName: g.name, label: v.label })));
    const combos = cartesianProduct(valueArrays);

    if (combos.length > 100) {
      toast({ title: `عدد المتغيرات (${combos.length}) يتجاوز الحد الأقصى (100)`, variant: 'destructive' });
      return;
    }

    const newRows: VariantRow[] = combos.map(combo => {
      const optionValues: Record<string, string> = {};
      combo.forEach(c => { optionValues[c.groupName] = c.label; });
      const comboKey = JSON.stringify(optionValues);

      // Try to match existing variant
      const existing = variantRows.find(v => v.comboKey === comboKey);
      if (existing) return existing;

      return {
        comboKey,
        optionValues,
        sku: '',
        price: price || '0',
        quantity: '0',
        imageUrl: '',
        isActive: true,
      };
    });

    setVariantRows(newRows);
  };

  // Option group management
  const addOptionGroup = () => {
    if (optionGroups.length >= 3) return;
    const newGroups = [...optionGroups, { name: '', displayType: 'button', values: [] }];
    setOptionGroups(newGroups);
  };

  const removeOptionGroup = (idx: number) => {
    const newGroups = optionGroups.filter((_, i) => i !== idx);
    setOptionGroups(newGroups);
    regenerateVariants(newGroups);
  };

  const updateOptionGroup = (idx: number, field: keyof OptionGroupState, value: any) => {
    const newGroups = optionGroups.map((g, i) => i === idx ? { ...g, [field]: value } : g);
    setOptionGroups(newGroups);
  };

  const addValueToGroup = (groupIdx: number, label: string) => {
    if (!label.trim()) return;
    const group = optionGroups[groupIdx];
    if (group.values.length >= 20) {
      toast({ title: 'الحد الأقصى 20 قيمة لكل مجموعة', variant: 'destructive' });
      return;
    }
    if (group.values.some(v => v.label === label.trim())) {
      toast({ title: 'هذه القيمة موجودة بالفعل', variant: 'destructive' });
      return;
    }
    const newGroups = optionGroups.map((g, i) =>
      i === groupIdx ? { ...g, values: [...g.values, { label: label.trim(), colorHex: '' }] } : g
    );
    setOptionGroups(newGroups);
    regenerateVariants(newGroups);
    setNewValueInputs(prev => ({ ...prev, [groupIdx]: '' }));
  };

  const removeValueFromGroup = (groupIdx: number, valueIdx: number) => {
    const newGroups = optionGroups.map((g, i) =>
      i === groupIdx ? { ...g, values: g.values.filter((_, vi) => vi !== valueIdx) } : g
    );
    setOptionGroups(newGroups);
    regenerateVariants(newGroups);
  };

  const updateValueColor = (groupIdx: number, valueIdx: number, color: string) => {
    const newGroups = optionGroups.map((g, i) =>
      i === groupIdx ? {
        ...g,
        values: g.values.map((v, vi) => vi === valueIdx ? { ...v, colorHex: color } : v),
      } : g
    );
    setOptionGroups(newGroups);
  };

  const updateVariantRow = (rowIdx: number, field: keyof VariantRow, value: any) => {
    setVariantRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [field]: value } : r));
  };

  const autoGenerateSKUs = () => {
    const baseSku = sku.trim() || 'PRD';
    setVariantRows(prev => prev.map(r => ({
      ...r,
      sku: `${baseSku}-${Object.values(r.optionValues).join('-')}`.slice(0, 100),
    })));
  };

  // Variant image upload
  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || variantImagePicker === null) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'حجم الصورة كبير جداً (الحد الأقصى 5MB)', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('products').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('products').getPublicUrl(path);
      const newUrl = data.publicUrl;
      // Also add to product images gallery
      setImages(prev => [...prev, newUrl]);
      updateVariantRow(variantImagePicker, 'imageUrl', newUrl);
      setVariantImagePicker(null);
      toast({ title: 'تم رفع صورة المتغير ✅' });
    } catch {
      toast({ title: 'فشل رفع الصورة', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ─── Save ───
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('اسم المنتج مطلوب');
      if (!price || Number(price) <= 0) throw new Error('السعر مطلوب');

      const hasVariants = optionGroups.length > 0 && optionGroups.some(g => g.values.length > 0);

      const payload: any = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        category: [category],
        brand: brand || null,
        stock: hasVariants ? variantRows.reduce((sum, v) => sum + Number(v.quantity || 0), 0) : (productType === 'digital' ? 99999 : Number(stock)),
        is_active: isActive,
        images,
        main_image_index: mainImageIndex,
        sku: sku.trim() || null,
        old_price: oldPrice ? Number(oldPrice) : null,
        short_description: shortDescription.trim() || null,
        is_free_shipping: productType === 'digital' ? true : isFreeShipping,
        slug: slug.trim() || null,
        has_variants: hasVariants,
        product_type: productType,
        offer_title: offerTitle.trim() || null,
        offer_ends_at: offerEndsAt ? new Date(offerEndsAt).toISOString() : null,
      } as any;

      let productId = product?.id;

      if (product) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;
        productId = data.id;
      }

      if (!productId) throw new Error('خطأ في حفظ المنتج');

      // Sync option groups + values
      // Delete old ones first
      await supabase.from('product_option_groups').delete().eq('product_id', productId);

      if (hasVariants) {
        for (let i = 0; i < optionGroups.length; i++) {
          const group = optionGroups[i];
          if (group.values.length === 0) continue;

          const { data: groupData, error: groupError } = await supabase
            .from('product_option_groups')
            .insert({
              product_id: productId,
              name: group.name,
              display_type: group.displayType,
              position: i,
            })
            .select()
            .single();
          if (groupError) throw groupError;

          const valueInserts = group.values.map((v, vi) => ({
            option_group_id: groupData.id,
            label: v.label,
            color_hex: v.colorHex || null,
            position: vi,
          }));
          const { error: valError } = await supabase.from('product_option_values').insert(valueInserts);
          if (valError) throw valError;
        }
      }

      // Sync product_variants
      await supabase.from('product_variants').delete().eq('product_id', productId);

      if (hasVariants && variantRows.length > 0) {
        const variantInserts = variantRows.map(v => ({
          product_id: productId!,
          sku: v.sku || null,
          price: Number(v.price) || Number(price),
          compare_at_price: null,
          quantity: Number(v.quantity) || 0,
          image_url: v.imageUrl || null,
          is_active: v.isActive,
          option_values: v.optionValues,
        }));
        const { error } = await supabase.from('product_variants').insert(variantInserts);
        if (error) throw error;
      }

      // Sync bundle offers
      await supabase.from('product_offers').delete().eq('product_id', productId);
      const validOffers = offers.filter(o => o.description.trim() && Number(o.quantity) > 0 && Number(o.price) > 0);
      if (validOffers.length > 0) {
        const offerInserts = validOffers.map((o, i) => ({
          product_id: productId!,
          description: o.description.trim(),
          quantity: Number(o.quantity),
          price: Number(o.price),
          position: i,
        }));
        const { error } = await supabase.from('product_offers').insert(offerInserts);
        if (error) throw error;
      }

      // Sync old product_variations (keep backward compat)
      await supabase.from('product_variations').delete().eq('product_id', productId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: product ? 'تم تعديل المنتج ✅' : 'تمت إضافة المنتج ✅' });
      onClose();
    },
    onError: (err: any) => toast({ title: err.message || 'حدث خطأ', variant: 'destructive' }),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const oversized = files.find(f => f.size > 5 * 1024 * 1024);
    if (oversized) { toast({ title: 'حجم الصورة كبير جداً (الحد الأقصى 5MB)', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('products').upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from('products').getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
      setImages(prev => [...prev, ...newUrls]);
      toast({ title: `تم رفع ${newUrls.length} صورة ✅` });
    } catch {
      toast({ title: 'فشل رفع الصور', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (mainImageIndex === index) setMainImageIndex(0);
    else if (mainImageIndex > index) setMainImageIndex(prev => prev - 1);
  };

  const variantComboLabel = (optionValues: Record<string, string>) =>
    Object.values(optionValues).join(' / ');

  return (
    <div className="space-y-6 max-w-4xl w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-cairo font-bold text-2xl text-foreground">
            {product ? 'تعديل المنتج' : 'إضافة منتج جديد'}
          </h2>
          <p className="font-cairo text-sm text-muted-foreground mt-1">
            {product ? 'قم بتعديل بيانات المنتج' : 'أدخل بيانات المنتج الجديد'}
          </p>
        </div>
        <Button variant="outline" onClick={onClose} className="font-cairo">
          ← العودة
        </Button>
      </div>

      {/* Images Section */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-cairo font-semibold text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-primary" />
            </div>
            صور المنتج
          </h3>
          <label className="cursor-pointer">
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            <Button variant="outline" size="sm" className="font-cairo gap-1.5 pointer-events-none" disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'جاري الرفع...' : 'رفع صور'}
            </Button>
          </label>
        </div>

        {images.length > 0 ? (
          <>
            <p className="font-cairo text-xs text-muted-foreground">انقر على النجمة لاختيار الصورة الرئيسية</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((url, idx) => (
                <div key={idx} className={`relative group rounded-xl overflow-hidden border-2 transition-all ${idx === mainImageIndex ? 'border-primary shadow-md' : 'border-transparent hover:border-muted-foreground/20'}`}>
                  <div className="aspect-square bg-muted">
                    <img src={url} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                  {idx === mainImageIndex && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-cairo px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> رئيسية
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/20 md:bg-foreground/0 md:group-hover:bg-foreground/30 transition-colors flex items-center justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    {idx !== mainImageIndex && (
                      <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full shadow-lg" onClick={() => setMainImageIndex(idx)} title="تعيين كصورة رئيسية">
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="destructive" className="h-9 w-9 rounded-full shadow-lg" onClick={() => removeImage(idx)} title="حذف الصورة">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl py-12 text-center">
            <ImageIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-cairo text-muted-foreground text-sm">لا توجد صور — ارفع صوراً للمنتج</p>
            <p className="font-cairo text-muted-foreground/60 text-xs mt-1">JPG, PNG — الحد الأقصى 5MB لكل صورة</p>
          </div>
        )}
      </div>

      {/* Product Type Selector */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <h3 className="font-cairo font-semibold text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary" />
          </div>
          نوع المنتج
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setProductType('physical')}
            className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${productType === 'physical' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
          >
            <Package className={`w-6 h-6 ${productType === 'physical' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="font-cairo font-semibold text-sm">منتج مادي</span>
            <span className="font-cairo text-xs text-muted-foreground">يتطلب شحن وتوصيل</span>
          </button>
          <button
            type="button"
            onClick={() => setProductType('digital')}
            className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${productType === 'digital' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
          >
            <Layers className={`w-6 h-6 ${productType === 'digital' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="font-cairo font-semibold text-sm">منتج رقمي</span>
            <span className="font-cairo text-xs text-muted-foreground">تسليم فوري بدون شحن</span>
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <h3 className="font-cairo font-semibold text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary" />
          </div>
          البيانات الأساسية
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="font-cairo">اسم المنتج <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="font-cairo mt-1.5 h-11" placeholder="مثال: ساعة يد كلاسيكية" />
            </div>
            <div>
              <Label className="font-cairo">رمز المنتج (SKU)</Label>
              <Input value={sku} onChange={e => setSku(e.target.value)} className="font-roboto mt-1.5 h-11" placeholder="مثال: FW01" />
            </div>
          </div>
          <div>
            <Label className="font-cairo">رابط المنتج (Slug)</Label>
            <Input
              value={slug}
              onChange={e => setSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
              className="font-roboto mt-1.5 h-11 text-left"
              dir="ltr"
              placeholder="product-name"
            />
            <p className="font-cairo text-xs text-muted-foreground mt-1">/product/{slug || 'your-slug'} — حروف لاتينية وأرقام وشرطات فقط</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="font-cairo">الفئة</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="font-cairo mt-1.5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryNames.map(c => <SelectItem key={c} value={c} className="font-cairo">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-cairo">العلامة التجارية</Label>
              <Select value={brand || '__none__'} onValueChange={v => setBrand(v === '__none__' ? '' : v)}>
                <SelectTrigger className="font-cairo mt-1.5 h-11"><SelectValue placeholder="بدون علامة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="font-cairo text-muted-foreground">بدون علامة</SelectItem>
                  {brandNames.map(b => <SelectItem key={b} value={b} className="font-cairo">{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-1 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label className="font-cairo">{isActive ? 'نشط — يظهر في المتجر' : 'معطّل — مخفي'}</Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <h3 className="font-cairo font-semibold text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          الوصف
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="font-cairo">وصف قصير</Label>
            <Input
              value={shortDescription}
              onChange={e => setShortDescription(e.target.value.slice(0, 200))}
              className="font-cairo mt-1.5 h-11"
              placeholder="وصف مختصر يظهر تحت اسم المنتج..."
            />
            <p className="font-cairo text-xs text-muted-foreground mt-1">{shortDescription.length}/200</p>
          </div>
          <div>
            <Label className="font-cairo">وصف تفصيلي</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="font-cairo mt-1.5 min-h-[100px]" placeholder="أضف وصفاً تفصيلياً للمنتج..." />
          </div>
        </div>
      </div>

      {/* Pricing & Stock Section */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <h3 className="font-cairo font-semibold text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          التسعير والمخزون
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="font-cairo">السعر الحالي (دج) <span className="text-destructive">*</span></Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="font-roboto mt-1.5 h-11" placeholder="0" />
            </div>
            <div>
              <Label className="font-cairo">السعر القديم (دج)</Label>
              <Input type="number" value={oldPrice} onChange={e => setOldPrice(e.target.value)} className="font-roboto mt-1.5 h-11" placeholder="يظهر كسعر مشطوب" />
              {oldPrice && price && Number(oldPrice) <= Number(price) && (
                <p className="font-cairo text-xs text-destructive mt-1">⚠ السعر القديم يجب أن يكون أكبر من السعر الحالي</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {optionGroups.length === 0 && productType !== 'digital' && (
              <div>
                <Label className="font-cairo">المخزون</Label>
                <Input type="number" value={stock} onChange={e => setStock(e.target.value)} className="font-roboto mt-1.5 h-11" placeholder="0" />
              </div>
            )}
            {productType !== 'digital' && (
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch checked={isFreeShipping} onCheckedChange={setIsFreeShipping} />
                  <Label className="font-cairo">توصيل مجاني</Label>
                </div>
              </div>
            )}
          </div>
          {productType === 'digital' && (
            <p className="font-cairo text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
              ⚡ المنتجات الرقمية لا تحتاج إلى مخزون أو شحن — يتم التسليم فوراً
            </p>
          )}
          {optionGroups.length > 0 && variantRows.length > 0 && (
            <p className="font-cairo text-xs text-muted-foreground">
              المخزون الإجمالي: <span className="font-roboto font-bold">{variantRows.reduce((s, v) => s + Number(v.quantity || 0), 0)}</span> (يُحسب تلقائياً من المتغيرات)
            </p>
          )}
        </div>
      </div>

      {/* Offer Timer Section */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <h3 className="font-cairo font-semibold text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          عرض محدود بوقت
        </h3>
        <p className="font-cairo text-xs text-muted-foreground">اتركه فارغاً إذا لا يوجد عرض محدد بوقت</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="font-cairo">عنوان العرض</Label>
            <Input value={offerTitle} onChange={e => setOfferTitle(e.target.value)} className="font-cairo mt-1.5 h-11" placeholder="مثال: عرض خاص - خصم 30%" />
          </div>
          <div>
            <Label className="font-cairo">ينتهي في</Label>
            <Input type="datetime-local" value={offerEndsAt} onChange={e => setOfferEndsAt(e.target.value)} className="font-roboto mt-1.5 h-11" dir="ltr" />
          </div>
        </div>
      </div>

      {/* Bundle Offers Section */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-cairo font-semibold text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            عروض الحزم
          </h3>
          <Button variant="outline" size="sm" onClick={addOffer} className="font-cairo gap-1.5" disabled={offers.length >= 5}>
            <Plus className="w-4 h-4" /> إضافة عرض
          </Button>
        </div>

        {offers.length === 0 ? (
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl py-8 text-center">
            <p className="font-cairo text-muted-foreground text-sm">لا توجد عروض حزم — أضف عرضاً لتقديم خصومات على الكميات</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2.5 text-right font-cairo font-medium text-muted-foreground">وصف العرض</th>
                  <th className="p-2.5 text-right font-cairo font-medium text-muted-foreground w-24">الكمية</th>
                  <th className="p-2.5 text-right font-cairo font-medium text-muted-foreground w-32">السعر (دج)</th>
                  <th className="p-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {offers.map((offer, idx) => {
                  const bundleWarning = price && offer.price && offer.quantity && Number(offer.price) >= Number(offer.quantity) * Number(price);
                  return (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="p-2.5">
                        <Input
                          value={offer.description}
                          onChange={e => updateOffer(idx, 'description', e.target.value)}
                          className="font-cairo h-8"
                          placeholder="مثال: قميصان"
                        />
                      </td>
                      <td className="p-2.5">
                        <Input
                          type="number"
                          value={offer.quantity}
                          onChange={e => updateOffer(idx, 'quantity', e.target.value)}
                          className="font-roboto h-8"
                          min="1"
                        />
                      </td>
                      <td className="p-2.5">
                        <Input
                          type="number"
                          value={offer.price}
                          onChange={e => updateOffer(idx, 'price', e.target.value)}
                          className="font-roboto h-8"
                          placeholder="0"
                        />
                        {bundleWarning && (
                          <p className="font-cairo text-xs text-destructive mt-0.5">⚠ السعر أعلى من المجموع</p>
                        )}
                      </td>
                      <td className="p-2.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => removeOffer(idx)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── NEW: Option Groups Builder ─── */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-cairo font-semibold text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Layers className="w-4 h-4 text-secondary" />
            </div>
            خيارات المنتج (ألوان، مقاسات...)
          </h3>
          {optionGroups.length < 3 && (
            <Button variant="outline" size="sm" onClick={addOptionGroup} className="font-cairo gap-1.5">
              <Plus className="w-4 h-4" /> إضافة خيار
            </Button>
          )}
        </div>

        {optionGroups.length === 0 ? (
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl py-8 text-center">
            <Layers className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="font-cairo text-muted-foreground text-sm">لا توجد خيارات — أضف خياراً مثل اللون أو المقاس</p>
            <p className="font-cairo text-muted-foreground/60 text-xs mt-1">سيتم إنشاء المتغيرات تلقائياً من تركيبات الخيارات</p>
          </div>
        ) : (
          <div className="space-y-4">
            {optionGroups.map((group, gIdx) => (
              <div key={gIdx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="font-cairo text-xs">اسم الخيار</Label>
                      {variationTypes.length > 0 ? (
                        <>
                          <Select
                            value={variationTypes.includes(group.name) ? group.name : '__custom__'}
                            onValueChange={v => handleVariationTypeSelect(gIdx, v)}
                          >
                            <SelectTrigger className="font-cairo h-9 mt-1"><SelectValue placeholder="اختر نوع الخيار" /></SelectTrigger>
                            <SelectContent>
                              {variationTypes
                                .filter(vt => !optionGroups.some((g, i) => i !== gIdx && g.name === vt))
                                .map(vt => (
                                  <SelectItem key={vt} value={vt} className="font-cairo">{vt}</SelectItem>
                                ))}
                              <SelectItem value="__custom__" className="font-cairo">خيار مخصص</SelectItem>
                            </SelectContent>
                          </Select>
                          {!variationTypes.includes(group.name) && (
                            <Input
                              value={group.name}
                              onChange={e => updateOptionGroup(gIdx, 'name', e.target.value)}
                              placeholder="مثال: اللون، المقاس"
                              className="font-cairo h-9 mt-1"
                            />
                          )}
                        </>
                      ) : (
                        <Input
                          value={group.name}
                          onChange={e => updateOptionGroup(gIdx, 'name', e.target.value)}
                          placeholder="مثال: اللون، المقاس"
                          className="font-cairo h-9 mt-1"
                        />
                      )}
                    </div>
                    <div>
                      <Label className="font-cairo text-xs">نوع العرض</Label>
                      <Select value={group.displayType} onValueChange={v => updateOptionGroup(gIdx, 'displayType', v)}>
                        <SelectTrigger className="font-cairo h-9 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="button" className="font-cairo">أزرار</SelectItem>
                          <SelectItem value="color_swatch" className="font-cairo">ألوان</SelectItem>
                          <SelectItem value="dropdown" className="font-cairo">قائمة منسدلة</SelectItem>
                          <SelectItem value="radio" className="font-cairo">أزرار راديو</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive shrink-0 mt-1 sm:mt-4" onClick={() => removeOptionGroup(gIdx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Values */}
                <div>
                  <Label className="font-cairo text-xs">القيم</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {group.values.map((val, vIdx) => (
                      <div key={vIdx} className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5">
                        {group.displayType === 'color_swatch' && (
                          <input
                            type="color"
                            value={val.colorHex || '#000000'}
                            onChange={e => updateValueColor(gIdx, vIdx, e.target.value)}
                            className="w-6 h-6 rounded-full border border-border cursor-pointer p-0 appearance-none"
                            style={{ backgroundColor: val.colorHex || '#000000' }}
                          />
                        )}
                        <span className="font-cairo text-sm">{val.label}</span>
                        <button onClick={() => removeValueFromGroup(gIdx, vIdx)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {group.displayType === 'color_swatch' ? (
                      <div className="flex items-center gap-1 w-full sm:w-auto">
                        <input
                          type="color"
                          value={newValueInputs[`color_${gIdx}`] || '#000000'}
                          onChange={e => setNewValueInputs(prev => ({ ...prev, [`color_${gIdx}`]: e.target.value }))}
                          className="w-8 h-8 rounded border border-border cursor-pointer p-0"
                        />
                        <Input
                          value={newValueInputs[gIdx] || ''}
                          onChange={e => setNewValueInputs(prev => ({ ...prev, [gIdx]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const label = (newValueInputs[gIdx] || '').trim();
                              if (!label) return;
                              const colorHex = newValueInputs[`color_${gIdx}`] || '#000000';
                              const group = optionGroups[gIdx];
                              if (group.values.length >= 20) { toast({ title: 'الحد الأقصى 20 قيمة', variant: 'destructive' }); return; }
                              if (group.values.some(v => v.label === label)) { toast({ title: 'هذه القيمة موجودة', variant: 'destructive' }); return; }
                              const newGroups = optionGroups.map((g, i) =>
                                i === gIdx ? { ...g, values: [...g.values, { label, colorHex }] } : g
                              );
                              setOptionGroups(newGroups);
                              regenerateVariants(newGroups);
                              setNewValueInputs(prev => ({ ...prev, [gIdx]: '', [`color_${gIdx}`]: '#000000' }));
                            }
                          }}
                          placeholder="اسم اللون + Enter"
                          className="font-cairo h-8 w-full sm:w-32"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 w-full sm:w-auto">
                        <Input
                          value={newValueInputs[gIdx] || ''}
                          onChange={e => setNewValueInputs(prev => ({ ...prev, [gIdx]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addValueToGroup(gIdx, newValueInputs[gIdx] || '');
                            }
                          }}
                          placeholder="أضف قيمة + Enter"
                          className="font-cairo h-8 w-full sm:w-36"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Variant Matrix Table ─── */}
      {variantRows.length > 0 && (
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-cairo font-semibold text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center">
                <Layers className="w-4 h-4 text-accent-foreground" />
              </div>
              المتغيرات ({variantRows.length})
            </h3>
            <Button variant="outline" size="sm" onClick={autoGenerateSKUs} className="font-cairo gap-1.5">
              <Tag className="w-4 h-4" /> توليد SKU تلقائي
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2.5 text-right font-cairo font-medium text-muted-foreground">المتغير</th>
                  <th className="p-2.5 text-right font-cairo font-medium text-muted-foreground w-16">الصورة</th>
                  <th className="p-2.5 text-right font-cairo font-medium text-muted-foreground w-28">SKU</th>
                  <th className="p-2.5 text-right font-cairo font-medium text-muted-foreground w-28">السعر (دج)</th>
                  <th className="p-2.5 text-right font-cairo font-medium text-muted-foreground w-24">المخزون</th>
                  <th className="p-2.5 text-right font-cairo font-medium text-muted-foreground w-16">نشط</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {variantRows.map((row, idx) => (
                  <tr key={idx} className={`hover:bg-muted/20 ${!row.isActive ? 'opacity-50' : ''}`}>
                    <td className="p-2.5">
                      <span className="font-cairo font-medium text-sm">{variantComboLabel(row.optionValues)}</span>
                    </td>
                    <td className="p-2.5">
                      <div className="relative">
                        {row.imageUrl ? (
                          <div className="w-10 h-10 rounded border border-border overflow-hidden cursor-pointer group relative" onClick={() => setVariantImagePicker(idx)}>
                            <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <Pencil className="w-3 h-3 text-background" />
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setVariantImagePicker(idx)}
                            className="w-10 h-10 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                          >
                            <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <Input
                        value={row.sku}
                        onChange={e => updateVariantRow(idx, 'sku', e.target.value)}
                        className="font-roboto h-8"
                        placeholder="SKU"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        value={row.price}
                        onChange={e => updateVariantRow(idx, 'price', e.target.value)}
                        className="font-roboto h-8"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        value={row.quantity}
                        onChange={e => updateVariantRow(idx, 'quantity', e.target.value)}
                        className="font-roboto h-8"
                        min="0"
                      />
                    </td>
                    <td className="p-2.5">
                      <Switch
                        checked={row.isActive}
                        onCheckedChange={v => updateVariantRow(idx, 'isActive', v)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Variant Image Picker Dialog */}
          <Dialog open={variantImagePicker !== null} onOpenChange={open => { if (!open) setVariantImagePicker(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-cairo text-center">اختر صورة للمتغير</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {images.length > 0 && (
                  <div>
                    <Label className="font-cairo text-sm">اختر من صور المنتج الحالية</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                      {images.map((url, imgIdx) => (
                        <button
                          key={imgIdx}
                          onClick={() => {
                            if (variantImagePicker !== null) {
                              updateVariantRow(variantImagePicker, 'imageUrl', url);
                              setVariantImagePicker(null);
                            }
                          }}
                          className={`aspect-square rounded-lg border-2 overflow-hidden transition-all hover:border-primary ${
                            variantImagePicker !== null && variantRows[variantImagePicker]?.imageUrl === url
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-border'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t pt-3">
                  <input
                    ref={variantImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleVariantImageUpload}
                  />
                  <Button
                    variant="outline"
                    className="w-full font-cairo gap-2"
                    onClick={() => variantImageInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'جاري الرفع...' : 'رفع صورة جديدة'}
                  </Button>
                </div>
                {variantImagePicker !== null && variantRows[variantImagePicker]?.imageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full font-cairo text-destructive hover:text-destructive"
                    onClick={() => {
                      updateVariantRow(variantImagePicker, 'imageUrl', '');
                      setVariantImagePicker(null);
                    }}
                  >
                    <X className="w-4 h-4 ml-1" /> إزالة الصورة
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Button variant="outline" onClick={onClose} className="font-cairo px-6 w-full sm:w-auto">إلغاء</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name.trim() || !price} className="font-cairo px-8 gap-2 w-full sm:w-auto">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saveMutation.isPending ? 'جاري الحفظ...' : product ? 'حفظ التعديلات' : 'إضافة المنتج'}
        </Button>
      </div>
    </div>
  );
}
