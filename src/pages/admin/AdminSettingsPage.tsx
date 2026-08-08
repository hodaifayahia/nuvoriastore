import { useNavigate } from 'react-router-dom';
import { Store, CreditCard, Bot, RotateCcw, FormInput, Paintbrush, Shield, Facebook, LayoutTemplate, HelpCircle, DatabaseBackup } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/i18n';

const SETTINGS_CARDS = [
  { href: '/admin/settings/identity', key: 'settings.storeIdentity', descKey: 'settings.identityDesc', icon: Store },
  { href: '/admin/settings/payment', key: 'settings.paymentDelivery', descKey: 'settings.paymentDesc', icon: CreditCard },
  { href: '/admin/settings/telegram', key: 'settings.telegram', descKey: 'settings.telegramDescCard', icon: Bot },
  { href: '/admin/settings/returns', key: 'settings.returnsTab', descKey: 'settings.returnsDesc', icon: RotateCcw },
  { href: '/admin/settings/form', key: 'sidebar.form', descKey: 'settings.formDesc', icon: FormInput },
  
  { href: '/admin/settings/homepage', labelOverride: 'الصفحة الرئيسية', descOverride: 'إظهار/إخفاء الأقسام، تعديل النصوص، وإضافة قسم الإصدار المحدود', icon: LayoutTemplate },
  { href: '/admin/settings/faq', labelOverride: 'الأسئلة الشائعة', descOverride: 'أضف، عدّل أو احذف الأسئلة التي تظهر في صفحة FAQ للعملاء', icon: HelpCircle },
  { href: '/admin/settings/security', key: 'settings.security', descKey: 'settings.securityDesc', icon: Shield },
  { href: '/admin/settings/pixels', key: 'pixels.title', descKey: 'pixels.description', icon: Facebook },
  { href: '/admin/settings/backup', labelOverride: 'النسخ الاحتياطي', descOverride: 'تحميل نسخة كاملة من البيانات والصور، أو استعادتها من ملف ZIP', icon: DatabaseBackup },
];

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-cairo font-bold text-2xl">{t('sidebar.settings')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SETTINGS_CARDS.map((card) => (
          <Card
            key={card.href}
            className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
            onClick={() => navigate(card.href)}
          >
            <CardHeader className="flex flex-row items-start gap-4 p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <card.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base font-cairo">{(card as any).labelOverride || t((card as any).key)}</CardTitle>
                <CardDescription className="text-xs font-cairo">{(card as any).descOverride || t((card as any).descKey)}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
