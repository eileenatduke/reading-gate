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
  SUPABASE_URL: "",          // e.g. https://xxxxxxxx.supabase.co
  SUPABASE_ANON_KEY: "",     // the anon/public key
  GUARDIAN_API_KEY: "test",  // "test" works for light use; get a free key for real use
  GRACE_SECS: 30,            // re-gate grace period (Spec §3 default)
  MAX_SESSION_MINUTES: 0,    // optional continuous-unlock cap (0 = disabled, Spec §3)
  POOL_TARGET: 12,           // how many unread articles to keep per user
  POOL_REFILL_MINUTES: 30,   // background content refresh cadence
  DASHBOARD_URL: "",         // deployed web dashboard URL (for the popup link)
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
