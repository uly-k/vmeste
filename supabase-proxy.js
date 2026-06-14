// supabase-proxy.js — CORS-прокси для Supabase через HTTP-прокси
// Запуск: PROXY_URL=http://login:pass@host:port node supabase-proxy.js

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PROXY_URL = process.env.PROXY_URL || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

function proxyRequest(targetUrl, req) {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl);

    const headers = { ...req.headers };
    delete headers.host;
    delete headers.origin;
    delete headers.referer;

    const opts = {
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname + target.search,
      method: req.method,
      headers,
    };

    if (PROXY_URL) {
      const proxy = new URL(PROXY_URL);
      opts.hostname = proxy.hostname;
      opts.port = proxy.port || 8080;
      opts.path = targetUrl;
      opts.headers['Host'] = target.hostname;

      if (proxy.username) {
        const auth = Buffer.from(`${proxy.username}:${proxy.password || ''}`).toString('base64');
        opts.headers['Proxy-Authorization'] = `Basic ${auth}`;
      }
    }

    const proto = PROXY_URL ? (PROXY_URL.startsWith('https') ? https : http) : https;
    const proxyReq = proto.request(opts, (proxyRes) => resolve(proxyRes));

    proxyReq.on('error', reject);
    proxyReq.setTimeout(30000, () => { proxyReq.destroy(); reject(new Error('timeout')); });

    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const targetUrl = req.url.slice(1);
  if (!targetUrl.startsWith('http')) {
    res.writeHead(400);
    return res.end('Bad request: URL required');
  }

  try {
    const proxyRes = await proxyRequest(targetUrl, req);
    const resHeaders = { ...proxyRes.headers };
    resHeaders['access-control-allow-origin'] = ALLOWED_ORIGIN;
    resHeaders['access-control-allow-headers'] = '*';
    delete resHeaders['content-security-policy'];

    res.writeHead(proxyRes.statusCode, resHeaders);
    proxyRes.pipe(res);
  } catch (e) {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Supabase proxy on :${PORT}`);
  console.log(`Proxy: ${PROXY_URL ? 'yes' : 'direct'}`);
});
