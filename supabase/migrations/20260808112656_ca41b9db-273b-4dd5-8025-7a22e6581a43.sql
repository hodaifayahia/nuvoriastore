ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_ip text;
CREATE INDEX IF NOT EXISTS idx_orders_client_ip ON public.orders (client_ip);

CREATE OR REPLACE FUNCTION public.current_client_ip()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_headers text;
  v_ip text;
BEGIN
  BEGIN
    v_headers := current_setting('request.headers', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  IF v_headers IS NULL OR v_headers = '' THEN RETURN NULL; END IF;
  v_ip := COALESCE(
    (v_headers::json ->> 'cf-connecting-ip'),
    (v_headers::json ->> 'x-real-ip'),
    split_part(COALESCE(v_headers::json ->> 'x-forwarded-for', ''), ',', 1)
  );
  v_ip := NULLIF(trim(COALESCE(v_ip, '')), '');
  RETURN v_ip;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_guest_orders_for_ip()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT COUNT(*)::int
    FROM public.orders o
    WHERE o.user_id IS NULL
      AND o.status <> 'ملغي'
      AND o.client_ip IS NOT NULL
      AND o.client_ip = public.current_client_ip()
  ), 0);
$$;

GRANT EXECUTE ON FUNCTION public.current_client_ip() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_guest_orders_for_ip() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_public_order(p_order jsonb, p_items jsonb)
 RETURNS TABLE(id uuid, order_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_num text;
  v_item jsonb;
  v_phone text;
  v_auth_user_id uuid;
  v_guest_limit integer := 2;
  v_existing_guest_orders integer := 0;
  v_existing_ip_orders integer := 0;
  v_setting text;
  v_delivery_type text;
  v_payment_method text;
  v_ip text;
BEGIN
  v_phone := regexp_replace(trim(COALESCE(p_order->>'customer_phone','')), '\D', '', 'g');
  v_auth_user_id := auth.uid();
  v_delivery_type := COALESCE(NULLIF(p_order->>'delivery_type',''), 'office');
  v_payment_method := COALESCE(NULLIF(p_order->>'payment_method',''), 'cod');
  v_ip := public.current_client_ip();

  IF length(trim(COALESCE(p_order->>'customer_name',''))) < 2 THEN
    RAISE EXCEPTION 'customer_name is required';
  END IF;

  IF v_phone !~ '^0[567][0-9]{8}$' THEN
    RAISE EXCEPTION 'invalid_algerian_phone';
  END IF;

  IF v_delivery_type <> 'digital' AND COALESCE(NULLIF(p_order->>'wilaya_id',''), '') = '' THEN
    RAISE EXCEPTION 'wilaya is required';
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

    IF v_ip IS NOT NULL THEN
      SELECT COUNT(*)::int INTO v_existing_ip_orders
      FROM public.orders o
      WHERE o.user_id IS NULL AND o.status <> 'ملغي' AND o.client_ip = v_ip;
    END IF;

    IF GREATEST(v_existing_guest_orders, v_existing_ip_orders) >= v_guest_limit THEN
      RAISE EXCEPTION 'guest_order_limit_reached';
    END IF;
  END IF;

  INSERT INTO public.orders (
    order_number, customer_name, customer_phone, wilaya_id, baladiya,
    delivery_type, address, subtotal, shipping_cost, total_amount,
    payment_method, payment_receipt_url, coupon_code, discount_amount,
    user_id, landing_page_id, client_ip
  ) VALUES (
    '',
    trim(p_order->>'customer_name'),
    v_phone,
    NULLIF(p_order->>'wilaya_id','')::uuid,
    NULLIF(trim(COALESCE(p_order->>'baladiya','')), ''),
    v_delivery_type,
    NULLIF(trim(COALESCE(p_order->>'address','')), ''),
    NULLIF(p_order->>'subtotal','')::numeric,
    COALESCE(NULLIF(p_order->>'shipping_cost','')::numeric, 0),
    NULLIF(p_order->>'total_amount','')::numeric,
    v_payment_method,
    NULLIF(p_order->>'payment_receipt_url',''),
    NULLIF(p_order->>'coupon_code',''),
    COALESCE(NULLIF(p_order->>'discount_amount','')::numeric, 0),
    v_auth_user_id,
    NULLIF(p_order->>'landing_page_id','')::uuid,
    v_ip
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_telegram_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled text;
  v_notify_orders text;
  v_bot_token text;
  v_chat_ids text;
  v_chat_id text;
  v_message text;
  v_item_lines text := '';
  v_payment_label text;
  v_delivery_label text;
  v_wilaya_name text;
  v_item record;
  v_reply_markup jsonb;
BEGIN
  SELECT value INTO v_enabled FROM public.settings WHERE key = 'telegram_enabled';
  IF v_enabled IS DISTINCT FROM 'true' THEN RETURN NEW; END IF;

  SELECT value INTO v_notify_orders FROM public.settings WHERE key = 'telegram_notify_orders';
  IF v_notify_orders IS DISTINCT FROM 'true' THEN RETURN NEW; END IF;

  SELECT value INTO v_bot_token FROM public.settings WHERE key = 'telegram_bot_token';
  SELECT value INTO v_chat_ids FROM public.settings WHERE key = 'telegram_chat_id';

  IF v_bot_token IS NULL OR v_bot_token = '' OR v_chat_ids IS NULL OR v_chat_ids = '' THEN
    RETURN NEW;
  END IF;

  FOR v_item IN
    SELECT oi.quantity, oi.unit_price, COALESCE(p.name, 'منتج') AS pname
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = NEW.id
  LOOP
    v_item_lines := v_item_lines || '  • ' || v_item.pname || ' × ' || v_item.quantity
      || ' = <b>' || (v_item.unit_price * v_item.quantity) || ' دج</b>' || E'\n';
  END LOOP;

  v_payment_label := CASE NEW.payment_method
    WHEN 'cod' THEN '💵 الدفع عند التسليم'
    WHEN 'baridimob' THEN '🏦 بريدي موب'
    WHEN 'flexy' THEN '📱 فليكسي'
    ELSE COALESCE(NEW.payment_method, '—')
  END;

  v_delivery_label := CASE NEW.delivery_type
    WHEN 'home' THEN '🏠 توصيل للمنزل'
    WHEN 'office' THEN '🏢 مكتب التوصيل'
    WHEN 'pickup' THEN '📍 نقطة استلام'
    ELSE COALESCE(NEW.delivery_type, '—')
  END;

  SELECT name INTO v_wilaya_name FROM public.wilayas WHERE id = NEW.wilaya_id;

  v_message :=
       '🔔 <b>طلب جديد وارد الآن!</b>' || E'\n'
    || '━━━━━━━━━━━━━━━━' || E'\n'
    || '🧾 <b>رقم الطلب:</b> #' || COALESCE(NEW.order_number::text, '—') || E'\n'
    || '📅 <b>التاريخ:</b> ' || to_char(NEW.created_at AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI') || E'\n\n'
    || '👤 <b>معلومات العميل</b>' || E'\n'
    || '  الاسم: ' || COALESCE(NEW.customer_name, '—') || E'\n'
    || '  الهاتف: <a href="tel:' || COALESCE(NEW.customer_phone, '') || '">' || COALESCE(NEW.customer_phone, '—') || '</a>' || E'\n'
    || '  الولاية: ' || COALESCE(v_wilaya_name, '—') || E'\n'
    || '  البلدية: ' || COALESCE(NEW.baladiya, '—') || E'\n'
    || '  العنوان: ' || COALESCE(NULLIF(trim(COALESCE(NEW.address, '')), ''), 'لم يُدخل') || E'\n'
    || '  نوع التوصيل: ' || v_delivery_label || E'\n'
    || '  طريقة الدفع: ' || v_payment_label || E'\n\n'
    || '🛒 <b>المنتجات</b>' || E'\n' || COALESCE(NULLIF(v_item_lines, ''), '  —' || E'\n') || E'\n'
    || '━━━━━━━━━━━━━━━━' || E'\n';

  IF NEW.discount_amount IS NOT NULL AND NEW.discount_amount > 0 THEN
    v_message := v_message || '🏷️ الخصم: -' || NEW.discount_amount || ' دج' || E'\n';
  END IF;

  v_message := v_message
    || '🚚 التوصيل: ' || COALESCE(NEW.shipping_cost::text, '0') || ' دج' || E'\n'
    || '💵 <b>الإجمالي: ' || COALESCE(NEW.total_amount::text, '0') || ' دج</b>' || E'\n'
    || '📦 الحالة الحالية: <b>' || COALESCE(NEW.status, '—') || '</b>';

  IF NEW.notes IS NOT NULL AND length(trim(NEW.notes)) > 0 THEN
    v_message := v_message || E'\n\n' || '📝 <b>ملاحظات:</b> ' || NEW.notes;
  END IF;

  IF NEW.payment_receipt_url IS NOT NULL AND length(trim(NEW.payment_receipt_url)) > 0 THEN
    v_message := v_message || E'\n\n' || '🧾 <a href="' || NEW.payment_receipt_url || '">عرض إيصال الدفع</a>';
  END IF;

  v_reply_markup := jsonb_build_object(
    'inline_keyboard', jsonb_build_array(
      jsonb_build_array(
        jsonb_build_object('text', '🔍 فتح صفحة تفاصيل الطلب', 'callback_data', 'order_detail:' || NEW.id)
      ),
      jsonb_build_array(
        jsonb_build_object('text', '✅ تأكيد',   'callback_data', 'order_status:' || NEW.id || ':قيد التحضير'),
        jsonb_build_object('text', '❌ إلغاء',   'callback_data', 'order_status:' || NEW.id || ':ملغي')
      ),
      jsonb_build_array(
        jsonb_build_object('text', '🚚 تم الشحن',   'callback_data', 'order_status:' || NEW.id || ':تم الشحن'),
        jsonb_build_object('text', '✔️ تم التسليم', 'callback_data', 'order_status:' || NEW.id || ':تم التسليم')
      )
    )
  );

  FOREACH v_chat_id IN ARRAY string_to_array(v_chat_ids, ',')
  LOOP
    v_chat_id := trim(v_chat_id);
    IF v_chat_id = '' THEN CONTINUE; END IF;
    PERFORM extensions.http_post(
      url := 'https://api.telegram.org/bot' || v_bot_token || '/sendMessage',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'chat_id', v_chat_id,
        'text', v_message,
        'parse_mode', 'HTML',
        'disable_web_page_preview', true,
        'reply_markup', v_reply_markup
      )
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;