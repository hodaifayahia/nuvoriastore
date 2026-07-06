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
  const system = `أنت مدير فني وكاتب إعلانات محترف بالعربية لصفحات هبوط عالية التحويل. حلّل صورة المنتج بصرياً (ألوان، خامة، مزاج) وأنشئ نصاً قصيراً + لوحة ألوان مستوحاة من المنتج + أوصاف صور دقيقة.
أعد JSON صالحاً فقط بهذا الشكل بالضبط (كل النصوص بالعربية الفصحى، قصيرة جداً):
{
  "productName": "اسم قصير جذاب (2-4 كلمات)",
  "productDescription": "جملة واحدة قصيرة",
  "headline": "عنوان قوي (4-7 كلمات)",
  "tagline": "شعار من 3-5 كلمات",
  "ctaText": "زر الشراء (كلمتان مثل 'اطلب الآن')",
  "hypeWords": ["كلمة","كلمة","كلمة","كلمة"],
  "palette": {
    "bg": "#hex خلفية فاتحة/داكنة مستوحاة من المنتج",
    "surface": "#hex سطح ثانوي متناغم",
    "accent": "#hex اللون المميز الأساسي (يشتق من المنتج)",
    "accent2": "#hex لون ثانوي مكمل",
    "ink": "#hex لون النص الأساسي (تباين عالٍ مع bg)",
    "onAccent": "#hex لون النص فوق accent"
  },
  "benefits": [
    {"title":"ميزة (2-3 كلمات)","icon":"zap","imagePrompt":"وصف صورة رمزية دقيقة بالإنجليزية تعبّر عن هذه الميزة تحديداً في سياق المنتج"},
    {"title":"ميزة","icon":"shield","imagePrompt":"..."},
    {"title":"ميزة","icon":"heart","imagePrompt":"..."}
  ],
  "testimonials": [
    {"name":"اسم","quote":"جملة قصيرة","city":"مدينة"},
    {"name":"اسم","quote":"جملة","city":"مدينة"},
    {"name":"اسم","quote":"جملة","city":"مدينة"}
  ],
  "trustBadges": ["شحن مجاني","ضمان 30 يوم","دفع عند الاستلام","توصيل سريع"],
  "heroImagePrompt": "وصف احترافي بالإنجليزية لصورة بطل تحريرية جميلة للمنتج (ليست الصورة المرفوعة نفسها بل نسخة استوديو محسّنة)"
}
قواعد: بلا حشو. الألوان في palette يجب أن تكون منسجمة ومستوحاة فعلياً من المنتج في الصورة.`;

  const userText = `حلّل صورة المنتج المرفقة بصرياً واستخرج لوحة ألوان منسجمة، واكتب النص بأسلوب "${opts.tone}".${opts.price ? ` السعر: ${opts.price}.` : ""}`;

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
    const palette = content.palette || {};
    const paletteHint = `Color palette to reflect throughout the image (subtle, coherent): background ${palette.bg || "neutral"}, accent ${palette.accent || "warm"}, secondary ${palette.accent2 || "muted"}.`;

    const toneStyle: Record<string, string> = {
      Premium: "editorial luxury photography, soft gradient studio backdrop, cinematic lighting, high-end brand aesthetic",
      Playful: "vibrant colorful backdrop, energetic composition, modern lifestyle vibe",
      Clinical: "clean white studio, precise lighting, scientific trustworthy look",
      Bold: "high contrast, dramatic lighting, confident bold composition",
    };
    const style = toneStyle[tone] ?? toneStyle.Premium;

    const ARABIC_ONLY = `CRITICAL LANGUAGE RULE: If ANY text, label, sign, packaging copy, writing, watermark, sticker, or typography is visible anywhere in the image, it MUST be written EXCLUSIVELY in Arabic script (العربية). ABSOLUTELY FORBIDDEN: English words, Latin alphabet letters (a-z, A-Z), Roman numerals, or any non-Arabic characters. Prefer minimal or no text at all. Numbers, if any, must be Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩).`;

    const heroPrompt = `${content.heroImagePrompt || `Editorial hero photograph of ${productName}. ${productDescription}.`} ${style}. ${paletteHint} Ultra sharp, 8k, photorealistic, magazine-cover quality. ${ARABIC_ONLY}`;

    const prompts: Record<string, string> = {
      hero: heroPrompt,
      lifestyle: `Cinematic aspirational lifestyle photograph featuring ${productName}. ${productDescription}. A person elegantly using or holding the product in a premium modern setting. ${style}. ${paletteHint} Ultra sharp, 8k, photorealistic. ${ARABIC_ONLY}`,
      detail: `Extreme macro close-up detail shot of ${productName}. ${productDescription}. Dramatic lighting revealing texture and craftsmanship. ${style}. ${paletteHint} 8k photorealistic. ${ARABIC_ONLY}`,
      inUse: `Dynamic action photograph of ${productName} being used in the perfect moment. ${productDescription}. Motion, energy, real-world context. ${style}. ${paletteHint} Photorealistic, 8k. ${ARABIC_ONLY}`,
      before: `Documentary photograph illustrating the frustrating PROBLEM before ${productName}. Muted desaturated tones, moody lighting, unmet need. Photorealistic. ${ARABIC_ONLY}`,
      after: `Bright joyful RESULT photograph after using ${productName}. Vibrant warm lighting, confident glowing subject, premium lifestyle. ${paletteHint} Photorealistic. ${ARABIC_ONLY}`,
      packaging: `Elegant flat-lay of ${productName} with its premium packaging (labels in Arabic only), accessories, or key ingredients arranged beautifully. Top-down view, minimal composition. ${style}. ${paletteHint} ${ARABIC_ONLY}`,
    };

    const benefits = Array.isArray(content.benefits) ? content.benefits.slice(0, 3) : [];
    const benefitPrompts: string[] = benefits.map((b: any, i: number) =>
      `Symbolic editorial product photograph representing the benefit "${b.title}" of ${productName}. ${b.imagePrompt || ""}. ${style}. ${paletteHint} Minimal composition, single focal subject, 8k, photorealistic. ${ARABIC_ONLY}`
    );
    benefitPrompts.forEach((p, i) => { prompts[`benefit${i}`] = p; });

    const [hero, lifestyle, detail, inUse, before, after, packaging, b0, b1, b2] = await Promise.all([
      generateImage(prompts.hero),
      generateImage(prompts.lifestyle),
      generateImage(prompts.detail),
      generateImage(prompts.inUse),
      generateImage(prompts.before),
      generateImage(prompts.after),
      generateImage(prompts.packaging),
      benefitPrompts[0] ? generateImage(benefitPrompts[0]) : Promise.resolve(null),
      benefitPrompts[1] ? generateImage(benefitPrompts[1]) : Promise.resolve(null),
      benefitPrompts[2] ? generateImage(benefitPrompts[2]) : Promise.resolve(null),
    ]);

    const images = {
      hero: hero || referenceImage,
      lifestyle, detail, inUse, before, after, packaging,
      benefit0: b0, benefit1: b1, benefit2: b2,
    };

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
