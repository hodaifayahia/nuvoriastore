
CREATE TABLE public.launchpage_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES public.launchpage_pages(id) ON DELETE SET NULL,
  product_name TEXT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  wilaya TEXT,
  address TEXT,
  quantity INT NOT NULL DEFAULT 1,
  price TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.launchpage_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launchpage_orders TO authenticated;
GRANT ALL ON public.launchpage_orders TO service_role;
ALTER TABLE public.launchpage_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place an order" ON public.launchpage_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view orders" ON public.launchpage_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
