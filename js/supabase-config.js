const VMESTE_SUPABASE_URL = 'https://hkyietnayzzeeuqqynfi.supabase.co';
const VMESTE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_R4ljFqHlDSjvi_gM3cmDEg_29EwhfJf';

window.vmesteSupabaseConfig = Object.freeze({
  url: VMESTE_SUPABASE_URL,
  publishableKey: VMESTE_SUPABASE_PUBLISHABLE_KEY,
});

window.vmesteProductImageUrl = function(storagePath) {
  if (!storagePath) return '';
  if (/^https?:\/\//i.test(storagePath)) return storagePath;

  const encodedPath = storagePath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  return `${VMESTE_SUPABASE_URL}/storage/v1/object/public/product-images/${encodedPath}`;
};
