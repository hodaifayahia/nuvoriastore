
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active faqs"
  ON public.faqs FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage faqs"
  ON public.faqs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.faqs (question, answer, sort_order) VALUES
  ('كيف يمكنني شراء المنتجات؟', 'يمكنك تصفح المنتجات واختيار ما يناسبك، ثم إضافته للسلة وإتمام عملية الشراء بسهولة عبر طرق الدفع المتاحة.', 1),
  ('ما هي طرق الدفع المتاحة؟', 'نوفر عدة طرق للدفع تشمل CCP، BaridiMob، والدفع عند الاستلام في بعض الولايات.', 2),
  ('كم يستغرق وقت التوصيل؟', 'يتم توصيل الطلبات الرقمية فوراً بعد التأكيد. للمنتجات الفيزيائية، يستغرق التوصيل من 2-5 أيام حسب الولاية.', 3),
  ('هل يمكنني استرداد أموالي؟', 'نعم، نوفر سياسة استرداد مرنة. يمكنك طلب الاسترداد خلال 7 أيام من الشراء إذا لم يكن المنتج كما هو موصوف.', 4),
  ('كيف أتواصل مع الدعم الفني؟', 'يمكنك التواصل معنا عبر واتساب على مدار الساعة أو من خلال صفحة التواصل في الموقع.', 5),
  ('هل المنتجات أصلية ومضمونة؟', 'نعم، جميع منتجاتنا أصلية 100% ومضمونة. نحن نتعامل فقط مع مصادر موثوقة ونضمن جودة جميع المنتجات.', 6),
  ('كيف أعرف حالة طلبي؟', 'يمكنك تتبع طلبك من خلال صفحة "تتبع الطلب" باستخدام رقم الطلب أو رقم الهاتف المسجل.', 7),
  ('هل يمكنني تغيير أو إلغاء طلبي؟', 'نعم، يمكنك تعديل أو إلغاء طلبك قبل تأكيده من قبل فريقنا. بعد التأكيد، يرجى التواصل مع الدعم الفني.', 8),
  ('ما هي مدة صلاحية الاشتراكات الرقمية؟', 'تختلف مدة الصلاحية حسب نوع الاشتراك. يتم توضيح المدة بوضوح في وصف كل منتج قبل الشراء.', 9),
  ('هل تقدمون خصومات للمشتريات الكبيرة؟', 'نعم، نوفر خصومات خاصة للمشتريات بالجملة. تواصل معنا للحصول على عرض سعر مخصص.', 10);
