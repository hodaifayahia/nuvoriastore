
-- Restore missing GRANTs on public tables. RLS policies still control who can actually read/write rows.

-- Orders & order items: guests and logged-in customers create orders through the storefront
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon, authenticated;
GRANT ALL ON public.order_items TO service_role;

-- Abandoned orders: created by guests via RPC / direct insert
GRANT SELECT, INSERT, UPDATE, DELETE ON public.abandoned_orders TO anon, authenticated;
GRANT ALL ON public.abandoned_orders TO service_role;

-- Public read data for storefront
GRANT SELECT ON public.wilayas TO anon, authenticated;
GRANT ALL ON public.wilayas TO service_role;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;

GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
