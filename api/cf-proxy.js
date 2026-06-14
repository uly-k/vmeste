// Cloudflare Worker — CORS-прокси для Supabase
// Деплой: wrangler deploy

const SUPABASE_HOST = 'mmbslfwzaxmxmaevbdse.supabase.co';

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '*';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return jsonResponse({ error: 'Missing ?url= parameter' }, 400, headers);
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return jsonResponse({ error: 'Invalid URL' }, 400, headers);
    }

    if (targetUrl.hostname !== SUPABASE_HOST) {
      return jsonResponse({ error: 'Only Supabase requests allowed' }, 403, headers);
    }

    const proxyHeaders = new Headers();
    const passHeaders = [
      'authorization', 'apikey', 'content-type', 'prefer',
      'range', 'accept-profile', 'x-client-info',
    ];
    for (const key of passHeaders) {
      const val = request.headers.get(key);
      if (val) proxyHeaders.set(key, val);
    }

    const fetchOpts = {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'follow',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fetchOpts.body = await request.text();
    }

    const proxyRes = await fetch(targetUrl.toString(), fetchOpts);

    const resHeaders = new Headers(headers);
    resHeaders.set('cache-control', 'no-store');

    const ct = proxyRes.headers.get('content-type');
    if (ct) resHeaders.set('content-type', ct);

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      headers: resHeaders,
    });
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
