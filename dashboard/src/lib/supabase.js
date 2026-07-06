import { createClient } from "@supabase/supabase-js";

// Reads from .env.local if present, otherwise falls back to the project defaults
// below so the dashboard runs with zero config. The anon key is a public key (safe
// in client code) — RLS is what protects the data.
const url = import.meta.env.VITE_SUPABASE_URL || "https://xkvcvhnnbusuujlhkiky.supabase.co";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrdmN2aG5uYnVzdXVqbGhraWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTk0NTUsImV4cCI6MjA5ODg3NTQ1NX0.DMnoaTeZ2RCYr8nzApKHUthNTdTeLLpWgakgKLUk0BM";

export const isConfigured = Boolean(url && anon);

// A single shared client. If unconfigured, this still constructs but calls will fail
// loudly — the app shows a "configure me" screen in that case.
export const supabase = createClient(url || "http://localhost", anon || "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true },
});
