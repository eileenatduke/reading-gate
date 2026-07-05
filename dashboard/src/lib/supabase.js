import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anon);

// A single shared client. If unconfigured, this still constructs but calls will fail
// loudly — the app shows a "configure me" screen in that case.
export const supabase = createClient(url || "http://localhost", anon || "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true },
});
