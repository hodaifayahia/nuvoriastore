import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const update = await req.json();
    const callbackQuery = update.callback_query;
    const message = update.message || callbackQuery?.message;
    const chatId = String(callbackQuery?.from?.id || message?.chat?.id || "");
    const text = update.message?.text || "";
    const messageId = callbackQuery?.message?.message_id as number | undefined;

    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["telegram_bot_token", "telegram_chat_id"]);

    const s: Record<string, string> = {};
    settingsRows?.forEach((r: { key: string; value: string }) => {
      s[r.key] = r.value || "";
    });

    const botToken = s.telegram_bot_token;
    if (!botToken) return new Response("OK");

    const adminIds = s.telegram_chat_id?.split(",").map((id: string) => id.trim()).filter(Boolean) || [];

    if (!adminIds.includes(chatId)) {
      await sendMessage(botToken, chatId, "⛔ غير مصرح لك باستخدام هذا البوت.");
      return new Response("OK");
    }

    // ==================== CALLBACK QUERIES ====================
    if (callbackQuery && messageId) {
      const data = callbackQuery.data || "";
      await answerCallback(botToken, callbackQuery.id);

      if (data === "menu:main") {
        await editMessage(botToken, chatId, messageId, mainMenuText(), mainMenuKeyboard());
      } else if (data === "menu:orders" || data.startsWith("orders_page:")) {
        const page = data.startsWith("orders_page:") ? parseInt(data.split(":")[1]) : 0;
        await handleOrders(supabase, botToken, chatId, page, messageId);
      } else if (data === "orders_search") {
        await supabase.from("telegram_bot_state").upsert({
          chat_id: chatId,
          state: { action: "find_order" },
          updated_at: new Date().toISOString(),
        });
        await sendMessage(botToken, chatId, "🔍 أرسل رقم الطلب (مثال: <b>ORD-001</b> أو <b>001</b>):\n\nأو أرسل /cancel للإلغاء", {
          inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "menu:orders" }]],
        });
      } else if (data === "menu:products" || data.startsWith("products_page:")) {
        const page = data.startsWith("products_page:") ? parseInt(data.split(":")[1]) : 0;
        await handleProducts(supabase, botToken, chatId, page, messageId);
      } else if (data === "menu:categories") {
        await handleCategories(supabase, botToken, chatId, messageId);
      } else if (data === "menu:stats") {
        await handleStats(supabase, botToken, chatId, messageId);
      } else if (data === "menu:help") {
        await editMessage(botToken, chatId, messageId, helpText(), backToMainKeyboard());
      } else if (data.startsWith("order_detail:")) {
        const orderId = data.split(":")[1];
        await handleOrderDetail(supabase, botToken, chatId, orderId, messageId);
      } else if (data.startsWith("order_status:")) {
        const parts = data.split(":");
        const orderId = parts[1];
        const status = parts.slice(2).join(":");
        await handleOrderStatusUpdate(supabase, botToken, chatId, orderId, status, messageId);
      } else if (data.startsWith("product_detail:")) {
        const productId = data.split(":")[1];
        await handleProductDetail(supabase, botToken, chatId, productId, messageId);
      } else if (data.startsWith("product_toggle:")) {
        const productId = data.split(":")[1];
        await handleProductToggle(supabase, botToken, chatId, productId, messageId);
      } else if (data.startsWith("product_edit_price:")) {
        const productId = data.split(":")[1];
        await supabase.from("telegram_bot_state").upsert({
          chat_id: chatId,
          state: { action: "edit_price", product_id: productId },
          updated_at: new Date().toISOString(),
        });
        await sendMessage(botToken, chatId, "✏️ أرسل السعر الجديد (رقم فقط):\n\nأو أرسل /cancel للإلغاء", {
          inline_keyboard: [[{ text: "❌ إلغاء", callback_data: `product_detail:${productId}` }]],
        });
      }
      return new Response("OK");
    }

    // ==================== STATEFUL FLOW ====================
    const { data: stateRow } = await supabase
      .from("telegram_bot_state")
      .select("state")
      .eq("chat_id", chatId)
      .maybeSingle();

    if (stateRow?.state && (stateRow.state as Record<string, unknown>).action) {
      const state = stateRow.state as Record<string, string>;
      if (text === "/cancel") {
        await supabase.from("telegram_bot_state").upsert({ chat_id: chatId, state: {}, updated_at: new Date().toISOString() });
        await sendMessage(botToken, chatId, "❌ تم الإلغاء.", { inline_keyboard: [[{ text: "🏠 القائمة الرئيسية", callback_data: "menu:main" }]] });
        return new Response("OK");
      }
      if (state.action === "edit_price") {
        const newPrice = parseFloat(text);
        if (isNaN(newPrice) || newPrice <= 0) {
          await sendMessage(botToken, chatId, "❌ أدخل سعراً صحيحاً (رقم موجب).");
        } else {
          await supabase.from("products").update({ price: newPrice }).eq("id", state.product_id);
          await sendMessage(botToken, chatId, `✅ تم تحديث السعر إلى <b>${newPrice} دج</b>`, {
            inline_keyboard: [
              [{ text: "🔙 عودة للمنتج", callback_data: `product_detail:${state.product_id}` }],
              [{ text: "🏠 القائمة الرئيسية", callback_data: "menu:main" }],
            ],
          });
        }
        await supabase.from("telegram_bot_state").upsert({ chat_id: chatId, state: {}, updated_at: new Date().toISOString() });
        return new Response("OK");
      }
      if (state.action === "find_order") {
        await supabase.from("telegram_bot_state").upsert({ chat_id: chatId, state: {}, updated_at: new Date().toISOString() });
        const raw = (text || "").trim().toUpperCase();
        if (!raw) {
          await sendMessage(botToken, chatId, "❌ رقم فارغ. حاول مجدداً من قائمة الطلبات.", backToMainKeyboard());
          return new Response("OK");
        }
        // Accept "001", "ORD-001", or "#ORD-001"
        const cleaned = raw.replace(/^#/, "");
        const candidates = [cleaned];
        if (!cleaned.startsWith("ORD-")) {
          const digits = cleaned.replace(/\D/g, "");
          if (digits) candidates.push(`ORD-${digits.padStart(3, "0")}`);
        }
        const { data: found } = await supabase
          .from("orders")
          .select("id, order_number")
          .in("order_number", candidates)
          .limit(1)
          .maybeSingle();
        if (!found) {
          await sendMessage(botToken, chatId, `❌ لم يتم العثور على طلب بالرقم <b>${raw}</b>.`, {
            inline_keyboard: [
              [{ text: "🔍 بحث آخر", callback_data: "orders_search" }],
              [{ text: "🔙 عودة للطلبات", callback_data: "menu:orders" }],
            ],
          });
          return new Response("OK");
        }
        // Send fresh detail message (no messageId to edit from a text message flow)
        const sent = await sendMessage(botToken, chatId, "⏳ جاري تحميل الطلب...");
        if (sent?.result?.message_id) {
          await handleOrderDetail(supabase, botToken, chatId, found.id, sent.result.message_id);
        }
        return new Response("OK");
      }
    }

    // ==================== COMMANDS ====================
    const cmd = text.split(" ")[0].toLowerCase();
    switch (cmd) {
      case "/start":
      case "/menu":
        await sendMessage(botToken, chatId, mainMenuText(), mainMenuKeyboard());
        break;
      case "/orders":
        await sendMessage(botToken, chatId, "⏳ ...", mainMenuKeyboard());
        break;
      case "/help":
        await sendMessage(botToken, chatId, helpText(), backToMainKeyboard());
        break;
      case "/cancel":
        await sendMessage(botToken, chatId, "لا يوجد إجراء نشط.", backToMainKeyboard());
        break;
      default:
        await sendMessage(botToken, chatId, "👋 اضغط على زر لبدء التصفح:", mainMenuKeyboard());
    }

    return new Response("OK");
  } catch (err) {
    console.error("telegram-bot error:", err);
    return new Response("OK");
  }
});

const PAGE_SIZE = 5;

// ==================== UI HELPERS ====================
function mainMenuText() {
  return "🏠 <b>لوحة الإدارة</b>\n\nاختر قسماً من الأزرار أدناه:";
}

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📋 الطلبات", callback_data: "menu:orders" },
        { text: "📦 المنتجات", callback_data: "menu:products" },
      ],
      [
        { text: "📂 الفئات", callback_data: "menu:categories" },
        { text: "📊 الإحصائيات", callback_data: "menu:stats" },
      ],
      [{ text: "📖 المساعدة", callback_data: "menu:help" }],
    ],
  };
}

function backToMainKeyboard() {
  return { inline_keyboard: [[{ text: "🏠 القائمة الرئيسية", callback_data: "menu:main" }]] };
}

function helpText() {
  return "📖 <b>دليل الاستخدام</b>\n\n"
    + "📋 <b>الطلبات</b> — عرض آخر الطلبات، مراجعة التفاصيل، وتغيير الحالة.\n\n"
    + "📦 <b>المنتجات</b> — تصفح المنتجات، تفعيل/تعطيل، وتعديل الأسعار.\n\n"
    + "📂 <b>الفئات</b> — عرض جميع فئات المتجر.\n\n"
    + "📊 <b>الإحصائيات</b> — نظرة عامة على الأداء.\n\n"
    + "💡 استخدم /menu لفتح القائمة في أي وقت.";
}

// ==================== TELEGRAM API ====================
async function sendMessage(token: string, chatId: string, text: string, reply_markup?: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup, disable_web_page_preview: true }),
  });
  try { return await res.json(); } catch { return null; }
}

async function editMessage(token: string, chatId: string, messageId: number, text: string, reply_markup?: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup, disable_web_page_preview: true }),
  });
  if (!res.ok) {
    // fallback: send as new message if edit fails (e.g. identical content)
    await sendMessage(token, chatId, text, reply_markup);
  }
}

async function answerCallback(token: string, callbackId: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId }),
  });
}

// ==================== ORDERS ====================
async function handleOrders(supabase: ReturnType<typeof createClient>, token: string, chatId: string, page: number, messageId: number) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: orders, count } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, total_amount, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!orders || orders.length === 0) {
    await editMessage(token, chatId, messageId, "📭 لا توجد طلبات حالياً.", backToMainKeyboard());
    return;
  }

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  let msg = `📋 <b>الطلبات</b>  <i>(${page + 1}/${totalPages})</i>\n`
    + `━━━━━━━━━━━━━━━━\n\n`;

  const statusEmoji: Record<string, string> = { "جديد": "🆕", "مؤكد": "✅", "قيد التحضير": "📦", "تم الشحن": "🚚", "تم التسليم": "✔️", "ملغي": "❌" };
  orders.forEach((o) => {
    msg += `${statusEmoji[o.status] || "📄"} <b>#${o.order_number}</b> — ${o.customer_name}\n`
      + `   💰 ${o.total_amount} دج  •  ${o.status}\n\n`;
  });

  const buttons: Array<Array<{ text: string; callback_data: string }>> = [];
  const detailRow = orders.map((o) => ({ text: `🧾 #${o.order_number}`, callback_data: `order_detail:${o.id}` }));
  for (let i = 0; i < detailRow.length; i += 2) buttons.push(detailRow.slice(i, i + 2));

  const navRow: Array<{ text: string; callback_data: string }> = [];
  if (page > 0) navRow.push({ text: "⬅️ السابق", callback_data: `orders_page:${page - 1}` });
  if (page < totalPages - 1) navRow.push({ text: "التالي ➡️", callback_data: `orders_page:${page + 1}` });
  if (navRow.length > 0) buttons.push(navRow);

  buttons.push([{ text: "🔍 بحث برقم الطلب", callback_data: "orders_search" }]);
  buttons.push([{ text: "🏠 القائمة الرئيسية", callback_data: "menu:main" }]);

  await editMessage(token, chatId, messageId, msg, { inline_keyboard: buttons });
}

async function handleOrderDetail(supabase: ReturnType<typeof createClient>, token: string, chatId: string, orderId: string, messageId: number) {
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) {
    await editMessage(token, chatId, messageId, "❌ الطلب غير موجود.", backToMainKeyboard());
    return;
  }

  const { data: items } = await supabase.from("order_items").select("quantity, unit_price, product_id").eq("order_id", orderId);
  const productIds = items?.map((i: { product_id: string }) => i.product_id) || [];
  const { data: products } = await supabase.from("products").select("id, name").in("id", productIds);
  const pMap: Record<string, string> = {};
  products?.forEach((p: { id: string; name: string }) => { pMap[p.id] = p.name; });

  const paymentLabel: Record<string, string> = { cod: "عند التسليم", baridimob: "بريدي موب", flexy: "فليكسي" };

  let msg = `🧾 <b>طلب #${order.order_number}</b>\n`
    + `━━━━━━━━━━━━━━━━\n\n`
    + `👤 <b>${order.customer_name}</b>\n`
    + `📱 ${order.customer_phone}\n`
    + `📍 ${order.baladiya || order.address || "—"}\n`
    + `💳 ${paymentLabel[order.payment_method || ""] || order.payment_method || "—"}\n`
    + `📦 الحالة: <b>${order.status}</b>\n\n`
    + `<b>🛒 المنتجات:</b>\n`;

  items?.forEach((i: { product_id: string; quantity: number; unit_price: number }) => {
    msg += `  • ${pMap[i.product_id] || "منتج"} × ${i.quantity} = <b>${i.unit_price * i.quantity} دج</b>\n`;
  });

  msg += `\n━━━━━━━━━━━━━━━━\n`;
  if (order.subtotal) msg += `المجموع الفرعي: ${order.subtotal} دج\n`;
  if (order.discount_amount) msg += `🏷️ الخصم: -${order.discount_amount} دج\n`;
  if (order.shipping_cost) msg += `🚚 التوصيل: ${order.shipping_cost} دج\n`;
  msg += `💵 <b>الإجمالي: ${order.total_amount} دج</b>`;

  if (order.payment_receipt_url) {
    msg += `\n\n🧾 <a href="${order.payment_receipt_url}">عرض إيصال الدفع</a>`;
  }

  const statuses = ["جديد", "مؤكد", "قيد التحضير", "تم الشحن", "تم التسليم", "ملغي"];
  const statusEmoji: Record<string, string> = { "جديد": "🆕", "مؤكد": "✅", "قيد التحضير": "📦", "تم الشحن": "🚚", "تم التسليم": "✔️", "ملغي": "❌" };
  msg += `\n\n<b>🔄 غيّر الحالة:</b>`;
  const statusButtons = statuses
    .filter((st) => st !== order.status)
    .map((st) => ({ text: `${statusEmoji[st]} ${st}`, callback_data: `order_status:${order.id}:${st}` }));

  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < statusButtons.length; i += 2) keyboard.push(statusButtons.slice(i, i + 2));

  keyboard.push([
    { text: "🔙 عودة للطلبات", callback_data: "menu:orders" },
    { text: "🏠 الرئيسية", callback_data: "menu:main" },
  ]);

  await editMessage(token, chatId, messageId, msg, { inline_keyboard: keyboard });
}

async function handleOrderStatusUpdate(supabase: ReturnType<typeof createClient>, token: string, chatId: string, orderId: string, status: string, messageId: number) {
  await supabase.from("orders").update({ status }).eq("id", orderId);
  await handleOrderDetail(supabase, token, chatId, orderId, messageId);
  await sendMessage(token, chatId, `✅ تم تحديث الحالة إلى: <b>${status}</b>`);
}

// ==================== PRODUCTS ====================
async function handleProducts(supabase: ReturnType<typeof createClient>, token: string, chatId: string, page: number, messageId: number) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: products, count } = await supabase
    .from("products")
    .select("id, name, price, is_active, stock", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!products || products.length === 0) {
    await editMessage(token, chatId, messageId, "📭 لا توجد منتجات.", backToMainKeyboard());
    return;
  }

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  let msg = `📦 <b>المنتجات</b>  <i>(${page + 1}/${totalPages})</i>\n`
    + `━━━━━━━━━━━━━━━━\n\n`;

  products.forEach((p) => {
    const status = p.is_active ? "🟢" : "🔴";
    msg += `${status} <b>${p.name}</b>\n   💰 ${p.price} دج  •  📊 ${p.stock ?? 0}\n\n`;
  });

  const buttons: Array<Array<{ text: string; callback_data: string }>> = [];
  const detailRow = products.map((p) => ({ text: `📦 ${p.name.substring(0, 18)}`, callback_data: `product_detail:${p.id}` }));
  for (let i = 0; i < detailRow.length; i += 2) buttons.push(detailRow.slice(i, i + 2));

  const navRow: Array<{ text: string; callback_data: string }> = [];
  if (page > 0) navRow.push({ text: "⬅️ السابق", callback_data: `products_page:${page - 1}` });
  if (page < totalPages - 1) navRow.push({ text: "التالي ➡️", callback_data: `products_page:${page + 1}` });
  if (navRow.length > 0) buttons.push(navRow);

  buttons.push([{ text: "🏠 القائمة الرئيسية", callback_data: "menu:main" }]);

  await editMessage(token, chatId, messageId, msg, { inline_keyboard: buttons });
}

async function handleProductDetail(supabase: ReturnType<typeof createClient>, token: string, chatId: string, productId: string, messageId: number) {
  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();
  if (!product) {
    await editMessage(token, chatId, messageId, "❌ المنتج غير موجود.", backToMainKeyboard());
    return;
  }

  const status = product.is_active ? "🟢 مفعّل" : "🔴 معطّل";
  let msg = `📦 <b>${product.name}</b>\n`
    + `━━━━━━━━━━━━━━━━\n\n`
    + `💰 السعر: <b>${product.price} دج</b>\n`
    + `📊 المخزون: <b>${product.stock ?? 0}</b>\n`
    + `📂 الفئة: ${product.category?.join("، ") || "—"}\n`
    + `الحالة: ${status}\n`;

  if (product.description) msg += `\n📝 ${product.description.substring(0, 300)}`;

  const toggleText = product.is_active ? "🔴 تعطيل" : "🟢 تفعيل";
  const keyboard = [
    [
      { text: toggleText, callback_data: `product_toggle:${product.id}` },
      { text: "✏️ تعديل السعر", callback_data: `product_edit_price:${product.id}` },
    ],
    [
      { text: "🔙 عودة للمنتجات", callback_data: "menu:products" },
      { text: "🏠 الرئيسية", callback_data: "menu:main" },
    ],
  ];

  await editMessage(token, chatId, messageId, msg, { inline_keyboard: keyboard });
}

async function handleProductToggle(supabase: ReturnType<typeof createClient>, token: string, chatId: string, productId: string, messageId: number) {
  const { data: product } = await supabase.from("products").select("is_active").eq("id", productId).single();
  if (!product) {
    await editMessage(token, chatId, messageId, "❌ المنتج غير موجود.", backToMainKeyboard());
    return;
  }
  const newStatus = !product.is_active;
  await supabase.from("products").update({ is_active: newStatus }).eq("id", productId);
  await handleProductDetail(supabase, token, chatId, productId, messageId);
}

// ==================== CATEGORIES ====================
async function handleCategories(supabase: ReturnType<typeof createClient>, token: string, chatId: string, messageId: number) {
  const { data: products } = await supabase.from("products").select("category");
  const catSet = new Set<string>();
  products?.forEach((p: { category: string[] }) => {
    p.category?.forEach((c: string) => catSet.add(c));
  });

  if (catSet.size === 0) {
    await editMessage(token, chatId, messageId, "📭 لا توجد فئات.", backToMainKeyboard());
    return;
  }

  let msg = "📂 <b>الفئات</b>\n━━━━━━━━━━━━━━━━\n\n";
  catSet.forEach((c) => { msg += `  🏷️  ${c}\n`; });

  await editMessage(token, chatId, messageId, msg, backToMainKeyboard());
}

// ==================== STATS ====================
async function handleStats(supabase: ReturnType<typeof createClient>, token: string, chatId: string, messageId: number) {
  const { data: orders } = await supabase.from("orders").select("total_amount, status");
  const { count: productCount } = await supabase.from("products").select("id", { count: "exact", head: true });

  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum: number, o: { total_amount: number | null }) => sum + (o.total_amount || 0), 0) || 0;

  const statusCounts: Record<string, number> = {};
  orders?.forEach((o: { status: string | null }) => {
    const st = o.status || "غير محدد";
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });

  const statusEmoji: Record<string, string> = { "جديد": "🆕", "مؤكد": "✅", "قيد التحضير": "📦", "تم الشحن": "🚚", "تم التسليم": "✔️", "ملغي": "❌" };

  let msg = "📊 <b>إحصائيات المتجر</b>\n"
    + `━━━━━━━━━━━━━━━━\n\n`
    + `📦 إجمالي الطلبات: <b>${totalOrders}</b>\n`
    + `💰 إجمالي الإيرادات: <b>${totalRevenue} دج</b>\n`
    + `🛍️ عدد المنتجات: <b>${productCount || 0}</b>\n\n`
    + "<b>توزيع الحالات:</b>\n";

  Object.entries(statusCounts).forEach(([status, count]) => {
    msg += `  ${statusEmoji[status] || "•"} ${status}: <b>${count}</b>\n`;
  });

  await editMessage(token, chatId, messageId, msg, backToMainKeyboard());
}
