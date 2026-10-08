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
    const chatId = String(message?.chat?.id || callbackQuery?.from?.id || "");
    const actorId = String(callbackQuery?.from?.id || message?.from?.id || "");
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

    if (!adminIds.includes(chatId) && !adminIds.includes(actorId)) {
      await sendMessage(botToken, chatId, "⛔ غير مصرح لك باستخدام هذا البوت.");
      return new Response("OK");
    }

    // ==================== CALLBACK QUERIES ====================
    if (callbackQuery && messageId) {
      const data = callbackQuery.data || "";
      await answerCallback(botToken, callbackQuery.id);

      // Any button press abandons a pending text prompt.
      if (!data.startsWith("product_edit_price:") && data !== "orders_search") {
        await clearState(supabase, chatId);
      }

      if (data === "menu:main") {
        await editMessage(botToken, chatId, messageId, await mainMenuText(supabase), mainMenuKeyboard());
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
        const code = parts[2];
        const statusMap: Record<string, string> = { n: "جديد", c: "مؤكد", p: "قيد التحضير", s: "تم الشحن", d: "تم التسليم", x: "ملغي" };
        const status = statusMap[code] || code;
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

    // ==================== COMMANDS ====================
    // Commands always run first and clear any pending action, so a forgotten
    // "edit price" / "find order" prompt can never swallow /start or /orders.
    const cmd = text.trim().split(/\s+/)[0].split("@")[0].toLowerCase();
    if (cmd.startsWith("/")) {
      await clearState(supabase, chatId);
      switch (cmd) {
        case "/start":
        case "/menu":
          await sendMainMenu(supabase, botToken, chatId);
          break;
        case "/orders":
          await handleOrders(supabase, botToken, chatId, 0);
          break;
        case "/products":
          await handleProducts(supabase, botToken, chatId, 0);
          break;
        case "/stats":
          await handleStats(supabase, botToken, chatId);
          break;
        case "/help":
          await sendMessage(botToken, chatId, helpText(), backToMainKeyboard());
          break;
        case "/cancel":
          await sendMessage(botToken, chatId, "❌ تم الإلغاء.", backToMainKeyboard());
          break;
        default:
          await sendMainMenu(supabase, botToken, chatId);
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
          await sendMessage(botToken, chatId, `❌ لم يتم العثور على طلب بالرقم <b>${escapeHtml(raw)}</b>.`, {
            inline_keyboard: [
              [{ text: "🔍 بحث آخر", callback_data: "orders_search" }],
              [{ text: "🔙 عودة للطلبات", callback_data: "menu:orders" }],
            ],
          });
          return new Response("OK");
        }
        console.log("find_order matched:", found.order_number, found.id);
        try {
          await sendOrderDetail(supabase, botToken, chatId, found.id);
        } catch (e) {
          console.error("sendOrderDetail failed:", e);
          await sendMessage(botToken, chatId, `❌ خطأ في تحميل الطلب: ${(e as Error).message}`, backToMainKeyboard());
        }
        return new Response("OK");
      }
    }

    // Plain text with no pending action: show the menu.
    await sendMainMenu(supabase, botToken, chatId);
    return new Response("OK");
  } catch (err) {
    console.error("telegram-bot error:", err);
    return new Response("OK");
  }
});

const PAGE_SIZE = 5;

const ORDER_NOT_FOUND = "❌ الطلب غير موجود.\n\n"
  + "إذا كان الطلب ظاهراً في الموقع، فالبوت مربوط بقاعدة بيانات أخرى: "
  + "افتح لوحة التحكم ← الإعدادات ← تلغرام واضغط <b>ربط الويب هوك</b>.";

// ==================== UI HELPERS ====================
async function mainMenuText(supabase: ReturnType<typeof createClient>) {
  // Show live numbers so it is obvious the bot reads the same orders as the site.
  const { data: latest, count, error } = await supabase
    .from("orders")
    .select("order_number, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(1);
  let summary = "";
  if (error) {
    console.error("mainMenuText orders query failed:", error.message);
  } else {
    summary = `\n\n📦 عدد الطلبات: <b>${count ?? 0}</b>`;
    if (latest && latest[0]) summary += `\n🆕 آخر طلب: <b>#${display(latest[0].order_number)}</b> — ${formatDate(latest[0].created_at)}`;
  }
  return `🏠 <b>لوحة الإدارة</b>${summary}\n\nاختر قسماً من الأزرار أدناه:`;
}

async function sendMainMenu(supabase: ReturnType<typeof createClient>, token: string, chatId: string) {
  await sendMessage(token, chatId, await mainMenuText(supabase), mainMenuKeyboard());
}

async function clearState(supabase: ReturnType<typeof createClient>, chatId: string) {
  await supabase.from("telegram_bot_state").upsert({ chat_id: chatId, state: {}, updated_at: new Date().toISOString() });
}

// Edit the message behind a button press, or send a new one for typed commands.
async function show(token: string, chatId: string, messageId: number | undefined, text: string, reply_markup?: unknown) {
  if (messageId) await editMessage(token, chatId, messageId, text, reply_markup);
  else await sendMessage(token, chatId, text, reply_markup);
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
    + "💡 الأوامر: /start • /orders • /products • /stats • /cancel";
}

// ==================== TELEGRAM API ====================
async function sendMessage(token: string, chatId: string, text: string, reply_markup?: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup, disable_web_page_preview: true }),
  });
  const json = await safeTelegramJson(res);
  if (!res.ok || json?.ok === false) {
    console.error("Telegram sendMessage failed:", JSON.stringify({ status: res.status, body: json }));
  }
  return json;
}

async function editMessage(token: string, chatId: string, messageId: number, text: string, reply_markup?: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup, disable_web_page_preview: true }),
  });
  const json = await safeTelegramJson(res);
  if (!res.ok || json?.ok === false) {
    console.error("Telegram editMessage failed:", JSON.stringify({ status: res.status, body: json }));
    // fallback: send as new message if edit fails (e.g. identical content)
    await sendMessage(token, chatId, text, reply_markup);
  }
}

async function safeTelegramJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function display(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return escapeHtml(text || fallback);
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return "—";
  return escapeHtml(d.toLocaleString("fr-DZ", { timeZone: "Africa/Algiers", dateStyle: "short", timeStyle: "short" }));
}

function safeHref(value: unknown): string | null {
  const url = String(value ?? "").trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return escapeHtml(url);
}

async function answerCallback(token: string, callbackId: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId }),
  });
}

// ==================== ORDERS ====================
async function handleOrders(supabase: ReturnType<typeof createClient>, token: string, chatId: string, page: number, messageId?: number) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: orders, count, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, total_amount, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("handleOrders query failed:", error.message);
    await show(token, chatId, messageId, `❌ تعذر تحميل الطلبات: ${escapeHtml(error.message)}`, backToMainKeyboard());
    return;
  }

  if (!orders || orders.length === 0) {
    await show(token, chatId, messageId, "📭 لا توجد طلبات حالياً.", {
      inline_keyboard: [
        [{ text: "🔍 بحث برقم الطلب", callback_data: "orders_search" }],
        [{ text: "🏠 القائمة الرئيسية", callback_data: "menu:main" }],
      ],
    });
    return;
  }

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  let msg = `📋 <b>الطلبات</b>  <i>(${page + 1}/${totalPages})</i>\n`
    + `━━━━━━━━━━━━━━━━\n\n`;

  const statusEmoji: Record<string, string> = { "جديد": "🆕", "مؤكد": "✅", "قيد التحضير": "📦", "تم الشحن": "🚚", "تم التسليم": "✔️", "ملغي": "❌" };
  orders.forEach((o) => {
    msg += `${statusEmoji[o.status] || "📄"} <b>#${display(o.order_number)}</b> — ${display(o.customer_name)}\n`
      + `   📱 ${display(o.customer_phone)}\n`
      + `   💰 ${display(o.total_amount)} دج  •  ${display(o.status)}\n`
      + `   📅 ${formatDate(o.created_at)}\n\n`;
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

  await show(token, chatId, messageId, msg, { inline_keyboard: buttons });
}

async function buildOrderDetail(supabase: ReturnType<typeof createClient>, orderId: string) {
  const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (orderError) {
    console.error("buildOrderDetail order query failed:", orderError.message);
    throw orderError;
  }
  if (!order) return null;

  let wilayaName = "—";
  if (order.wilaya_id) {
    const { data: wilaya, error: wilayaError } = await supabase
      .from("wilayas")
      .select("name")
      .eq("id", order.wilaya_id)
      .maybeSingle();
    if (wilayaError) {
      console.error("buildOrderDetail wilaya query failed:", wilayaError.message);
    } else if (wilaya?.name) {
      wilayaName = wilaya.name;
    }
  }

  const { data: items, error: itemsError } = await supabase.from("order_items").select("quantity, unit_price, product_id").eq("order_id", orderId);
  if (itemsError) {
    console.error("buildOrderDetail items query failed:", itemsError.message);
    throw itemsError;
  }
  const productIds = (items?.map((i: { product_id: string | null }) => i.product_id).filter(Boolean) as string[]) || [];
  const pMap: Record<string, string> = {};
  if (productIds.length > 0) {
    const { data: products, error: productsError } = await supabase.from("products").select("id, name").in("id", productIds);
    if (productsError) {
      console.error("buildOrderDetail products query failed:", productsError.message);
      throw productsError;
    }
    products?.forEach((p: { id: string; name: string }) => { pMap[p.id] = p.name; });
  }

  const paymentLabel: Record<string, string> = { cod: "عند التسليم", cash_on_delivery: "عند التسليم", baridimob: "بريدي موب", flexy: "فليكسي" };
  const deliveryLabel: Record<string, string> = { home: "توصيل للمنزل", office: "مكتب التوصيل", pickup: "نقطة استلام", digital: "منتج رقمي" };

  let msg = `🧾 <b>طلب #${display(order.order_number)}</b>\n`
    + `━━━━━━━━━━━━━━━━\n\n`
    + `👤 <b>${display(order.customer_name)}</b>\n`
    + `📱 ${display(order.customer_phone)}\n`
    + `📍 الولاية: <b>${display(wilayaName)}</b>\n`
    + `🏘️ البلدية: <b>${display(order.baladiya)}</b>\n`
    + `🏠 العنوان: ${display(order.address, "لم يُدخل")}\n`
    + `🚚 نوع التوصيل: ${display(deliveryLabel[order.delivery_type || ""] || order.delivery_type)}\n`
    + `💳 ${display(paymentLabel[order.payment_method || ""] || order.payment_method)}\n`
    + `📦 الحالة: <b>${display(order.status)}</b>\n\n`
    + `<b>🛒 المنتجات:</b>\n`;

  if (items && items.length > 0) {
    items.forEach((i: { product_id: string | null; quantity: number; unit_price: number }) => {
      const name = (i.product_id && pMap[i.product_id]) || "منتج";
      msg += `  • ${display(name)} × ${display(i.quantity)} = <b>${display(i.unit_price * i.quantity)} دج</b>\n`;
    });
  } else {
    msg += `  —\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━\n`;
  if (order.subtotal) msg += `المجموع الفرعي: ${display(order.subtotal)} دج\n`;
  if (order.discount_amount) msg += `🏷️ الخصم: -${display(order.discount_amount)} دج\n`;
  msg += Number(order.shipping_cost || 0) > 0
    ? `🚚 التوصيل: ${display(order.shipping_cost)} دج\n`
    : `🚚 التوصيل: <b>مجاني 🎁</b>\n`;
  msg += `💵 <b>الإجمالي: ${display(order.total_amount)} دج</b>`;

  const receiptUrl = safeHref(order.payment_receipt_url);
  if (receiptUrl) {
    msg += `\n\n🧾 <a href="${receiptUrl}">عرض إيصال الدفع</a>`;
  }

  const statuses = ["جديد", "مؤكد", "قيد التحضير", "تم الشحن", "تم التسليم", "ملغي"];
  const statusCode: Record<string, string> = { "جديد": "n", "مؤكد": "c", "قيد التحضير": "p", "تم الشحن": "s", "تم التسليم": "d", "ملغي": "x" };
  const statusEmoji: Record<string, string> = { "جديد": "🆕", "مؤكد": "✅", "قيد التحضير": "📦", "تم الشحن": "🚚", "تم التسليم": "✔️", "ملغي": "❌" };
  msg += `\n\n<b>🔄 غيّر الحالة:</b>`;
  const statusButtons = statuses
    .filter((st) => st !== order.status)
    .map((st) => ({ text: `${statusEmoji[st]} ${st}`, callback_data: `order_status:${order.id}:${statusCode[st]}` }));

  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < statusButtons.length; i += 2) keyboard.push(statusButtons.slice(i, i + 2));

  keyboard.push([
    { text: "🔙 عودة للطلبات", callback_data: "menu:orders" },
    { text: "🏠 الرئيسية", callback_data: "menu:main" },
  ]);

  return { msg, keyboard };
}

async function handleOrderDetail(supabase: ReturnType<typeof createClient>, token: string, chatId: string, orderId: string, messageId: number) {
  const built = await buildOrderDetail(supabase, orderId);
  if (!built) {
    await editMessage(token, chatId, messageId, ORDER_NOT_FOUND, backToMainKeyboard());
    return;
  }
  await editMessage(token, chatId, messageId, built.msg, { inline_keyboard: built.keyboard });
}

async function sendOrderDetail(supabase: ReturnType<typeof createClient>, token: string, chatId: string, orderId: string) {
  const built = await buildOrderDetail(supabase, orderId);
  if (!built) {
    await sendMessage(token, chatId, ORDER_NOT_FOUND, backToMainKeyboard());
    return;
  }
  await sendMessage(token, chatId, built.msg, { inline_keyboard: built.keyboard });
}

async function handleOrderStatusUpdate(supabase: ReturnType<typeof createClient>, token: string, chatId: string, orderId: string, status: string, messageId: number) {
  await supabase.from("orders").update({ status }).eq("id", orderId);
  await handleOrderDetail(supabase, token, chatId, orderId, messageId);
  await sendMessage(token, chatId, `✅ تم تحديث الحالة إلى: <b>${escapeHtml(status)}</b>`);
}

// ==================== PRODUCTS ====================
async function handleProducts(supabase: ReturnType<typeof createClient>, token: string, chatId: string, page: number, messageId?: number) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: products, count } = await supabase
    .from("products")
    .select("id, name, price, is_active, stock", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!products || products.length === 0) {
    await show(token, chatId, messageId, "📭 لا توجد منتجات.", backToMainKeyboard());
    return;
  }

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  let msg = `📦 <b>المنتجات</b>  <i>(${page + 1}/${totalPages})</i>\n`
    + `━━━━━━━━━━━━━━━━\n\n`;

  products.forEach((p) => {
    const status = p.is_active ? "🟢" : "🔴";
    msg += `${status} <b>${display(p.name)}</b>\n   💰 ${display(p.price)} دج  •  📊 ${display(p.stock ?? 0)}\n\n`;
  });

  const buttons: Array<Array<{ text: string; callback_data: string }>> = [];
  const detailRow = products.map((p) => ({ text: `📦 ${String(p.name ?? "").substring(0, 18)}`, callback_data: `product_detail:${p.id}` }));
  for (let i = 0; i < detailRow.length; i += 2) buttons.push(detailRow.slice(i, i + 2));

  const navRow: Array<{ text: string; callback_data: string }> = [];
  if (page > 0) navRow.push({ text: "⬅️ السابق", callback_data: `products_page:${page - 1}` });
  if (page < totalPages - 1) navRow.push({ text: "التالي ➡️", callback_data: `products_page:${page + 1}` });
  if (navRow.length > 0) buttons.push(navRow);

  buttons.push([{ text: "🏠 القائمة الرئيسية", callback_data: "menu:main" }]);

  await show(token, chatId, messageId, msg, { inline_keyboard: buttons });
}

async function handleProductDetail(supabase: ReturnType<typeof createClient>, token: string, chatId: string, productId: string, messageId: number) {
  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();
  if (!product) {
    await editMessage(token, chatId, messageId, "❌ المنتج غير موجود.", backToMainKeyboard());
    return;
  }

  const status = product.is_active ? "🟢 مفعّل" : "🔴 معطّل";
  let msg = `📦 <b>${display(product.name)}</b>\n`
    + `━━━━━━━━━━━━━━━━\n\n`
    + `💰 السعر: <b>${product.price} دج</b>\n`
    + `📊 المخزون: <b>${product.stock ?? 0}</b>\n`
    + `📂 الفئة: ${display(product.category?.join("، "))}\n`
    + `الحالة: ${status}\n`;

  if (product.description) msg += `\n📝 ${escapeHtml(String(product.description).substring(0, 300))}`;

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
  catSet.forEach((c) => { msg += `  🏷️  ${escapeHtml(c)}\n`; });

  await editMessage(token, chatId, messageId, msg, backToMainKeyboard());
}

// ==================== STATS ====================
async function handleStats(supabase: ReturnType<typeof createClient>, token: string, chatId: string, messageId?: number) {
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
    msg += `  ${statusEmoji[status] || "•"} ${escapeHtml(status)}: <b>${count}</b>\n`;
  });

  await show(token, chatId, messageId, msg, backToMainKeyboard());
}
