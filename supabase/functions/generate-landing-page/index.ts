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

async function generateText(opts: { referenceImage?: string; price?: string; tone: string }) {
  const system = `أنت كاتب إعلانات محترف بالعربية لصفحات الهبوط عالية التحويل. حلّل صورة المنتج وأنشئ نصاً قصيراً جداً، مؤثراً، بصرياً.
أعد JSON صالحاً فقط بهذا الشكل بالضبط (كل النصوص بالعربية الفصحى، قصيرة جداً):
{
  "productName": "اسم قصير جذاب (2-4 كلمات)",
  "productDescription": "جملة واحدة قصيرة",
  "headline": "عنوان قوي (4-7 كلمات)",
  "tagline": "شعار من 3-5 كلمات",
  "ctaText": "زر الشراء (كلمتان مثل 'اطلب الآن')",
  "hypeWords": ["كلمة واحدة","كلمة واحدة","كلمة واحدة","كلمة واحدة"],
  "benefits": [
    {"title":"ميزة (2-3 كلمات)","icon":"zap"},
    {"title":"ميزة","icon":"shield"},
    {"title":"ميزة","icon":"heart"}
  ],
  "testimonials": [
    {"name":"اسم عربي","quote":"جملة قصيرة (5-8 كلمات)","city":"مدينة"},
    {"name":"اسم","quote":"جملة","city":"مدينة"},
    {"name":"اسم","quote":"جملة","city":"مدينة"}
  ],
  "howItWorks": [
    {"title":"خطوة (كلمتان)"},
    {"title":"خطوة"},
    {"title":"خطوة"}
  ],
  "trustBadges": ["شحن مجاني","ضمان 30 يوم","دفع عند الاستلام","توصيل سريع"]
}
قواعد: بلا حشو، بلا مقدمات، بلا فقرات طويلة. كل نص أقصر ما يمكن.`;

  const userText = `حلّل صورة المنتج المرفقة واكتب النص بأسلوب "${opts.tone}".${opts.price ? ` السعر: ${opts.price}.` : ""} استنتج اسم المنتج ونوعه من الصورة نفسها.`;

  const content: any[] = [{ type: "text", text: userText }];
  if (opts.referenceImage) content.push({ type: "image_url", image_url: { url: opts.referenceImage } });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5",
      messages: [{ role: "system", content: system }, { role: "user", content }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`Text gen failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
}

async function generateImage(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-image-2", prompt, size: "1024x1024", quality: "low", n: 1 }),
    });
    if (!res.ok) { console.error("image gen failed", res.status, await res.text()); return null; }
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch (e) { console.error("image gen error", e); return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
      userId = data?.claims?.sub ?? null;
    }

    const body = await req.json();
    const { referenceImage, price = "", tone = "Premium", mode = "full", section, imagePrompt } = body ?? {};

    if (mode === "image" && imagePrompt) {
      const url = await generateImage(imagePrompt);
      return new Response(JSON.stringify({ image: url, section }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!referenceImage) {
      return new Response(JSON.stringify({ error: "يجب رفع صورة المنتج أولاً" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = await generateText({ referenceImage, price, tone });
    const productName = content.productName || "المنتج";
    const productDescription = content.productDescription || "";

    const toneStyle: Record<string, string> = {
      Premium: "تصوير تحريري فاخر، خلفية استوديو متدرجة ناعمة، إضاءة سينمائية، جمالية علامة تجارية راقية",
      Playful: "خلفية ملونة نابضة بالحياة، تكوين مفعم بالطاقة، أسلوب حياة عصري",
      Clinical: "استوديو أبيض نظيف، إضاءة دقيقة، مظهر علمي وموثوق",
      Bold: "تباين عالٍ، إضاءة درامية، ألوان جريئة، تكوين واثق",
    };
    const style = toneStyle[tone] ?? toneStyle.Premium;

    // STRICT: any visible text/labels/signage inside images MUST be in Arabic script only.
    // Absolutely no English, Latin letters, Roman numerals, or any non-Arabic characters.
    const ARABIC_ONLY = `CRITICAL LANGUAGE RULE: If ANY text, label, sign, packaging copy, writing, watermark, sticker, or typography is visible anywhere in the image, it MUST be written EXCLUSIVELY in Arabic script (العربية). ABSOLUTELY FORBIDDEN: English words, Latin alphabet letters (a-z, A-Z), Roman numerals, Cyrillic, Chinese, or any non-Arabic characters. Prefer minimal or no text at all. Any packaging or labels must show only Arabic calligraphy/typography. Numbers, if any, must be Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩).`;

    const prompts = {
      lifestyle: `Cinematic aspirational lifestyle photograph featuring ${productName}. ${productDescription}. A person elegantly using or holding the product in a premium modern setting. ${style}. Ultra sharp, 8k, photorealistic. ${ARABIC_ONLY}`,
      detail: `Extreme macro close-up detail shot of ${productName}. ${productDescription}. Dramatic lighting revealing texture and craftsmanship. ${style}. 8k photorealistic. ${ARABIC_ONLY}`,
      inUse: `Dynamic action photograph of ${productName} being used in the perfect moment. ${productDescription}. Motion, energy, real-world context. ${style}. Photorealistic, 8k. ${ARABIC_ONLY}`,
      before: `Documentary photograph illustrating the frustrating PROBLEM before ${productName}. Muted desaturated tones, moody lighting, unmet need. Photorealistic. ${ARABIC_ONLY}`,
      after: `Bright joyful RESULT photograph after using ${productName}. Vibrant warm lighting, confident glowing subject, premium lifestyle. Photorealistic. ${ARABIC_ONLY}`,
      packaging: `Elegant flat-lay of ${productName} with its premium packaging (labels in Arabic only), accessories, or key ingredients arranged beautifully. Top-down view, minimal composition. ${style}. ${ARABIC_ONLY}`,
    };

    const [lifestyle, detail, inUse, before, after, packaging] = await Promise.all([
      generateImage(prompts.lifestyle),
      generateImage(prompts.detail),
      generateImage(prompts.inUse),
      generateImage(prompts.before),
      generateImage(prompts.after),
      generateImage(prompts.packaging),
    ]);

    const images = { hero: referenceImage, lifestyle, detail, inUse, before, after, packaging };

    let pageId: string | null = null;
    if (userId) {
      const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data } = await admin.from("launchpage_pages").insert({
        user_id: userId, product_name: productName, product_description: productDescription,
        target_audience: price, tone, content_json: content, image_urls: images,
      }).select("id").single();
      pageId = data?.id ?? null;
    }

    return new Response(JSON.stringify({ id: pageId, content, images, prompts, price }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-landing-page error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
