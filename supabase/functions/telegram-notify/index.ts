import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Customer-supplied text must be escaped, otherwise a name or address with
// "<" or "&" makes Telegram reject the whole HTML message.
function esc(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse body first so we can allow anonymous invocations for automatic
    // new-order notifications (fired from public checkout flows).
    const payload = await req.json().catch(() => ({}));
    const { type, order_id } = payload as { type?: string; order_id?: string };

    // Admin-only operations (like the "test" ping) still require an authenticated admin.
    const requiresAdmin = type !== 'new_order';
    if (requiresAdmin) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ ok: false, reason: 'Unauthorized' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ ok: false, reason: 'Unauthorized' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!isAdmin) {
        return new Response(JSON.stringify({ ok: false, reason: 'Forbidden' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }


    // Fetch telegram settings
    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["telegram_enabled", "telegram_notify_orders", "telegram_bot_token", "telegram_chat_id"]);

    const s: Record<string, string> = {};
    settingsRows?.forEach((r: { key: string; value: string }) => {
      s[r.key] = r.value || "";
    });

    if (s.telegram_enabled !== "true") {
      return new Response(JSON.stringify({ ok: false, reason: "disabled" }), { headers: corsHeaders });
    }

    const botToken = s.telegram_bot_token;
    const chatIds = s.telegram_chat_id?.split(",").map((id: string) => id.trim()).filter(Boolean) || [];

    if (!botToken || chatIds.length === 0) {
      return new Response(JSON.stringify({ ok: false, reason: "no_config" }), { headers: corsHeaders });
    }

    let message = "";

    if (type === "test") {
      message = "✅ <b>رسالة تجريبية</b>\n\nإشعارات تلغرام تعمل بنجاح!";
    } else if (type === "new_order" && order_id) {
      if (s.telegram_notify_orders !== "true") {
        return new Response(JSON.stringify({ ok: false, reason: "orders_disabled" }), { headers: corsHeaders });
      }

      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (!order) {
        return new Response(JSON.stringify({ ok: false, reason: "order_not_found" }), { headers: corsHeaders });
      }

      const { data: orderItems } = await supabase
        .from("order_items")
        .select("quantity, unit_price, product_id")
        .eq("order_id", order_id);

      // Fetch product names
      const productIds = orderItems?.map((i: { product_id: string }) => i.product_id) || [];
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

      const productMap: Record<string, string> = {};
      products?.forEach((p: { id: string; name: string }) => {
        productMap[p.id] = p.name;
      });

      const itemLines = orderItems?.map((i: { product_id: string; quantity: number; unit_price: number }) => {
        const name = productMap[i.product_id] || "منتج";
        return `  • ${esc(name)} × ${i.quantity} = ${i.unit_price * i.quantity} دج`;
      }).join("\n") || "";

      const paymentLabel: Record<string, string> = {
        cod: "الدفع عند التسليم",
        baridimob: "بريدي موب",
        flexy: "فليكسي",
      };

      message = `🛒 <b>طلب جديد #${esc(order.order_number)}</b>\n\n`
        + `👤 ${esc(order.customer_name)}\n`
        + `📱 ${esc(order.customer_phone)}\n`
        + `💰 ${esc(order.total_amount)} دج\n`
        + `💳 ${esc(paymentLabel[order.payment_method || ""] || order.payment_method)}\n\n`
        + `<b>المنتجات:</b>\n${itemLines}\n\n`
        + `📦 الحالة: ${esc(order.status)}`;
    } else {
      return new Response(JSON.stringify({ ok: false, reason: "unknown_type" }), { headers: corsHeaders });
    }

    // Send to all chat IDs
    const results = await Promise.all(
      chatIds.map(async (chatId: string) => {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
        });
        return res.json();
      })
    );

    return new Response(JSON.stringify({ ok: true, results }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
