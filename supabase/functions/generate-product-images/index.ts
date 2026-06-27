import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { products } = await req.json();

    if (!products || !Array.isArray(products)) {
      throw new Error("products array required");
    }

    const results: { productId: string; imageUrl: string }[] = [];

    for (const product of products) {
      const { id, name, prompt } = product;

      console.log(`Generating image for: ${name}`);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`AI error for ${name}:`, response.status, errText);
        continue;
      }

      const data = await response.json();
      const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageData) {
        console.error(`No image generated for ${name}`);
        continue;
      }

      // Extract base64 data
      const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
      const binaryData = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const fileName = `${id}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(fileName, binaryData, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload error for ${name}:`, uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage.from("products").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // Update product images array
      const { data: existing } = await supabase
        .from("products")
        .select("images")
        .eq("id", id)
        .single();

      const currentImages = existing?.images || [];
      const { error: updateError } = await supabase
        .from("products")
        .update({ images: [...currentImages, publicUrl] })
        .eq("id", id);

      if (updateError) {
        console.error(`Update error for ${name}:`, updateError);
        continue;
      }

      results.push({ productId: id, imageUrl: publicUrl });
      console.log(`✅ Image generated for ${name}: ${publicUrl}`);

      // Small delay between requests to avoid rate limits
      await new Promise((r) => setTimeout(r, 2000));
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
