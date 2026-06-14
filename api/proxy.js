// api/proxy.js — Vercel/Netlify serverless CORS-прокси для Supabase
// Деплой: vercel deploy (бесплатно)
// После деплоя замени URL в supabase-config.js на адрес Vercel-проекта

const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = req.query.url || req.body?.url;
  if (!url || !url.startsWith('https://mmbslfwzaxmxmaevbdse.supabase.co')) {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: 'Invalid URL' }));
  }

  const headers = {};
  for (const key of ['authorization', 'apikey', 'content-type', 'prefer', 'range', 'accept-profile', 'x-client-info']) {
    if (req.headers[key]) headers[key] = req.headers[key];
  }

  return new Promise((resolve) => {
    const parsed = new URL(url);
    const proxyReq = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: req.method,
      headers,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'access-control-allow-origin': '*',
        'cache-control': 'no-store, no-cache, must-revalidate',
      });
      proxyRes.pipe(res);
      proxyRes.on('end', resolve);
    });

    proxyReq.on('error', (e) => {
      res.writeHead(502);
      res.end(JSON.stringify({ error: e.message }));
      resolve();
    });

    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy();
      res.writeHead(504);
      res.end(JSON.stringify({ error: 'timeout' }));
      resolve();
    });

    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        proxyReq.write(body);
        proxyReq.end();
      });
    } else {
      proxyReq.end();
    }
  });
};
