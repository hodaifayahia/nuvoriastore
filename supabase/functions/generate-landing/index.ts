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
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { productName, price, oldPrice, description, shortDescription, category, language } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langMap: Record<string, string> = {
      ar: "Arabic",
      en: "English",
      fr: "French",
      es: "Spanish",
      de: "German",
      tr: "Turkish",
    };
    const langName = langMap[language] || "English";

    const systemPrompt = `You are an elite landing page designer and conversion rate optimization expert. Your mission: create landing page content that converts like crazy — emotionally compelling, psychologically persuasive, and irresistibly engaging.

CRITICAL RULES:
- ALL output text MUST be in ${langName} — every single word, headline, benefit, testimonial, FAQ answer
- Write like a premium luxury brand (think Apple, Nike, Dyson) — aspirational, confident, bold
- Apply the PAS framework (Problem → Agitation → Solution) in your copy flow
- Apply Cialdini's principles: Social proof, Scarcity, Authority, Reciprocity
- Focus on TRANSFORMATION and BENEFITS, not just features
- Use power words that trigger emotion: exclusive, premium, transform, unleash, discover, revolutionary, limited
- Create urgency without being sleazy — authentic scarcity
- Make testimonials feel real and specific (include product details, timeframes, specific results)
- The copy should make the reader FEEL something — desire, excitement, FOMO
- Keep it culturally appropriate for the ${langName}-speaking market

DESIGN PHILOSOPHY:
- Premium, modern, trust-building aesthetic
- Serif fonts for headings (editorial luxury feel), clean sans-serif for body
- Generous whitespace with smooth scroll animations
- Color palette should feel extracted from a product photo — warm, rich tones
- Every section should build desire and overcome objections
- F-pattern reading layout for text-heavy sections
- Contrast and whitespace to draw eyes to CTAs`;

    const userPrompt = `Deeply analyze this product and create a stunning, high-converting landing page following this structure:

PRODUCT TO ANALYZE:
- Product: ${productName}
- Price: ${price} DA${oldPrice ? ` (original: ${oldPrice} DA — ${Math.round((1 - price/oldPrice) * 100)}% OFF!)` : ""}
- Category: ${category || "General"}
- Description: ${description || shortDescription || "Premium quality product"}

LANDING PAGE SECTIONS TO GENERATE:

SECTION 1 — HERO (Above the Fold):
- Bold headline using formula: "[Transformation outcome] Without [Pain point]" — max 10 words
- Subheadline that amplifies the emotional promise — 1-2 sentences
- Primary CTA: action-oriented, urgent ("Get Yours Now", "Try It Risk-Free")
- Secondary CTA: softer action ("Learn More", "See Details")
- Micro social-proof strip: "⭐ 4.9/5 from 2,400+ reviews"

SECTION 2 — BEFORE / AFTER TRANSFORMATION:
- A "Before" text showing the pain/problem the customer faces without the product
- An "After" text showing the transformation/improvement after using the product
- A compelling one-liner: "See why <number>+ customers made the switch."

SECTION 3 — BENEFITS / FEATURES:
- 4-6 key benefits focusing on what the customer GAINS, not what the product HAS
- Each with an emoji icon, punchy title (3-5 words), and 1-2 sentence transformation-focused description

SECTION 4 — AUTHORITY & SOCIAL VALIDATION:
- Authority text like "Trusted by 50,000+ customers across Algeria"
- 3 animated counter items showing social proof stats (e.g., "50,000+ Sold", "98% Satisfaction", "30-Day Guarantee")

SECTION 5 — PRODUCT DESCRIPTION:
- 3-4 paragraph persuasive description using PAS framework
- Lead with the transformation/benefit, then features
- Use sensory language — make them FEEL the product

SECTION 6 — HOW IT WORKS:
- 3-step simple timeline: Order → Receive → Enjoy
- Each step with a number icon, title, and short description

SECTION 7 — SOCIAL VALIDATION (Testimonials):
- 3 realistic, specific testimonials addressing different buyer concerns
- Each with: realistic name, specific quote mentioning product by name and concrete benefit experienced, rating 4-5

SECTION 8 — GUARANTEE:
- Money-back guarantee text that eliminates risk (e.g., "100% Money-Back Guarantee — No Questions Asked")

SECTION 9 — FAQ (Objection Handling):
- 4-5 FAQ items addressing common objections: shipping speed, quality assurance, returns policy, payment security, product authenticity

SECTION 10 — URGENCY / SCARCITY:
- Scarcity line that creates authentic FOMO: limited stock, special offer ending, exclusive deal

Generate ALL content using the suggest_landing_content function. Remember: EVERY word in ${langName}. Make it CONVERT.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_landing_content",
              description: "Return structured landing page content with all sections",
              parameters: {
                type: "object",
                properties: {
                  headline: { type: "string", description: "Bold hero headline using '[Transformation] Without [Pain]' formula. Max 10 words." },
                  subheadline: { type: "string", description: "Supporting text that amplifies the headline's emotional promise. 1-2 sentences." },
                  description: { type: "string", description: "3-4 paragraph persuasive product description using PAS framework." },
                  benefits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        icon: { type: "string", description: "Single relevant emoji" },
                        title: { type: "string", description: "Short benefit title (3-5 words)" },
                        text: { type: "string", description: "1-2 sentence benefit description" },
                      },
                      required: ["icon", "title", "text"],
                      additionalProperties: false,
                    },
                    description: "4-6 key benefits.",
                  },
                  cta_primary: { type: "string", description: "Main CTA button text" },
                  cta_secondary: { type: "string", description: "Secondary CTA button text" },
                  testimonials: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Realistic name" },
                        text: { type: "string", description: "Specific review" },
                        rating: { type: "number", description: "Rating 4-5" },
                      },
                      required: ["name", "text", "rating"],
                      additionalProperties: false,
                    },
                    description: "3 testimonials",
                  },
                  urgency_text: { type: "string", description: "Scarcity/urgency line" },
                  faq: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                      },
                      required: ["question", "answer"],
                      additionalProperties: false,
                    },
                    description: "4-5 FAQ items",
                  },
                  social_proof_stats: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        number: { type: "string", description: "Stat number e.g. '50,000+'" },
                        label: { type: "string", description: "Stat label e.g. 'Products Sold'" },
                      },
                      required: ["number", "label"],
                      additionalProperties: false,
                    },
                    description: "3 animated counter stats for social proof",
                  },
                  before_after: {
                    type: "object",
                    properties: {
                      before_text: { type: "string", description: "Pain/problem text before using product" },
                      after_text: { type: "string", description: "Transformation text after using product" },
                      switch_line: { type: "string", description: "Compelling one-liner about customers switching" },
                    },
                    required: ["before_text", "after_text", "switch_line"],
                    additionalProperties: false,
                  },
                  how_it_works: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        icon: { type: "string", description: "Step number as string: '1', '2', '3'" },
                        title: { type: "string", description: "Step title" },
                        description: { type: "string", description: "Step description" },
                      },
                      required: ["icon", "title", "description"],
                      additionalProperties: false,
                    },
                    description: "3-step how it works timeline",
                  },
                  guarantee_text: { type: "string", description: "Money-back guarantee text" },
                  authority_text: { type: "string", description: "Authority/trust text like 'Trusted by X customers'" },
                },
                required: ["headline", "subheadline", "description", "benefits", "cta_primary", "cta_secondary", "testimonials", "urgency_text", "faq", "social_proof_stats", "before_after", "how_it_works", "guarantee_text", "authority_text"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_landing_content" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No content generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-landing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
