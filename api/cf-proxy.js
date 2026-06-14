// Cloudflare Worker — CORS-прокси для Supabase
// Деплой: wrangler deploy

const ALLOWED_ORIGINS = ['*'];
const SUPABASE_HOST = 'mmbslfwzaxmxmaevbdse.supabase.co';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    if (targetUrl.hostname !== SUPABASE_HOST) {
      return new Response(JSON.stringify({ error: 'Only Supabase requests allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const proxyHeaders = new Headers();
    for (const key of ['authorization', 'apikey', 'content-type', 'prefer', 'range', 'accept-profile', 'x-client-info']) {
      const val = request.headers.get(key);
      if (val) proxyHeaders.set(key, val);
    }

    const proxyRes = await fetch(target.toString(), {
      method: request.method,
      headers: proxyHeaders,
      body: ['POST', 'PATCH', 'PUT'].includes(request.method) ? request.body : undefined,
    });

    const resHeaders = corsHeaders(origin);
    resHeaders.set('cache-control', 'no-store');

    const contentType = proxyRes.headers.get('content-type');
    if (contentType) resHeaders.set('content-type', contentType);

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      headers: resHeaders,
    });
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}
