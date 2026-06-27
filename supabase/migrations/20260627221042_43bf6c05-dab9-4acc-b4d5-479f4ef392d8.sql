
-- 1) Facebook pixels: stop exposing the table to anon; serve active pixel IDs via a SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Active pixels publicly readable" ON public.facebook_pixels;

CREATE POLICY "Admins can read facebook_pixels"
  ON public.facebook_pixels FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_active_facebook_pixels()
RETURNS TABLE(pixel_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fp.pixel_id
  FROM public.facebook_pixels fp
  WHERE fp.is_active = true
    AND fp.pixel_id IS NOT NULL
    AND length(trim(fp.pixel_id)) > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_facebook_pixels() TO anon, authenticated;

-- 2) Restrict confirmer UPDATEs on orders to safe columns only via a BEFORE UPDATE trigger.
--    Admins (has_role = admin) keep full access; confirmers can only change status / notes / updated_at.
CREATE OR REPLACE FUNCTION public.restrict_confirmer_order_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and service role bypass restrictions
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Only apply to confirmers
  IF NOT public.has_role(auth.uid(), 'confirmer'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Confirmers may only change status and notes; block changes to all other columns
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.order_number IS DISTINCT FROM OLD.order_number
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
     OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
     OR NEW.wilaya_id IS DISTINCT FROM OLD.wilaya_id
     OR NEW.baladiya IS DISTINCT FROM OLD.baladiya
     OR NEW.delivery_type IS DISTINCT FROM OLD.delivery_type
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.payment_receipt_url IS DISTINCT FROM OLD.payment_receipt_url
     OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Confirmers may only update status and notes on orders';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_confirmer_order_updates ON public.orders;
CREATE TRIGGER trg_restrict_confirmer_order_updates
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_confirmer_order_updates();
