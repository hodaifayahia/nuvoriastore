import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Order matters for restore (parents before children)
const TABLES = [
  "settings",
  "wilayas",
  "baladiyat",
  "delivery_companies",
  "delivery_company_credentials",
  "facebook_pixels",
  "faqs",
  "variation_options",
  "return_reasons",
  "return_settings",
  "confirmation_settings",
  "confirmers",
  "suppliers",
  "supplier_products",
  "supplier_transactions",
  "clients",
  "products",
  "product_variants",
  "product_option_groups",
  "product_option_values",
  "product_variant_options",
  "product_variations",
  "product_offers",
  "product_costs",
  "client_transactions",
  "coupons",
  "coupon_products",
  "reviews",
  "landing_pages",
  "launchpage_pages",
  "launchpage_orders",
  "leads",
  "abandoned_orders",
  "orders",
  "order_items",
  "return_requests",
  "return_items",
  "return_photos",
  "return_status_history",
  "user_roles",
];

const BUCKETS = ["products", "store", "receipts", "returns", "supplier-documents"];

async function listAll(admin: any, bucket: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 100, offset });
    if (error || !data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null && !item.metadata) {
        out.push(...(await listAll(admin, bucket, path)));
      } else {
        out.push(path);
      }
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "export") {
      const tables: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        const rows: unknown[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await admin.from(t).select("*").range(from, from + 999);
          if (error) break;
          rows.push(...(data || []));
          if (!data || data.length < 1000) break;
          from += 1000;
        }
        tables[t] = rows;
      }

      const files: { bucket: string; path: string; url: string }[] = [];
      for (const bucket of BUCKETS) {
        const paths = await listAll(admin, bucket);
        for (let i = 0; i < paths.length; i += 100) {
          const chunk = paths.slice(i, i + 100);
          const { data } = await admin.storage.from(bucket).createSignedUrls(chunk, 3600);
          (data || []).forEach((s: any, idx: number) => {
            if (s?.signedUrl) files.push({ bucket, path: chunk[idx], url: s.signedUrl });
          });
        }
      }

      return json({ exported_at: new Date().toISOString(), tables, files });
    }

    if (action === "import") {
      const tables = (body.tables || {}) as Record<string, any[]>;
      const results: Record<string, string> = {};
      for (const t of TABLES) {
        const rows = tables[t];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        let ok = 0;
        for (let i = 0; i < rows.length; i += 200) {
          const chunk = rows.slice(i, i + 200);
          const { error } = await admin.from(t).upsert(chunk, { onConflict: "id" });
          if (error) {
            results[t] = `error: ${error.message}`;
            break;
          }
          ok += chunk.length;
        }
        if (!results[t]) results[t] = `ok: ${ok}`;
      }
      return json({ ok: true, results });
    }

    if (action === "upload") {
      const { bucket, path, content_base64, content_type } = body;
      if (!BUCKETS.includes(bucket) || typeof path !== "string" || !content_base64) {
        return json({ error: "invalid payload" }, 400);
      }
      const bytes = Uint8Array.from(atob(content_base64), (c) => c.charCodeAt(0));
      const { error } = await admin.storage.from(bucket).upload(path, bytes, {
        upsert: true,
        contentType: content_type || "application/octet-stream",
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
