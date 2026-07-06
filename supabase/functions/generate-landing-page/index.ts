import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function generateText(payload: {
  productName: string;
  productDescription: string;
  targetAudience: string;
  tone: string;
}) {
  const system = `You are a world-class DTC copywriter. Write persuasive, benefit-driven landing page copy.
Return ONLY valid JSON matching this exact schema:
{
  "headline": "string (max 12 words)",
  "subheadline": "string (max 25 words)",
  "ctaText": "string (max 4 words)",
  "benefits": [{"title":"string","description":"string"}, {...}, {...}],
  "before": "string (2-3 sentences describing the painful 'before' state)",
  "after": "string (2-3 sentences describing the delightful 'after' state)",
  "testimonials": [
    {"name":"string","quote":"string (1-2 sentences)","role":"string"},
    {"name":"string","quote":"string","role":"string"},
    {"name":"string","quote":"string","role":"string"}
  ],
  "howItWorks": [
    {"step":"1","title":"string","description":"string (1 sentence)"},
    {"step":"2","title":"string","description":"string"},
    {"step":"3","title":"string","description":"string"}
  ],
  "trustBadges": ["string","string","string","string"]
}`;

  const user = `Product: ${payload.productName}
Description: ${payload.productDescription}
Target audience: ${payload.targetAudience}
Tone: ${payload.tone}

Write conversion-focused copy in the "${payload.tone}" tone for this audience.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    throw new Error(`Text gen failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}

async function generateImage(prompt: string): Promise<string | null> {
  try {
    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-image-2",
          prompt,
          size: "1024x1024",
          quality: "low",
          n: 1,
        }),
      },
    );
    if (!res.ok) {
      console.error("image gen failed", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch (e) {
    console.error("image gen error", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Optional auth — allow anonymous sessions.
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getClaims(token);
      userId = data?.claims?.sub ?? null;
    }

    const body = await req.json();
    const {
      productName,
      productDescription = "",
      targetAudience = "general consumers",
      tone = "Premium",
      mode = "full", // full | text | image
      section, // for image regen: 'hero'|'before'|'after'|'mechanism'
      imagePrompt,
    } = body ?? {};

    // Partial regen: single image
    if (mode === "image" && imagePrompt) {
      const url = await generateImage(imagePrompt);
      return new Response(JSON.stringify({ image: url, section }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Partial regen: text only
    if (mode === "text") {
      const content = await generateText({
        productName,
        productDescription,
        targetAudience,
        tone,
      });
      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!productName) {
      return new Response(JSON.stringify({ error: "productName required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toneStyle: Record<string, string> = {
      Premium: "luxury editorial photography, soft gradient studio backdrop, cinematic lighting, ultra-premium DTC brand aesthetic",
      Playful: "bright colorful pop background, energetic composition, vibrant modern lifestyle, joyful mood",
      Clinical: "clean minimal white studio, precise lighting, scientific and trustworthy, medical-grade aesthetic",
      Bold: "high-contrast dramatic lighting, saturated bold colors, cinematic and confident, striking composition",
    };
    const style = toneStyle[tone] ?? toneStyle.Premium;

    const prompts = {
      hero: `Editorial hero product photograph of "${productName}". ${productDescription}. ${style}. Ultra sharp, 8k, photorealistic, centered subject with generous negative space.`,
      before: `Documentary-style photograph illustrating the PROBLEM before using "${productName}". Muted desaturated tones, dull moody lighting, showing frustration or an unmet need. No text. Photorealistic.`,
      after: `Bright joyful transformation photograph showing the RESULT after using "${productName}". Vibrant warm lighting, confident glowing subject, premium lifestyle setting. No text. Photorealistic.`,
      mechanism: `Elegant flat-lay showing the key ingredients or mechanism of "${productName}". ${productDescription}. Clean minimal composition, top-down view, ${style}. No text.`,
    };

    const [content, hero, before, after, mechanism] = await Promise.all([
      generateText({ productName, productDescription, targetAudience, tone }),
      generateImage(prompts.hero),
      generateImage(prompts.before),
      generateImage(prompts.after),
      generateImage(prompts.mechanism),
    ]);

    const images = { hero, before, after, mechanism };

    // Persist if authenticated
    let pageId: string | null = null;
    if (userId) {
      const admin = createClient(
        SUPABASE_URL,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data, error } = await admin
        .from("launchpage_pages")
        .insert({
          user_id: userId,
          product_name: productName,
          product_description: productDescription,
          target_audience: targetAudience,
          tone,
          content_json: content,
          image_urls: images,
        })
        .select("id")
        .single();
      if (error) console.error("insert error", error);
      pageId = data?.id ?? null;
    }

    return new Response(
      JSON.stringify({ id: pageId, content, images, prompts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-landing-page error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
