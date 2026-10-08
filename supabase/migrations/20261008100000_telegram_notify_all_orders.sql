-- Telegram new-order notifications: make every order reach the bot.
--
-- 1. pg_net must exist, otherwise net.http_post fails and the EXCEPTION block
--    swallows the error (no notification, no visible error).
-- 2. Customer text (name, address, baladiya...) is now HTML-escaped. Before,
--    a single "<" or "&" made Telegram reject the HTML message, so that order
--    silently never showed up in Telegram.
-- 3. The trigger is re-created so it exists on every project these
--    migrations are applied to. It is deferred to commit time so the
--    order_items inserted by create_public_order are included.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.tg_escape(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT replace(replace(replace(COALESCE(p_text, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

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
  v_site_url text;
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
    SELECT oi.quantity, oi.unit_price, public.tg_escape(COALESCE(p.name, 'منتج')) AS pname
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = NEW.id
  LOOP
    v_item_lines := v_item_lines || '  • ' || v_item.pname || ' × ' || v_item.quantity
      || ' = <b>' || (v_item.unit_price * v_item.quantity) || ' دج</b>' || E'\n';
  END LOOP;

  v_payment_label := CASE NEW.payment_method
    WHEN 'cod' THEN '💵 الدفع عند التسليم'
    WHEN 'cash_on_delivery' THEN '💵 الدفع عند التسليم'
    WHEN 'baridimob' THEN '🏦 بريدي موب'
    WHEN 'flexy' THEN '📱 فليكسي'
    ELSE public.tg_escape(COALESCE(NEW.payment_method, '—'))
  END;

  v_delivery_label := CASE NEW.delivery_type
    WHEN 'home' THEN '🏠 توصيل للمنزل'
    WHEN 'office' THEN '🏢 مكتب التوصيل'
    WHEN 'pickup' THEN '📍 نقطة استلام'
    ELSE public.tg_escape(COALESCE(NEW.delivery_type, '—'))
  END;

  SELECT name INTO v_wilaya_name FROM public.wilayas WHERE id = NEW.wilaya_id;

  v_message :=
       '🔔 <b>طلب جديد وارد الآن!</b>' || E'\n'
    || '━━━━━━━━━━━━━━━━' || E'\n'
    || '🧾 <b>رقم الطلب:</b> #' || public.tg_escape(COALESCE(NEW.order_number::text, '—')) || E'\n'
    || '📅 <b>التاريخ:</b> ' || to_char(COALESCE(NEW.created_at, now()) AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI') || E'\n\n'
    || '👤 <b>معلومات العميل</b>' || E'\n'
    || '  الاسم: ' || public.tg_escape(COALESCE(NEW.customer_name, '—')) || E'\n'
    || '  الهاتف: ' || public.tg_escape(COALESCE(NEW.customer_phone, '—')) || E'\n'
    || '  الولاية: ' || public.tg_escape(COALESCE(v_wilaya_name, '—')) || E'\n'
    || '  البلدية: ' || public.tg_escape(COALESCE(NEW.baladiya, '—')) || E'\n'
    || '  العنوان: ' || public.tg_escape(COALESCE(NULLIF(trim(COALESCE(NEW.address, '')), ''), 'لم يُدخل')) || E'\n'
    || '  نوع التوصيل: ' || v_delivery_label || E'\n'
    || '  طريقة الدفع: ' || v_payment_label || E'\n\n'
    || '🛒 <b>المنتجات</b>' || E'\n' || COALESCE(NULLIF(v_item_lines, ''), '  —' || E'\n') || E'\n'
    || '━━━━━━━━━━━━━━━━' || E'\n';

  IF NEW.discount_amount IS NOT NULL AND NEW.discount_amount > 0 THEN
    v_message := v_message || '🏷️ الخصم: -' || NEW.discount_amount || ' دج' || E'\n';
  END IF;

  v_message := v_message
    || CASE WHEN COALESCE(NEW.shipping_cost, 0) > 0
            THEN '🚚 التوصيل: ' || NEW.shipping_cost::text || ' دج'
            ELSE '🚚 التوصيل: <b>مجاني 🎁</b>'
       END || E'\n'
    || '💵 <b>الإجمالي: ' || COALESCE(NEW.total_amount::text, '0') || ' دج</b>' || E'\n'
    || '📦 الحالة الحالية: <b>' || public.tg_escape(COALESCE(NEW.status, '—')) || '</b>';

  IF NEW.payment_receipt_url IS NOT NULL AND length(trim(NEW.payment_receipt_url)) > 0 THEN
    v_message := v_message || E'\n\n' || '🧾 <a href="' || public.tg_escape(NEW.payment_receipt_url) || '">عرض إيصال الدفع</a>';
  END IF;

  -- Optional link to the order in the dashboard (settings key "site_url").
  SELECT value INTO v_site_url FROM public.settings WHERE key = 'site_url';
  IF v_site_url ~ '^https?://' THEN
    v_message := v_message || E'\n' || '🔗 <a href="' || public.tg_escape(rtrim(v_site_url, '/')) || '/admin/orders">فتح الطلب في لوحة التحكم</a>';
  END IF;

  v_reply_markup := public.telegram_order_keyboard(NEW.id);

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

REVOKE EXECUTE ON FUNCTION public.notify_telegram_new_order() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_notify_telegram_new_order ON public.orders;
CREATE CONSTRAINT TRIGGER trg_notify_telegram_new_order
AFTER INSERT ON public.orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_new_order();
