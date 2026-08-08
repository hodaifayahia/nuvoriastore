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
    || '📅 <b>التاريخ:</b> ' || to_char(COALESCE(NEW.created_at, now()) AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI') || E'\n\n'
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
    PERFORM net.http_post(
      url := 'https://api.telegram.org/bot' || v_bot_token || '/sendMessage',
      body := jsonb_build_object(
        'chat_id', v_chat_id,
        'text', v_message,
        'parse_mode', 'HTML',
        'disable_web_page_preview', true,
        'reply_markup', v_reply_markup
      ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'telegram notify failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;