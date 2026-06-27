import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Require admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { order_ids, company_id } = await req.json();

    if (!order_ids?.length || !company_id) {
      return new Response(JSON.stringify({ error: 'Missing order_ids or company_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: company, error: compErr } = await supabase
      .from('delivery_companies')
      .select('*')
      .eq('id', company_id)
      .single();

    if (compErr || !company) {
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('*, wilayas(name)')
      .in('id', order_ids);

    if (ordErr) throw ordErr;

    const csvRows = [
      ['order_number', 'customer_name', 'customer_phone', 'wilaya', 'address', 'total_amount', 'delivery_type', 'payment_method'].join(',')
    ];

    for (const order of (orders || [])) {
      csvRows.push([
        order.order_number,
        `"${(order.customer_name || '').replace(/"/g, '""')}"`,
        order.customer_phone,
        `"${((order as any).wilayas?.name || '').replace(/"/g, '""')}"`,
        `"${(order.address || '').replace(/"/g, '""')}"`,
        order.total_amount,
        order.delivery_type || 'office',
        order.payment_method || 'cod',
      ].join(','));
    }

    const csv = csvRows.join('\n');

    let apiResult = null;
    if (company.api_key && company.api_url) {
      try {
        const parcels = (orders || []).map((order: any) => ({
          order_id: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          wilaya: order.wilayas?.name || '',
          address: order.address || '',
          amount: Number(order.total_amount),
          delivery_type: order.delivery_type || 'office',
          is_cod: order.payment_method === 'cod',
        }));

        const apiRes = await fetch(`${company.api_url}/parcels`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${company.api_key}`,
            'X-API-KEY': company.api_key,
          },
          body: JSON.stringify({ parcels }),
        });

        const apiBody = await apiRes.text();
        apiResult = {
          status: apiRes.status,
          success: apiRes.ok,
          message: apiRes.ok ? 'Orders pushed to API' : `API error ${apiRes.status}: ${apiBody.slice(0, 200)}`,
        };
      } catch (e: any) {
        apiResult = { status: 0, success: false, message: `API call failed: ${e.message}` };
      }
    }

    return new Response(JSON.stringify({
      csv,
      company_name: company.name,
      order_count: orders?.length || 0,
      api_result: apiResult,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
