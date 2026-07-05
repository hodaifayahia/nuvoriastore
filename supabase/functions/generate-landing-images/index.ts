import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

async function genImage(apiKey: string, prompt: string, referenceImage?: string): Promise<string | null> {
  const content: any[] = [{ type: "text", text: prompt }];
  if (referenceImage) {
    content.push({ type: "image_url", image_url: { url: referenceImage } });
  }
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    console.error("image gen failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  return b64 ? `data:image/png;base64,${b64}` : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { productName, description, referenceImage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const desc = description || productName;
    const prompts = {
      hero: `Ultra premium editorial product photograph of "${productName}" (${desc}). Luxury magazine cover style, cinematic soft lighting, elegant minimal studio background, shallow depth of field, high-end commercial photography, 8k, photorealistic. Match the visual style and colors of the reference product image.`,
      lifestyle: `Aspirational lifestyle scene showing "${productName}" (${desc}) in real premium use. Warm natural light, luxurious modern environment, elegant hands or subtle human presence, high-end brand advertising aesthetic, editorial photography, photorealistic, cinematic.`,
      before: `Documentary style photograph illustrating the PROBLEM before using "${productName}". Muted desaturated tones, dull moody lighting, showing frustration or lack, realistic candid moment, no text, photorealistic.`,
      after: `Bright joyful photograph illustrating the TRANSFORMATION after using "${productName}" (${desc}). Vibrant warm lighting, happy confident subject, premium lifestyle setting, glowing atmosphere, no text, photorealistic, cinematic.`,
    };

    const [hero, lifestyle, before, after] = await Promise.all([
      genImage(LOVABLE_API_KEY, prompts.hero, referenceImage),
      genImage(LOVABLE_API_KEY, prompts.lifestyle, referenceImage),
      genImage(LOVABLE_API_KEY, prompts.before),
      genImage(LOVABLE_API_KEY, prompts.after),
    ]);

    return new Response(JSON.stringify({ hero, lifestyle, before, after }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-landing-images error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
