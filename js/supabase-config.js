const VMESTE_SUPABASE_URL = 'https://mmbslfwzaxmxmaevbdse.supabase.co';
const VMESTE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_r364-y7dWbnYNBqeeAGRVQ_CwpD2cMw';
const VMESTE_PRODUCT_IMAGE_BUCKET = 'product-images';
const VMESTE_API_PROXY = 'https://corsproxy.io/?url=';
const VMESTE_API_PROXY_FALLBACK = 'https://vmeste-supabase-proxy.joroslav121.workers.dev/?url=';

const VMESTE_PRODUCT_IMAGE_PRESETS = Object.freeze({
  thumb:   { width: 200, height: 200, fit: 'cover', quality: 80 },
  order:   { width: 300, height: 300, fit: 'cover', quality: 82 },
  card:    { width: 650, height: 820, fit: 'cover', quality: 85 },
  product: { width: 1400, quality: 90 },
});

window.vmesteSupabaseConfig = Object.freeze({
  url: VMESTE_SUPABASE_URL,
  publishableKey: VMESTE_SUPABASE_PUBLISHABLE_KEY,
});

window.vmesteFetchWithTimeout = async function(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

window.vmesteFetchJson = async function(url, options = {}, timeoutMs = 30000) {
  const response = await window.vmesteFetchWithTimeout(url, options, timeoutMs);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || data?.error || `Supabase: ${response.status}`;
    throw new Error(message);
  }

  return { data, response };
};

window.vmesteSupabaseFetch = async function(url, options = {}) {
  if (typeof url === 'string' && url.startsWith(VMESTE_SUPABASE_URL)) {
    const proxies = [VMESTE_API_PROXY, VMESTE_API_PROXY_FALLBACK];
    for (const proxy of proxies) {
      if (!proxy) continue;
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const response = await window.vmesteFetchWithTimeout(proxyUrl, { ...options }, 30000);
        if (response.ok) return response;
      } catch (_) {}
    }
  }

  return window.vmesteFetchWithTimeout(url, options, 60000);
};

function vmesteEncodeStoragePath(storagePath) {
  return String(storagePath)
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

function vmesteExtractProductImagePath(value) {
  if (!value) return '';
  const rawValue = String(value).trim();
  if (!rawValue) return '';
  if (!/^https?:\/\//i.test(rawValue)) return rawValue;

  try {
    const url = new URL(rawValue);
    const prefixes = [
      `/storage/v1/object/public/${VMESTE_PRODUCT_IMAGE_BUCKET}/`,
      `/storage/v1/render/image/public/${VMESTE_PRODUCT_IMAGE_BUCKET}/`,
    ];
    const prefix = prefixes.find(item => url.pathname.includes(item));
    if (!prefix) return '';

    return decodeURIComponent(url.pathname.slice(url.pathname.indexOf(prefix) + prefix.length));
  } catch {
    return '';
  }
}

function vmesteNormalizeProductImageOptions(options) {
  const source = typeof options === 'string'
    ? { preset: options }
    : (options || { preset: 'card' });
  const preset = VMESTE_PRODUCT_IMAGE_PRESETS[source.preset] || {};

  return {
    ...preset,
    ...source,
  };
}

window.vmesteProductImageOriginalUrl = function(storagePath) {
  const extractedPath = vmesteExtractProductImagePath(storagePath);
  if (!extractedPath) return /^https?:\/\//i.test(String(storagePath || '')) ? storagePath : '';

  return `${VMESTE_SUPABASE_URL}/storage/v1/object/public/${VMESTE_PRODUCT_IMAGE_BUCKET}/${vmesteEncodeStoragePath(extractedPath)}`;
};

window.vmesteProductImageUrl = function(storagePath, options) {
  const extractedPath = vmesteExtractProductImagePath(storagePath);
  if (!extractedPath) {
    const raw = /^https?:\/\//i.test(String(storagePath || '')) ? storagePath : '';
    return raw ? window.vmesteProxyUrl(raw, options) : '';
  }

  const preset = vmesteNormalizeProductImageOptions(options);
  const originalUrl = window.vmesteProductImageOriginalUrl(extractedPath);

  const params = new URLSearchParams();
  params.set('url', originalUrl);
  if (preset.width)  params.set('w', preset.width);
  if (preset.height) params.set('h', preset.height);
  if (preset.quality) params.set('q', preset.quality);
  if (preset.fit)     params.set('fit', preset.fit);

  return `https://wsrv.nl/?${params.toString()}`;
};

window.vmesteProxyUrl = function(url, options) {
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) return url;

  const source = typeof options === 'string'
    ? { preset: options }
    : (options || {});
  const preset = VMESTE_PRODUCT_IMAGE_PRESETS[source.preset] || {};

  const params = new URLSearchParams();
  params.set('url', url);
  if (preset.width)  params.set('w', preset.width);
  if (preset.height) params.set('h', preset.height);
  if (preset.quality) params.set('q', preset.quality);
  if (preset.fit)     params.set('fit', preset.fit);

  return `https://wsrv.nl/?${params.toString()}`;
};
