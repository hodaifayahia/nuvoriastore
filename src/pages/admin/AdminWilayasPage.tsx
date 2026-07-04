import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Search, MapPin, Building2, Package, Truck, Save, ChevronLeft, Upload, Loader2, Plus, Trash2,
} from 'lucide-react';

import { ALGERIA_WILAYAS } from '@/data/algeria-wilayas';
import { useTranslation } from '@/i18n';

export default function AdminWilayasPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wilayaSearch, setWilayaSearch] = useState('');
  const [baladiyaSearch, setBaladiyaSearch] = useState('');
  const [priceOffice, setPriceOffice] = useState('');
  const [priceHome, setPriceHome] = useState('');
  const [newWilayaName, setNewWilayaName] = useState('');
  const [newBaladiyaName, setNewBaladiyaName] = useState('');


  const { data: wilayas = [] } = useQuery({
    queryKey: ['admin-wilayas'],
    queryFn: async () => {
      const { data } = await supabase.from('wilayas').select('*').order('name');
      return data || [];
    },
  });

  const { data: baladiyat = [] } = useQuery({
    queryKey: ['admin-baladiyat'],
    queryFn: async () => {
      const { data } = await supabase.from('baladiyat').select('*').order('name');
      return data || [];
    },
  });

  // Auto-select first wilaya
  useEffect(() => {
    if (!selectedId && wilayas.length > 0) setSelectedId(wilayas[0].id);
  }, [wilayas, selectedId]);

  const selected = useMemo(() => wilayas.find(w => w.id === selectedId), [wilayas, selectedId]);

  useEffect(() => {
    if (selected) {
      setPriceOffice(String(selected.shipping_price ?? ''));
      setPriceHome(String(selected.shipping_price_home ?? ''));
    }
  }, [selected]);

  // Counts per wilaya
  const baladiyatByWilaya = useMemo(() => {
    const map = new Map<string, { total: number; office: number }>();
    baladiyat.forEach((b: any) => {
      const cur = map.get(b.wilaya_id) || { total: 0, office: 0 };
      cur.total += 1;
      if (b.is_active) cur.office += 1;
      map.set(b.wilaya_id, cur);
    });
    return map;
  }, [baladiyat]);

  const totalBaladiyat = baladiyat.length;
  const totalOffice = baladiyat.filter((b: any) => b.is_active).length;
  const activeWilayas = wilayas.filter(w => w.is_active).length;

  const filteredWilayas = wilayas.filter(w =>
    !wilayaSearch || w.name.toLowerCase().includes(wilayaSearch.toLowerCase())
  );
  const selectedBaladiyat = baladiyat
    .filter((b: any) => b.wilaya_id === selectedId)
    .filter((b: any) => !baladiyaSearch || b.name.toLowerCase().includes(baladiyaSearch.toLowerCase()));

  const savePrices = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await supabase.from('wilayas').update({
        shipping_price: Number(priceOffice) || 0,
        shipping_price_home: Number(priceHome) || 0,
      }).eq('id', selected.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-wilayas'] });
      toast({ title: t('common.savedSuccess') });
    },
  });

  const toggleBaladiya = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      await supabase.from('baladiyat').update({ is_active: val }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-baladiyat'] }),
  });

  const bulkImport = useMutation({
    mutationFn: async () => {
      for (const w of ALGERIA_WILAYAS) {
        const { data: existing } = await supabase.from('wilayas').select('id').eq('name', w.name).maybeSingle();
        let wilayaId: string;
        if (existing) wilayaId = existing.id;
        else {
          const { data: ins } = await supabase.from('wilayas').insert({ name: w.name, shipping_price: 0, shipping_price_home: 0, is_active: true }).select('id').single();
          if (!ins) continue;
          wilayaId = ins.id;
        }
        for (const b of w.baladiyat) {
          const { data: bE } = await supabase.from('baladiyat').select('id').eq('name', b).eq('wilaya_id', wilayaId).maybeSingle();
          if (!bE) await supabase.from('baladiyat').insert({ name: b, wilaya_id: wilayaId, is_active: true });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-wilayas'] });
      qc.invalidateQueries({ queryKey: ['admin-baladiyat'] });
      toast({ title: t('wilayas.imported').replace('{n}', String(ALGERIA_WILAYAS.length)) });
    },
  });

  const addWilaya = useMutation({
    mutationFn: async (name: string) => {
      const n = name.trim();
      if (!n) throw new Error('empty');
      const { data, error } = await supabase.from('wilayas').insert({
        name: n, shipping_price: 0, shipping_price_home: 0, is_active: true,
      }).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-wilayas'] });
      setNewWilayaName('');
      if (data?.id) setSelectedId(data.id);
      toast({ title: 'تمت إضافة الولاية ✅' });
    },
    onError: (e: any) => toast({ title: 'فشل الإضافة', description: e.message, variant: 'destructive' }),
  });

  const deleteWilaya = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('baladiyat').delete().eq('wilaya_id', id);
      const { error } = await supabase.from('wilayas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['admin-wilayas'] });
      qc.invalidateQueries({ queryKey: ['admin-baladiyat'] });
      if (selectedId === id) setSelectedId(null);
      toast({ title: 'تم حذف الولاية' });
    },
    onError: (e: any) => toast({ title: 'فشل الحذف', description: e.message, variant: 'destructive' }),
  });

  const addBaladiya = useMutation({
    mutationFn: async (name: string) => {
      if (!selectedId) throw new Error('no wilaya');
      const n = name.trim();
      if (!n) throw new Error('empty');
      const { error } = await supabase.from('baladiyat').insert({
        name: n, wilaya_id: selectedId, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-baladiyat'] });
      setNewBaladiyaName('');
      toast({ title: 'تمت إضافة البلدية ✅' });
    },
    onError: (e: any) => toast({ title: 'فشل الإضافة', description: e.message, variant: 'destructive' }),
  });

  const deleteBaladiya = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('baladiyat').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-baladiyat'] });
      toast({ title: 'تم حذف البلدية' });
    },
    onError: (e: any) => toast({ title: 'فشل الحذف', description: e.message, variant: 'destructive' }),
  });


  const wilayaIndex = (id: string) => {
    const i = wilayas.findIndex(w => w.id === id);
    return String(i + 1).padStart(2, '0');
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-cairo font-bold text-3xl">مناطق التوصيل</h1>
          <p className="font-cairo text-sm text-muted-foreground mt-1">إدارة أسعار التوصيل</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => bulkImport.mutate()} disabled={bulkImport.isPending} className="font-cairo gap-1">
          {bulkImport.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          استيراد الكل ({ALGERIA_WILAYAS.length})
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="نشطة" value={activeWilayas} icon={<Truck className="w-5 h-5" />} color="bg-orange-100 text-orange-600" />
        <KpiCard label="بمكتب" value={totalOffice} icon={<Package className="w-5 h-5" />} color="bg-violet-100 text-violet-600" />
        <KpiCard label="بلدية" value={totalBaladiyat} icon={<Building2 className="w-5 h-5" />} color="bg-emerald-100 text-emerald-600" />
        <KpiCard label="ولاية" value={wilayas.length} icon={<MapPin className="w-5 h-5" />} color="bg-blue-100 text-blue-600" />
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Wilayas column (right) */}
        <div className="bg-card border rounded-2xl p-4 order-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-cairo font-bold text-lg">الولايات</h3>
            <MapPin className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex gap-2 mb-2">
            <Input
              value={newWilayaName}
              onChange={e => setNewWilayaName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newWilayaName.trim()) addWilaya.mutate(newWilayaName); }}
              placeholder="اسم ولاية جديدة"
              className="font-cairo"
            />
            <Button
              size="icon"
              onClick={() => addWilaya.mutate(newWilayaName)}
              disabled={addWilaya.isPending || !newWilayaName.trim()}
              className="shrink-0"
            >
              {addWilaya.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={wilayaSearch} onChange={e => setWilayaSearch(e.target.value)} placeholder="بحث..." className="pe-9 font-cairo" />
          </div>
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pe-1">
            {filteredWilayas.map((w) => {
              const isActive = w.id === selectedId;
              const counts = baladiyatByWilaya.get(w.id) || { total: 0, office: 0 };
              const idx = wilayaIndex(w.id);
              return (
                <div
                  key={w.id}
                  className={`w-full flex items-center gap-1 rounded-xl transition ${
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <button
                    onClick={() => setSelectedId(w.id)}
                    className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 text-right"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <ChevronLeft className={`w-4 h-4 ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
                      <span className={`font-roboto ${isActive ? 'text-primary-foreground/90' : 'text-foreground'}`}>{counts.total}</span>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-roboto font-bold ${
                        isActive ? 'bg-primary-foreground text-primary' : 'bg-amber-100 text-amber-700'
                      }`}>{counts.office}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-cairo font-semibold text-sm">{w.name}</span>
                      <span className={`font-roboto text-xs ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{idx}</span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`حذف الولاية "${w.name}" وجميع بلدياتها؟`)) deleteWilaya.mutate(w.id);
                    }}
                    className={`p-2 rounded-lg opacity-70 hover:opacity-100 hover:bg-destructive/20 ${isActive ? 'text-primary-foreground' : 'text-destructive'}`}
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {filteredWilayas.length === 0 && (
              <p className="text-center text-sm text-muted-foreground font-cairo py-6">لا توجد نتائج</p>
            )}
          </div>
        </div>

        {/* Prices column (middle) */}
        <div className="bg-card border rounded-2xl p-4 order-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-cairo font-bold text-lg">الأسعار</h3>
            <span className="text-muted-foreground">$</span>
          </div>

          {selected ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 text-right">
                <p className="font-cairo font-bold text-xl">{selected.name}</p>
                <p className="font-cairo text-xs text-muted-foreground mt-1">الولاية {wilayaIndex(selected.id)}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <label className="font-cairo text-sm font-semibold">للمنزل</label>
                </div>
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-roboto text-muted-foreground">DA</span>
                  <Input
                    type="number"
                    value={priceHome}
                    onChange={e => setPriceHome(e.target.value)}
                    className="text-right font-roboto pe-3 ps-12"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <label className="font-cairo text-sm font-semibold">للمكتب</label>
                </div>
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-roboto text-muted-foreground">DA</span>
                  <Input
                    type="number"
                    value={priceOffice}
                    onChange={e => setPriceOffice(e.target.value)}
                    className="text-right font-roboto pe-3 ps-12"
                  />
                </div>
              </div>

              <Button
                onClick={() => savePrices.mutate()}
                disabled={savePrices.isPending}
                className="w-full font-cairo font-semibold gap-2"
              >
                {savePrices.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground font-cairo py-12">اختر ولاية</p>
          )}
        </div>

        {/* Baladiyat column (left) */}
        <div className="bg-card border rounded-2xl p-4 order-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-cairo font-bold text-lg">البلديات</h3>
            <Building2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex gap-2 mb-2">
            <Input
              value={newBaladiyaName}
              onChange={e => setNewBaladiyaName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newBaladiyaName.trim() && selectedId) addBaladiya.mutate(newBaladiyaName); }}
              placeholder={selectedId ? 'اسم بلدية جديدة' : 'اختر ولاية أولاً'}
              disabled={!selectedId}
              className="font-cairo"
            />
            <Button
              size="icon"
              onClick={() => addBaladiya.mutate(newBaladiyaName)}
              disabled={addBaladiya.isPending || !selectedId || !newBaladiyaName.trim()}
              className="shrink-0"
            >
              {addBaladiya.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={baladiyaSearch} onChange={e => setBaladiyaSearch(e.target.value)} placeholder="بحث..." className="pe-9 font-cairo" />
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pe-1">
            {selectedBaladiyat.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border bg-background">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { if (confirm(`حذف البلدية "${b.name}"؟`)) deleteBaladiya.mutate(b.id); }}
                    className="p-1.5 rounded-lg text-destructive opacity-70 hover:opacity-100 hover:bg-destructive/10"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Switch checked={!!b.is_active} onCheckedChange={(v) => toggleBaladiya.mutate({ id: b.id, val: v })} />
                  <span className="font-cairo text-xs text-muted-foreground">مكتب</span>
                </div>
                <div className="text-right">
                  <p className="font-cairo font-semibold text-sm">{b.name}</p>
                  <p className="font-cairo text-[10px] text-muted-foreground mt-0.5">
                    {b.is_active ? 'مكتب متاح' : 'منزل فقط'}
                  </p>
                </div>
              </div>
            ))}
            {selectedBaladiyat.length === 0 && (
              <p className="text-center text-sm text-muted-foreground font-cairo py-6">لا توجد بلديات</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-card border rounded-2xl p-4 flex items-center justify-between">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="text-right">
        <p className="font-roboto font-bold text-2xl leading-none">{value}</p>
        <p className="font-cairo text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}
