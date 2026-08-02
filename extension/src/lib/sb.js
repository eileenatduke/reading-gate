// Minimal, buildless Supabase client for the extension.
//
// Wraps GoTrue (Auth) + PostgREST (REST) with plain fetch so the extension needs no
// bundler. The session is persisted in chrome.storage.local and auto-refreshed.
//
// Only the subset of features the extension needs is implemented: email/password
// auth, session refresh, and select/insert/update with RLS-scoped access tokens.

import { getConfig } from "./config.js";

const SESSION_KEY = "sb_session";

async function base() {
  const cfg = await getConfig();
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured. Open the extension Options page.");
  }
  return cfg;
}

// ---- session storage -------------------------------------------------------
export async function getSession() {
  const { [SESSION_KEY]: s } = await chrome.storage.local.get(SESSION_KEY);
  return s || null;
}
async function saveSession(s) {
  await chrome.storage.local.set({ [SESSION_KEY]: s });
}
export async function clearSession() {
  await chrome.storage.local.remove(SESSION_KEY);
}

function isExpired(session, skewSecs = 60) {
  if (!session?.expires_at) return true;
  // expires_at is unix seconds; refresh a little early so a request never races the clock.
  return Date.now() / 1000 > session.expires_at - skewSecs;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- auth ------------------------------------------------------------------
async function authFetch(path, body) {
  const cfg = await base();
  const res = await fetch(`${cfg.SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || data.error || "Auth failed");
  }
  return data;
}

function sessionFromToken(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: data.user,
  };
}

export async function signUp(email, password) {
  const data = await authFetch("signup", { email, password });
  // If email confirmation is disabled, signup returns a session directly.
  if (data.access_token) {
    const s = sessionFromToken(data);
    await saveSession(s);
    return s;
  }
  return null; // needs email confirmation
}

export async function signIn(email, password) {
  const data = await authFetch("token?grant_type=password", { email, password });
  const s = sessionFromToken(data);
  await saveSession(s);
  return s;
}

export async function signOut() {
  await clearSession();
}

// ---- token refresh (stay-logged-in hardening) ------------------------------
// The background worker, the gate page, and the popup each run their own copy of this
// module, and the web dashboard's own Supabase client mirrors its session in too. Supabase
// ROTATES the refresh token on every use, so two contexts refreshing the same token at once
// race: one wins and the other gets "invalid/already-used". Losing that race must NOT log
// the user out — the winner already saved a fresh session. Likewise, a transient failure
// (offline, 5xx) must never drop a good session. So we:
//   (a) single-flight within a context (concurrent callers share one refresh),
//   (b) take a short cross-context lock in chrome.storage so peers wait instead of racing,
//   (c) on ANY failure, re-read storage and adopt whatever a peer just saved, and
//   (d) clear the session ONLY when the refresh token is durably dead (a definitive auth
//       rejection with no fresher peer session) — never on a network/5xx blip.
const REFRESH_LOCK_KEY = "sb_refresh_lock";
const REFRESH_LOCK_TTL_MS = 15000;
let refreshInFlight = null;

// Perform the network refresh. Tags transient failures (offline / 5xx / 429 / timeout) so
// the caller can keep the session instead of signing the user out over a blip.
async function refreshRequest(refresh_token) {
  const cfg = await base();
  let res;
  try {
    res = await fetch(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token }),
    });
  } catch (e) {
    const err = new Error("network"); err.transient = true; throw err; // offline / DNS / TLS
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error_description || data.msg || data.error || `refresh HTTP ${res.status}`);
    // Durable ONLY on a definitive auth rejection of the refresh token itself (GoTrue
    // returns 400/401 for an invalid/expired/used token). Treat everything else — 5xx, 429,
    // 408, and a proxy/CDN/WAF 403/407 or any unexpected status — as transient so an infra
    // blip never signs a real user out (the stay-logged-in requirement). A genuinely dead
    // token still surfaces as 400/401 and clears normally.
    err.transient = !(res.status === 400 || res.status === 401);
    throw err;
  }
  const s = sessionFromToken(data);
  await saveSession(s);
  return s;
}

async function acquireRefreshLock() {
  const now = Date.now();
  const { [REFRESH_LOCK_KEY]: held } = await chrome.storage.local.get(REFRESH_LOCK_KEY);
  if (held && now - held < REFRESH_LOCK_TTL_MS) return false; // a peer is refreshing
  await chrome.storage.local.set({ [REFRESH_LOCK_KEY]: now });
  return true;
}
async function releaseRefreshLock() {
  try { await chrome.storage.local.remove(REFRESH_LOCK_KEY); } catch { /* ignore */ }
}

// Return a fresh, valid session — adopting a peer's refresh when one is in progress, and
// never dropping a live session over a race or a transient error. Null only when there is
// genuinely no usable session left.
async function refreshSession(current) {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    // A peer may have refreshed while we were deciding to.
    let latest = await getSession();
    if (latest && !isExpired(latest)) return latest;
    if (latest && current && latest.refresh_token !== current.refresh_token) current = latest;
    if (!current?.refresh_token) return null;

    // If a peer holds the refresh lock, wait for its result rather than racing it.
    if (!(await acquireRefreshLock())) {
      for (let i = 0; i < 25; i++) {          // poll up to ~2.5s
        await sleep(100);
        latest = await getSession();
        if (latest && !isExpired(latest)) return latest;
      }
      // Lock holder stalled or died — fall through and refresh ourselves.
    }
    try {
      return await refreshRequest(current.refresh_token);
    } catch (e) {
      // A peer may have refreshed successfully in parallel — adopt its session.
      latest = await getSession();
      if (latest && !isExpired(latest) && latest.refresh_token !== current.refresh_token) return latest;
      if (e.transient) return null; // keep the session; a later call recovers when back online
      // Give a racing peer a beat to persist its rotation, then look once more.
      await sleep(300);
      latest = await getSession();
      if (latest && !isExpired(latest) && latest.refresh_token !== current.refresh_token) return latest;
      // Durably invalid and no peer saved a newer session — only now do we sign out.
      await clearSession();
      return null;
    } finally {
      await releaseRefreshLock();
    }
  })();
  try { return await refreshInFlight; } finally { refreshInFlight = null; }
}

// Returns a valid access token, refreshing if needed. Null if not logged in. A failed
// refresh returns null WITHOUT clearing the session unless the token is durably dead, so a
// transient error surfaces as one failed request — not a logout.
export async function accessToken() {
  const s = await getSession();
  if (!s) return null;
  if (!isExpired(s)) return s.access_token;
  const refreshed = await refreshSession(s);
  return refreshed ? refreshed.access_token : null;
}

export async function currentUser() {
  const s = await getSession();
  return s?.user || null;
}

// Fetch the freshest user record (incl. user_metadata) from the server. The stored
// session's metadata can be stale if it changed on another device (e.g. the theme
// picked in the web dashboard), so read it live.
export async function getUserFresh() {
  const cfg = await base();
  const token = await accessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${cfg.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---- PostgREST (data) ------------------------------------------------------
// Usage:
//   await db("reading_log").insert({ ... })
//   await db("blocklist").select("*").eq("user_id", uid).run()
export function db(table) {
  const query = { table, columns: "*", filters: [], order: null, limitN: null };
  const api = {
    select(cols = "*") { query.columns = cols; return api; },
    eq(col, val) { query.filters.push(`${col}=eq.${encodeURIComponent(val)}`); return api; },
    gte(col, val) { query.filters.push(`${col}=gte.${encodeURIComponent(val)}`); return api; },
    is(col, val) { query.filters.push(`${col}=is.${val}`); return api; },
    order(col, { ascending = true } = {}) { query.order = `${col}.${ascending ? "asc" : "desc"}`; return api; },
    limit(n) { query.limitN = n; return api; },
    async run() { return rest("GET", query); },
    async insert(rows) { return rest("POST", query, rows); },
    async update(patch) { return rest("PATCH", query, patch); },
    async remove() { return rest("DELETE", query); },
    async upsert(rows, onConflict) { return rest("POST", query, rows, { upsert: true, onConflict }); },
  };
  return api;
}

async function rest(method, query, body, opts = {}) {
  const cfg = await base();
  const token = await accessToken();
  if (!token) throw new Error("Not authenticated");

  const params = [];
  if (method === "GET") params.push(`select=${encodeURIComponent(query.columns)}`);
  query.filters.forEach((f) => params.push(f));
  if (query.order) params.push(`order=${query.order}`);
  if (query.limitN != null) params.push(`limit=${query.limitN}`);
  if (opts.upsert && opts.onConflict) params.push(`on_conflict=${opts.onConflict}`);

  const url = `${cfg.SUPABASE_URL}/rest/v1/${query.table}${params.length ? "?" + params.join("&") : ""}`;
  const headers = {
    apikey: cfg.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: method === "GET" ? "" : "return=representation",
  };
  if (opts.upsert) headers.Prefer = "return=representation,resolution=merge-duplicates";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Supabase ${method} ${query.table} ${res.status}: ${txt}`);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}
