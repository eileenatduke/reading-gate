// User-supplied configuration. Fill these in after creating your Supabase project
// and (optionally) getting a free Guardian Open Platform API key.
//
// SECURITY: the anon key is a *public* key and is safe to ship in client code.
// Never put the service_role key here. Row Level Security (see supabase/migrations)
// is what actually protects each user's data.
//
// You can also set these from the extension's Options page, which persists them to
// chrome.storage.local and overrides the values below.

export const DEFAULT_CONFIG = {
  SUPABASE_URL: "https://xkvcvhnnbusuujlhkiky.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrdmN2aG5uYnVzdXVqbGhraWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTk0NTUsImV4cCI6MjA5ODg3NTQ1NX0.DMnoaTeZ2RCYr8nzApKHUthNTdTeLLpWgakgKLUk0BM",
  GUARDIAN_API_KEY: "test",  // "test" works for light use; get a free key for real use
  GRACE_SECS: 30,            // re-gate grace period (Spec §3 default)
  MAX_SESSION_MINUTES: 0,    // optional continuous-unlock cap (0 = disabled, Spec §3)
  POOL_TARGET: 12,           // how many unread articles to keep per user
  POOL_REFILL_MINUTES: 30,   // background content refresh cadence
  DASHBOARD_URL: "",         // deployed web dashboard URL (for the popup link)
  AI_SUMMARY_CHECK: true,    // run the AI anti-gaming check on submit (Spec §11 v2)
  VERIFY_URL: "",            // override for the verify-summary function endpoint
                             // (default: <SUPABASE_URL>/functions/v1/verify-summary)
};

export async function getConfig() {
  const stored = await chrome.storage.local.get("config");
  return { ...DEFAULT_CONFIG, ...(stored.config || {}) };
}

export async function setConfig(partial) {
  const cur = (await chrome.storage.local.get("config")).config || {};
  const next = { ...cur, ...partial };
  await chrome.storage.local.set({ config: next });
  return { ...DEFAULT_CONFIG, ...next };
}
