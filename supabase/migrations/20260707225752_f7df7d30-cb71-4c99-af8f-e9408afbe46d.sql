
-- Recreate the notification function so each new-order message includes
-- inline action buttons handled by the existing telegram-bot webhook.
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
      || ' = ' || (v_item.unit_price * v_item.quantity) || ' دج' || E'\n';
  END LOOP;

  v_payment_label := CASE NEW.payment_method
    WHEN 'cod' THEN 'الدفع عند التسليم'
    WHEN 'baridimob' THEN 'بريدي موب'
    WHEN 'flexy' THEN 'فليكسي'
    ELSE COALESCE(NEW.payment_method, '')
  END;

  SELECT name INTO v_wilaya_name FROM public.wilayas WHERE id = NEW.wilaya_id;

  v_message := '🛒 <b>طلب جديد #' || COALESCE(NEW.order_number::text, '') || '</b>' || E'\n\n'
    || '👤 ' || COALESCE(NEW.customer_name, '') || E'\n'
    || '📱 ' || COALESCE(NEW.customer_phone, '') || E'\n'
    || '📍 ' || COALESCE(v_wilaya_name, '') || COALESCE(' - ' || NEW.baladiya, '') || E'\n'
    || '💰 ' || COALESCE(NEW.total_amount::text, '0') || ' دج' || E'\n'
    || '💳 ' || v_payment_label || E'\n\n'
    || '<b>المنتجات:</b>' || E'\n' || v_item_lines || E'\n'
    || '📦 الحالة: ' || COALESCE(NEW.status, '');

  -- Inline action buttons handled by supabase/functions/telegram-bot
  v_reply_markup := jsonb_build_object(
    'inline_keyboard', jsonb_build_array(
      jsonb_build_array(
        jsonb_build_object('text', '✅ تأكيد',   'callback_data', 'order_status:' || NEW.id || ':قيد التحضير'),
        jsonb_build_object('text', '❌ إلغاء',   'callback_data', 'order_status:' || NEW.id || ':ملغي')
      ),
      jsonb_build_array(
        jsonb_build_object('text', '🚚 تم الشحن',   'callback_data', 'order_status:' || NEW.id || ':تم الشحن'),
        jsonb_build_object('text', '✔️ تم التسليم', 'callback_data', 'order_status:' || NEW.id || ':تم التسليم')
      ),
      jsonb_build_array(
        jsonb_build_object('text', '🧾 التفاصيل', 'callback_data', 'order_detail:' || NEW.id)
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
        'reply_markup', v_reply_markup
      )
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

-- Attach the trigger so notifications actually fire on new orders
DROP TRIGGER IF EXISTS trg_notify_telegram_new_order ON public.orders;
CREATE TRIGGER trg_notify_telegram_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_telegram_new_order();
