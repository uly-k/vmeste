if (window.supabase?.createClient) {
  const config = window.vmesteSupabaseConfig;
  window.vmesteSupabase = window.supabase.createClient(
    config.url,
    config.publishableKey
  );
}
