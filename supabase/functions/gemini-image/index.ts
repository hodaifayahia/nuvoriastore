import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authError = await requireAdmin(req)
  if (authError) return authError

  try {
    const { prompt } = await req.json()
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    // Call Lovable AI Gateway with Gemini 3 Pro Image model
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: `Generate a high-quality product image: ${prompt}. Only output the image, no text.`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`AI Gateway error ${res.status}: ${errorText}`)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content

    // The response may contain base64 image data or a URL
    // Check for inline image parts in the response
    let base64Data: string | null = null
    let mimeType = 'image/png'

    // Check if content is an array with image parts (multimodal response)
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === 'image_url' && part.image_url?.url?.startsWith('data:')) {
          const dataUrl = part.image_url.url
          const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
          if (matches) {
            mimeType = matches[1]
            base64Data = matches[2]
            break
          }
        }
      }
    }

    // If content is a string, check for data URL pattern
    if (!base64Data && typeof content === 'string') {
      const matches = content.match(/data:(image\/\w+);base64,([A-Za-z0-9+/=]+)/)
      if (matches) {
        mimeType = matches[1]
        base64Data = matches[2]
      }
    }

    // Also check for inline_data in the raw response structure
    if (!base64Data) {
      const rawParts = data?.choices?.[0]?.message?.parts
      if (Array.isArray(rawParts)) {
        for (const part of rawParts) {
          if (part.inline_data?.data) {
            base64Data = part.inline_data.data
            mimeType = part.inline_data.mime_type || 'image/png'
            break
          }
        }
      }
    }

    if (!base64Data) {
      throw new Error('No image data found in AI response')
    }

    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png'

    // Convert base64 to Uint8Array
    const binaryStr = atob(base64Data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    // Upload to Supabase storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const fileName = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = `generated/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, bytes, { contentType: mimeType, upsert: true })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('products')
      .getPublicUrl(filePath)

    return new Response(JSON.stringify({ url: urlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Gemini image error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
