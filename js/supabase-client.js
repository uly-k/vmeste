if (window.supabase?.createClient) {
  const config = window.vmesteSupabaseConfig;
  window.vmesteSupabase = window.supabase.createClient(
    config.url,
    config.publishableKey,
    {
      global: {
        fetch: window.vmesteSupabaseFetch || window.fetch.bind(window),
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}
