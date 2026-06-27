import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Store, Heart, Truck, Shield, Phone, Mail, MapPin, Star, Sparkles } from 'lucide-react';


const missions = [
  { icon: Heart, title: 'جودة عالية', desc: 'نختار لك أفضل المنتجات بعناية فائقة لضمان رضاك التام' },
  { icon: Truck, title: 'توصيل سريع', desc: 'نوصّل طلبك إلى باب بيتك في أسرع وقت ممكن إلى 58 ولاية' },
  { icon: Shield, title: 'أمان وثقة', desc: 'نحمي بياناتك ونضمن لك تجربة شراء آمنة وموثوقة' },
  { icon: Star, title: 'خدمة متميزة', desc: 'فريقنا جاهز لمساعدتك والإجابة على استفساراتك في أي وقت' },
];

export default function AboutPage() {
  const { data: settings } = useQuery({
    queryKey: ['about-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*');
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  const storeName = settings?.store_name || 'DZ Store';
  const description = settings?.footer_description || 'متجرك الإلكتروني الأول في الجزائر للأدوات المنزلية، منتجات الزينة والإكسسوارات.';
  const phone = settings?.footer_phone;
  const email = settings?.footer_email;
  const address = settings?.footer_address || 'الجزائر';

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-bl from-primary/10 via-background to-secondary/10 py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-secondary rounded-full blur-3xl" />
        </div>
        <div className="container relative text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 animate-fade-in">
            <Store className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-cairo font-bold text-4xl md:text-5xl text-foreground mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            من نحن
          </h1>
          <p className="font-cairo text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {description}
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="container py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 className="font-cairo font-bold text-3xl text-foreground mb-6">قصتنا</h2>
          <p className="font-cairo text-muted-foreground leading-loose text-lg">
            بدأت رحلة <span className="text-primary font-bold">{storeName}</span> من شغفنا بتقديم أفضل المنتجات للعائلة الجزائرية.
            نسعى دائماً لتوفير منتجات عالية الجودة بأسعار مناسبة مع خدمة توصيل سريعة وموثوقة إلى جميع ولايات الوطن.
            هدفنا هو أن نكون الوجهة الأولى للتسوق الإلكتروني في الجزائر.
          </p>
        </div>
      </section>

      {/* Mission Cards */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container">
          <h2 className="font-cairo font-bold text-3xl text-foreground text-center mb-12 animate-fade-in">لماذا تختارنا؟</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {missions.map((m, i) => (
              <div
                key={m.title}
                className="bg-card border rounded-2xl p-6 text-center hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${0.1 * (i + 1)}s` }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <m.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-cairo font-bold text-lg text-foreground mb-2">{m.title}</h3>
                <p className="font-cairo text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="container py-16 md:py-24">
        <h2 className="font-cairo font-bold text-3xl text-foreground text-center mb-12 animate-fade-in">تواصل معنا</h2>
        <div className="max-w-xl mx-auto space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-4 bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-cairo font-semibold text-foreground">الهاتف</p>
                <p className="font-roboto text-muted-foreground" dir="ltr">{phone}</p>
              </div>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-4 bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Mail className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="font-cairo font-semibold text-foreground">البريد الإلكتروني</p>
                <p className="font-roboto text-muted-foreground" dir="ltr">{email}</p>
              </div>
            </a>
          )}
          <div className="flex items-center gap-4 bg-card border rounded-xl p-5">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <MapPin className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-cairo font-semibold text-foreground">العنوان</p>
              <p className="font-cairo text-muted-foreground">{address}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
