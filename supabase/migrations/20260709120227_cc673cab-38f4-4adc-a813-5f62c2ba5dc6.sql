CREATE OR REPLACE FUNCTION public.create_public_order(
  p_order jsonb,
  p_items jsonb
)
RETURNS TABLE (id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_num text;
  v_item jsonb;
  v_phone text;
  v_auth_user_id uuid;
  v_guest_limit integer := 2;
  v_existing_guest_orders integer := 0;
  v_setting text;
BEGIN
  v_phone := regexp_replace(trim(COALESCE(p_order->>'customer_phone','')), '\D', '', 'g');
  v_auth_user_id := auth.uid();

  IF length(trim(COALESCE(p_order->>'customer_name',''))) < 2 THEN
    RAISE EXCEPTION 'customer_name is required';
  END IF;

  IF v_phone !~ '^0[567][0-9]{8}$' THEN
    RAISE EXCEPTION 'invalid_algerian_phone';
  END IF;

  IF COALESCE(NULLIF(p_order->>'wilaya_id',''), '') = '' THEN
    RAISE EXCEPTION 'wilaya is required';
  END IF;

  IF COALESCE(NULLIF(p_order->>'delivery_type',''), '') = '' THEN
    RAISE EXCEPTION 'delivery_type is required';
  END IF;

  IF COALESCE(NULLIF(p_order->>'payment_method',''), '') = '' THEN
    RAISE EXCEPTION 'payment_method is required';
  END IF;

  IF COALESCE(NULLIF(p_order->>'total_amount','')::numeric, 0) < 0 THEN
    RAISE EXCEPTION 'total_amount must be non-negative';
  END IF;

  IF v_auth_user_id IS NULL THEN
    SELECT value INTO v_setting
    FROM public.settings
    WHERE key = 'guest_order_limit'
    LIMIT 1;

    IF v_setting ~ '^\d+$' AND v_setting::integer > 0 THEN
      v_guest_limit := v_setting::integer;
    END IF;

    SELECT public.count_guest_orders_for_phone(v_phone)
      INTO v_existing_guest_orders;

    IF v_existing_guest_orders >= v_guest_limit THEN
      RAISE EXCEPTION 'guest_order_limit_reached';
    END IF;
  END IF;

  INSERT INTO public.orders (
    order_number, customer_name, customer_phone, wilaya_id, baladiya,
    delivery_type, address, subtotal, shipping_cost, total_amount,
    payment_method, payment_receipt_url, coupon_code, discount_amount,
    user_id, landing_page_id
  ) VALUES (
    '',
    trim(p_order->>'customer_name'),
    v_phone,
    NULLIF(p_order->>'wilaya_id','')::uuid,
    NULLIF(trim(COALESCE(p_order->>'baladiya','')), ''),
    NULLIF(p_order->>'delivery_type',''),
    NULLIF(trim(COALESCE(p_order->>'address','')), ''),
    NULLIF(p_order->>'subtotal','')::numeric,
    NULLIF(p_order->>'shipping_cost','')::numeric,
    NULLIF(p_order->>'total_amount','')::numeric,
    NULLIF(p_order->>'payment_method',''),
    NULLIF(p_order->>'payment_receipt_url',''),
    NULLIF(p_order->>'coupon_code',''),
    COALESCE(NULLIF(p_order->>'discount_amount','')::numeric, 0),
    v_auth_user_id,
    NULLIF(p_order->>'landing_page_id','')::uuid
  )
  RETURNING orders.id, orders.order_number INTO v_id, v_num;

  IF p_items IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.order_items (order_id, product_id, variant_id, quantity, unit_price)
      VALUES (
        v_id,
        NULLIF(v_item->>'product_id','')::uuid,
        NULLIF(v_item->>'variant_id','')::uuid,
        GREATEST(COALESCE((v_item->>'quantity')::int, 1), 1),
        GREATEST(COALESCE((v_item->>'unit_price')::numeric, 0), 0)
      );
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_id, v_num;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_order(jsonb, jsonb) TO anon, authenticated;

DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_number();