
CREATE OR REPLACE FUNCTION public.count_guest_orders_for_phone(p_phone text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.orders
  WHERE customer_phone = trim(p_phone)
    AND user_id IS NULL
    AND status <> 'ملغي';
$$;

GRANT EXECUTE ON FUNCTION public.count_guest_orders_for_phone(text) TO anon, authenticated;
