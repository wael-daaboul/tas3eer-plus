export const SUPABASE_URL = "https://htalggcldammufifwtjb.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_QEQ0oLCaVJSWo80z7iPIFA_7rkcrL2M";

let clientPromise = null;

export function hasSupabaseConfig() {
  return (
    typeof SUPABASE_URL === "string" &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_URL.startsWith("http") &&
    !SUPABASE_URL.includes("<PROJECT_URL>") &&
    !SUPABASE_ANON_KEY.includes("<ANON_PUBLIC_KEY>")
  );
}

export async function getSupabaseClient() {
  if (!hasSupabaseConfig()) return null;
  if (!clientPromise) {
    clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm")
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  }
  const client = await clientPromise;
  window.__supabase = client;
  return client;
}
