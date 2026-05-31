const VMESTE_SUPABASE_URL = 'https://hkyietnayzzeeuqqynfi.supabase.co';
const VMESTE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_R4ljFqHlDSjvi_gM3cmDEg_29EwhfJf';
const VMESTE_PRODUCT_IMAGE_BUCKET = 'product-images';

const VMESTE_PRODUCT_IMAGE_PRESETS = Object.freeze({
  thumb:   { width: 160, height: 160, resize: 'cover', quality: 70 },
  order:   { width: 220, height: 220, resize: 'cover', quality: 72 },
  card:    { width: 520, height: 650, resize: 'cover', quality: 76 },
  product: { width: 1100, quality: 82 },
});

window.vmesteSupabaseConfig = Object.freeze({
  url: VMESTE_SUPABASE_URL,
  publishableKey: VMESTE_SUPABASE_PUBLISHABLE_KEY,
});

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
  if (!extractedPath) return /^https?:\/\//i.test(String(storagePath || '')) ? storagePath : '';

  const normalized = vmesteNormalizeProductImageOptions(options);
  const params = new URLSearchParams();
  if (normalized.width) params.set('width', normalized.width);
  if (normalized.height) params.set('height', normalized.height);
  if (normalized.resize) params.set('resize', normalized.resize);
  if (normalized.quality) params.set('quality', normalized.quality);

  const query = params.toString();
  if (!query) return window.vmesteProductImageOriginalUrl(extractedPath);

  return `${VMESTE_SUPABASE_URL}/storage/v1/render/image/public/${VMESTE_PRODUCT_IMAGE_BUCKET}/${vmesteEncodeStoragePath(extractedPath)}?${query}`;
};

document.addEventListener('error', event => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (!img.dataset.vmesteOriginalImage || img.dataset.vmesteImageFallbackTried === '1') return;

  const originalUrl = window.vmesteProductImageOriginalUrl(img.dataset.vmesteOriginalImage);
  if (!originalUrl || img.src === originalUrl) return;

  img.dataset.vmesteImageFallbackTried = '1';
  img.removeAttribute('srcset');
  img.src = originalUrl;
}, true);
