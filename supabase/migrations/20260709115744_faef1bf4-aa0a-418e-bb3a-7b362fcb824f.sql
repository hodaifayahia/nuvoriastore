
-- 1. Harden generate_order_number: skip non-numeric legacy order numbers, run with elevated privileges.
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.orders
    WHERE order_number ~ '^ORD-\d+$';
  NEW.order_number := 'ORD-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$function$;

-- 2. Public RPC: insert an order + its items atomically and return the new order_number/id.
--    This bypasses the RLS SELECT policy problem when Prefer: return=representation is used
--    because it runs as SECURITY DEFINER and returns only the two safe fields.
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
BEGIN
  -- basic validation
  IF COALESCE(p_order->>'customer_name','') = '' THEN
    RAISE EXCEPTION 'customer_name is required';
  END IF;
  IF length(trim(COALESCE(p_order->>'customer_phone',''))) < 8 THEN
    RAISE EXCEPTION 'customer_phone is invalid';
  END IF;
  IF COALESCE((p_order->>'total_amount')::numeric, 0) < 0 THEN
    RAISE EXCEPTION 'total_amount must be non-negative';
  END IF;

  INSERT INTO public.orders (
    order_number, customer_name, customer_phone, wilaya_id, baladiya,
    delivery_type, address, subtotal, shipping_cost, total_amount,
    payment_method, payment_receipt_url, coupon_code, discount_amount,
    user_id, landing_page_id
  ) VALUES (
    '',
    p_order->>'customer_name',
    p_order->>'customer_phone',
    NULLIF(p_order->>'wilaya_id','')::uuid,
    NULLIF(p_order->>'baladiya',''),
    NULLIF(p_order->>'delivery_type',''),
    NULLIF(p_order->>'address',''),
    NULLIF(p_order->>'subtotal','')::numeric,
    NULLIF(p_order->>'shipping_cost','')::numeric,
    NULLIF(p_order->>'total_amount','')::numeric,
    NULLIF(p_order->>'payment_method',''),
    NULLIF(p_order->>'payment_receipt_url',''),
    NULLIF(p_order->>'coupon_code',''),
    COALESCE(NULLIF(p_order->>'discount_amount','')::numeric, 0),
    NULLIF(p_order->>'user_id','')::uuid,
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
        COALESCE((v_item->>'quantity')::int, 1),
        COALESCE((v_item->>'unit_price')::numeric, 0)
      );
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_id, v_num;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_order(jsonb, jsonb) TO anon, authenticated;
