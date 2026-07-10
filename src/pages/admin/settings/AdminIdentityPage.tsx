import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Upload, X, ImageIcon, Plus, Palette, Megaphone, SlidersHorizontal, Trash2, MessageCircle } from 'lucide-react';
import { useAdminSettings } from '@/hooks/useAdminSettings';

export default function AdminIdentityPage() {
  const {
    isLoading, mergedSettings, form, updateSetting, handleSave, setField,
    handleImageUpload, removeImage, uploading, setUploading,
    faviconUploading, setFaviconUploading, slideUploading,
    logoInputRef, faviconInputRef, heroSlideInputRef,
    heroSlides, handleSlideUpload, removeSlide, updateSlideLink,
  } = useAdminSettings();

  if (isLoading) return null;

  const currentLogo = mergedSettings.store_logo;
  const currentFavicon = mergedSettings.store_favicon;
  const primaryColor = mergedSettings.primary_color || '#184ABF';
  const secondaryColor = mergedSettings.secondary_color || '#0F2E7A';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Store Name */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="font-cairo font-bold text-xl">اسم المتجر</h2>
        <Input value={mergedSettings.store_name || ''} onChange={e => setField('store_name', e.target.value)} className="font-cairo" />
      </div>

      {/* Store Logo */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="font-cairo font-bold text-xl">شعار المتجر</h2>
        <p className="font-cairo text-sm text-muted-foreground">800×800 بيكسل — الحد الأقصى 2MB — PNG, JPG</p>
        <div className="flex items-center gap-4">
          {currentLogo ? (
            <div className="relative group">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-primary/30 overflow-hidden bg-muted flex items-center justify-center">
                <img src={currentLogo} alt="شعار المتجر" className="w-full h-full object-contain p-1" />
              </div>
              <button onClick={() => removeImage('store_logo')} className="absolute -top-2 -left-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
              <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
          <div>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={e => handleImageUpload(e, 'store_logo', setUploading)} />
            <Button variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploading} className="font-cairo gap-2">
              <Upload className="w-4 h-4" />
              {uploading ? 'جاري الرفع...' : currentLogo ? 'تغيير الشعار' : 'رفع شعار'}
            </Button>
          </div>
        </div>
      </div>

      {/* Favicon */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="font-cairo font-bold text-xl">أيقونة المتجر (Favicon)</h2>
        <p className="font-cairo text-sm text-muted-foreground">32×32 بيكسل — أيقونة تظهر في تبويب المتصفح</p>
        <div className="flex items-center gap-4">
          {currentFavicon ? (
            <div className="relative group">
              <div className="w-12 h-12 rounded-lg border-2 border-dashed border-primary/30 overflow-hidden bg-muted flex items-center justify-center">
                <img src={currentFavicon} alt="Favicon" className="w-full h-full object-contain p-0.5" />
              </div>
              <button onClick={() => removeImage('store_favicon')} className="absolute -top-2 -left-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
              <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
            </div>
          )}
          <div>
            <input ref={faviconInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/x-icon" className="hidden" onChange={e => handleImageUpload(e, 'store_favicon', setFaviconUploading)} />
            <Button variant="outline" onClick={() => faviconInputRef.current?.click()} disabled={faviconUploading} className="font-cairo gap-2">
              <Upload className="w-4 h-4" />
              {faviconUploading ? 'جاري الرفع...' : currentFavicon ? 'تغيير' : 'رفع أيقونة'}
            </Button>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="font-cairo font-bold text-xl">ألوان المتجر</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-cairo">اللون الأساسي</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={e => setField('primary_color', e.target.value)} className="w-10 h-10 rounded-lg border cursor-pointer" />
              <Input value={form.primary_color ?? primaryColor} onChange={e => setField('primary_color', e.target.value)} className="font-roboto flex-1" dir="ltr" placeholder="#184ABF" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-cairo">اللون الثانوي</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={secondaryColor} onChange={e => setField('secondary_color', e.target.value)} className="w-10 h-10 rounded-lg border cursor-pointer" />
              <Input value={form.secondary_color ?? secondaryColor} onChange={e => setField('secondary_color', e.target.value)} className="font-roboto flex-1" dir="ltr" placeholder="#0F2E7A" />
            </div>
          </div>
        </div>
        <p className="font-cairo text-xs text-amber-600">⚠️ تجنب اللون الأبيض لضمان وضوح النصوص</p>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
          <span className="font-cairo text-sm text-muted-foreground">معاينة:</span>
          <div className="w-8 h-8 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: primaryColor }} />
          <div className="w-8 h-8 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: secondaryColor }} />
          <div className="flex-1 flex gap-2">
            <span className="text-xs font-cairo px-3 py-1 rounded-full text-white" style={{ backgroundColor: primaryColor }}>زر أساسي</span>
            <span className="text-xs font-cairo px-3 py-1 rounded-full text-white" style={{ backgroundColor: secondaryColor }}>زر ثانوي</span>
          </div>
        </div>
      </div>

      {/* Announcement Bar */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h2 className="font-cairo font-bold text-xl">شريط الإعلانات</h2>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={mergedSettings.announcements_enabled === 'true'} onCheckedChange={v => setField('announcements_enabled', String(v))} />
          <Label className="font-cairo">تفعيل شريط الإعلانات</Label>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <Label className="font-cairo text-sm">إعلان {i}</Label>
              <Input value={mergedSettings[`announcement_${i}`] || ''} onChange={e => setField(`announcement_${i}`, e.target.value)} className="font-cairo mt-1" placeholder={`نص الإعلان ${i}...`} />
            </div>
          ))}
        </div>
        {mergedSettings.announcements_enabled === 'true' && (
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: primaryColor }}>
            <p className="text-center text-sm font-cairo py-2 text-white">
              {mergedSettings.announcement_1 || mergedSettings.announcement_2 || mergedSettings.announcement_3 || mergedSettings.announcement_4 || 'معاينة شريط الإعلانات'}
            </p>
          </div>
        )}
      </div>

      {/* Top Scrolling Marquee */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h2 className="font-cairo font-bold text-xl">الشريط المتحرك العلوي</h2>
        </div>
        <p className="font-cairo text-sm text-muted-foreground">
          يظهر في أعلى الموقع ويتحرك بشكل مستمر (Sticky). يمكنك تخصيص النص وإضافة الرموز التعبيرية.
        </p>
        <div className="flex items-center gap-2">
          <Switch
            checked={mergedSettings.top_marquee_enabled !== 'false'}
            onCheckedChange={v => setField('top_marquee_enabled', String(v))}
          />
          <Label className="font-cairo">تفعيل الشريط المتحرك</Label>
        </div>
        <div>
          <Label className="font-cairo text-sm">نص الشريط</Label>
          <Textarea
            value={mergedSettings.top_marquee_text ?? ''}
            onChange={e => setField('top_marquee_text', e.target.value)}
            className="font-cairo mt-1 min-h-[80px]"
            placeholder="🎁 منتجات أصلية 100% 💯  ✦  🛡️ ضمان سنة كاملة من المحل  ✦  🚚 توصيل سريع لكل 58 ولاية  ✦  💳 الدفع عند الاستلام  ✦  🔥 عروض حصرية كل أسبوع"
          />
        </div>
        {mergedSettings.top_marquee_enabled !== 'false' && (
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: primaryColor }}>
            <p className="text-center text-sm font-cairo py-2 text-white truncate px-4">
              {(mergedSettings.top_marquee_text?.trim()) || '🎁 منتجات أصلية 100% 💯  ✦  🛡️ ضمان سنة كاملة من المحل  ✦  🚚 توصيل سريع لكل 58 ولاية  ✦  💳 الدفع عند الاستلام  ✦  🔥 عروض حصرية كل أسبوع'}
            </p>
          </div>
        )}
      </div>


      {/* Hero Slider */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-primary" />
          <h2 className="font-cairo font-bold text-xl">سلايدر الصفحة الرئيسية</h2>
        </div>
        <p className="font-cairo text-sm text-muted-foreground">حد أقصى 5 صور — كل صورة بحجم أقصى 2MB</p>
        <div className="space-y-3">
          {heroSlides.map((slide, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="w-24 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                <img src={slide.url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <Input value={slide.link || ''} onChange={e => updateSlideLink(i, e.target.value)} className="font-roboto text-sm" dir="ltr" placeholder="رابط اختياري (مثال: /products)" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeSlide(i)} className="shrink-0 text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        {heroSlides.length < 5 && (
          <div>
            <input ref={heroSlideInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleSlideUpload} />
            <Button variant="outline" onClick={() => heroSlideInputRef.current?.click()} disabled={slideUploading} className="font-cairo gap-2">
              <Plus className="w-4 h-4" />
              {slideUploading ? 'جاري الرفع...' : 'إضافة صورة'}
            </Button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="font-cairo font-bold text-xl">معلومات التذييل</h2>
        <div>
          <Label className="font-cairo">وصف المتجر</Label>
          <Textarea value={mergedSettings.footer_description || ''} onChange={e => setField('footer_description', e.target.value)} className="font-cairo mt-1" placeholder="وصف قصير للمتجر..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="font-cairo">رقم الهاتف</Label>
            <Input value={mergedSettings.footer_phone || ''} onChange={e => setField('footer_phone', e.target.value)} className="font-roboto mt-1" dir="ltr" placeholder="0555 000 000" />
          </div>
          <div>
            <Label className="font-cairo">البريد الإلكتروني</Label>
            <Input value={mergedSettings.footer_email || ''} onChange={e => setField('footer_email', e.target.value)} className="font-roboto mt-1" dir="ltr" placeholder="info@store.com" />
          </div>
        </div>
        <div>
          <Label className="font-cairo">العنوان</Label>
          <Input value={mergedSettings.footer_address || ''} onChange={e => setField('footer_address', e.target.value)} className="font-cairo mt-1" placeholder="الجزائر العاصمة، الجزائر" />
        </div>
        <div className="pt-2">
          <h3 className="font-cairo font-bold text-base mb-3">روابط التواصل الاجتماعي</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="font-cairo">فيسبوك</Label>
              <Input value={mergedSettings.facebook_url || ''} onChange={e => setField('facebook_url', e.target.value)} className="font-roboto mt-1" dir="ltr" placeholder="https://facebook.com/..." />
            </div>
            <div>
              <Label className="font-cairo">إنستغرام</Label>
              <Input value={mergedSettings.instagram_url || ''} onChange={e => setField('instagram_url', e.target.value)} className="font-roboto mt-1" dir="ltr" placeholder="https://instagram.com/..." />
            </div>
            <div>
              <Label className="font-cairo">تيك توك</Label>
              <Input value={mergedSettings.tiktok_url || ''} onChange={e => setField('tiktok_url', e.target.value)} className="font-roboto mt-1" dir="ltr" placeholder="https://tiktok.com/@..." />
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Floating Button */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-[#25D366]" />
          <h2 className="font-cairo font-bold text-xl">زر واتساب العائم</h2>
        </div>
        <p className="font-cairo text-sm text-muted-foreground">
          يظهر كزر عائم على يسار الشاشة في جميع صفحات المتجر لتواصل الزبائن معك مباشرة.
        </p>
        <div className="flex items-center gap-2">
          <Switch
            checked={mergedSettings.whatsapp_enabled === 'true'}
            onCheckedChange={v => setField('whatsapp_enabled', String(v))}
          />
          <Label className="font-cairo">تفعيل زر واتساب</Label>
        </div>
        <div>
          <Label className="font-cairo">رقم واتساب (مع رمز الدولة، بدون +)</Label>
          <Input
            value={mergedSettings.whatsapp_number || ''}
            onChange={e => setField('whatsapp_number', e.target.value)}
            className="font-roboto mt-1"
            dir="ltr"
            placeholder="213555000000"
          />
        </div>
        <div>
          <Label className="font-cairo">رسالة افتراضية (اختياري)</Label>
          <Input
            value={mergedSettings.whatsapp_message || ''}
            onChange={e => setField('whatsapp_message', e.target.value)}
            className="font-cairo mt-1"
            placeholder="مرحبًا، أود الاستفسار عن..."
          />
        </div>
      </div>



      {/* Facebook Pixel */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h2 className="font-cairo font-bold text-xl">Facebook Pixel</h2>
        </div>
        <p className="font-cairo text-sm text-muted-foreground">أدخل معرف Facebook Pixel لتتبع الأحداث التسويقية (PageView, AddToCart, Purchase...)</p>
        <div>
          <Label className="font-cairo">Pixel ID</Label>
          <Input value={mergedSettings.facebook_pixel_id || ''} onChange={e => setField('facebook_pixel_id', e.target.value)} className="font-roboto mt-1" dir="ltr" placeholder="مثال: 123456789012345" />
        </div>
      </div>

      {/* Extra Settings */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="font-cairo font-bold text-xl">إعدادات إضافية</h2>
        <div>
          <Label className="font-cairo">نص حقوق النشر</Label>
          <Input value={mergedSettings.copyright_text || ''} onChange={e => setField('copyright_text', e.target.value)} className="font-cairo mt-1" placeholder="حقوق محفوظة ل ..." />
        </div>
        <div>
          <Label className="font-cairo">عدد المنتجات في كل صفحة</Label>
          <Select value={mergedSettings.products_per_page || '10'} onValueChange={v => setField('products_per_page', v)}>
            <SelectTrigger className="font-cairo mt-1 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['5', '10', '25', '50'].map(n => (
                <SelectItem key={n} value={n} className="font-cairo">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleSave} disabled={updateSetting.isPending || Object.keys(form).length === 0} className="font-cairo font-semibold gap-2">
        <Save className="w-4 h-4" />
        {updateSetting.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </Button>
    </div>
  );
}
