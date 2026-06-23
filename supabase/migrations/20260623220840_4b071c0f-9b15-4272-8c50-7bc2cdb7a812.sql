
DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Admins can read order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert order items for an existing order" ON public.order_items FOR INSERT TO anon, authenticated
WITH CHECK (order_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id) AND quantity > 0);

DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (customer_name IS NOT NULL AND length(trim(customer_name)) > 0 AND customer_phone IS NOT NULL AND length(trim(customer_phone)) >= 8 AND total_amount >= 0);

DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;
CREATE POLICY "Anyone can create leads" ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (name IS NOT NULL AND length(trim(name)) > 0 AND phone IS NOT NULL AND length(trim(phone)) >= 8);

DROP POLICY IF EXISTS "Anyone can create reviews" ON public.reviews;
CREATE POLICY "Anyone can create reviews" ON public.reviews FOR INSERT TO anon, authenticated
WITH CHECK (rating BETWEEN 1 AND 5 AND product_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id));

DROP POLICY IF EXISTS "Anyone can insert return_requests" ON public.return_requests;
CREATE POLICY "Anyone can insert return_requests" ON public.return_requests FOR INSERT TO anon, authenticated
WITH CHECK (customer_phone IS NOT NULL AND length(trim(customer_phone)) >= 8 AND order_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));

DROP POLICY IF EXISTS "Anyone can insert return_photos" ON public.return_photos;
CREATE POLICY "Anyone can insert return_photos" ON public.return_photos FOR INSERT TO anon, authenticated
WITH CHECK (return_request_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.return_requests r WHERE r.id = return_request_id));

DROP POLICY IF EXISTS "Coupons are publicly readable" ON public.coupons;

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text)
RETURNS TABLE (id uuid, code text, discount_type text, discount_value numeric, is_active boolean, expiry_date timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.code, c.discount_type, c.discount_value, c.is_active, c.expiry_date
  FROM public.coupons c
  WHERE c.code = upper(trim(p_code))
    AND COALESCE(c.is_active, true) = true
    AND (c.expiry_date IS NULL OR c.expiry_date > now())
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.delivery_company_credentials (
  delivery_company_id uuid PRIMARY KEY REFERENCES public.delivery_companies(id) ON DELETE CASCADE,
  api_key text,
  api_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.delivery_company_credentials TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_company_credentials TO authenticated;
ALTER TABLE public.delivery_company_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage delivery credentials" ON public.delivery_company_credentials;
CREATE POLICY "Admin can manage delivery credentials" ON public.delivery_company_credentials FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.delivery_company_credentials (delivery_company_id, api_key)
SELECT id, api_key FROM public.delivery_companies WHERE api_key IS NOT NULL
ON CONFLICT (delivery_company_id) DO UPDATE SET api_key = EXCLUDED.api_key;

ALTER TABLE public.delivery_companies DROP COLUMN IF EXISTS api_key;

CREATE OR REPLACE FUNCTION public.get_return_status(p_return_number text, p_phone text)
RETURNS TABLE (return_number text, status text, created_at timestamptz, history jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rr.return_number, rr.status, rr.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'from_status', h.from_status,
                'to_status', h.to_status,
                'change_reason', h.change_reason,
                'created_at', h.created_at
              ) ORDER BY h.created_at)
              FROM public.return_status_history h
              WHERE h.return_request_id = rr.id), '[]'::jsonb) AS history
  FROM public.return_requests rr
  WHERE rr.return_number = upper(trim(p_return_number)) AND rr.customer_phone = trim(p_phone)
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_return_status(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_return_status(text, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.settings;
CREATE POLICY "Public can read non-sensitive settings" ON public.settings FOR SELECT TO anon, authenticated
USING (
  key NOT IN ('telegram_bot_token', 'telegram_chat_id')
  AND key NOT ILIKE '%token%' AND key NOT ILIKE '%secret%' AND key NOT ILIKE '%api_key%'
  AND key NOT ILIKE '%password%' AND key NOT ILIKE '%credential%' AND key NOT ILIKE '%webhook%'
  AND key NOT ILIKE 'private_%'
);

DROP POLICY IF EXISTS "Public can read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can read supplier docs" ON storage.objects;
CREATE POLICY "Admin can read receipts" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can upload receipts" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Admin can read supplier docs" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'supplier-documents' AND public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_order_tracking(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_tracking(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_abandoned_order(text, text, text, jsonb, numeric, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_abandoned_order(text, text, text, jsonb, numeric, integer, text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_abandoned_recovered(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_abandoned_recovered(text, uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.adjust_stock_on_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_return_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_review_rating() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
