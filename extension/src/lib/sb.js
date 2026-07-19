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

function isExpired(session) {
  if (!session?.expires_at) return true;
  // expires_at is unix seconds; refresh 60s early
  return Date.now() / 1000 > session.expires_at - 60;
}

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

// OAuth sign-in (Google / Outlook-Azure) for the extension.
//
// A browser extension can't use the web redirect flow, so we drive it through
// chrome.identity.launchWebAuthFlow: open Supabase's /authorize endpoint pointed
// at the extension's own https://<id>.chromiumapp.org/ redirect, let the user
// authenticate with the provider, then read the session Supabase hands back in
// the final redirect URL's fragment. Run this from the background service worker
// so it survives the popup closing when the auth window takes focus.
export async function signInWithOAuth(provider) {
  const cfg = await base();
  const redirectTo = chrome.identity.getRedirectURL(); // https://<id>.chromiumapp.org/

  const authUrl = new URL(`${cfg.SUPABASE_URL}/auth/v1/authorize`);
  authUrl.searchParams.set("provider", provider);
  authUrl.searchParams.set("redirect_to", redirectTo);
  // Outlook/Microsoft accounts go through the Azure provider; ask for email.
  if (provider === "azure") authUrl.searchParams.set("scopes", "email openid profile");

  let redirectResult;
  try {
    redirectResult = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });
  } catch (e) {
    // Chrome throws when the user closes the window or denies access.
    throw new Error(/did not approve|cancel/i.test(e?.message || "") ? "Sign-in was cancelled." : e.message);
  }
  if (!redirectResult) throw new Error("Sign-in was cancelled.");

  // Supabase returns the session in the URL fragment (implicit flow).
  const u = new URL(redirectResult);
  const params = new URLSearchParams((u.hash || u.search || "").replace(/^[#?]/, ""));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    throw new Error(params.get("error_description") || params.get("error") || "Sign-in failed.");
  }

  const expires_in = parseInt(params.get("expires_in") || "3600", 10);
  const session = {
    access_token,
    refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + expires_in,
    user: null,
  };
  await saveSession(session);

  // Load the full user record (id, email, metadata) so callers get a real user.
  try {
    const res = await fetch(`${cfg.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${access_token}` },
    });
    if (res.ok) {
      session.user = await res.json();
      await saveSession(session);
    }
  } catch {
    // Non-fatal: the session is valid; the user record refreshes on next read.
  }
  return session;
}

async function refresh(session) {
  const data = await authFetch("token?grant_type=refresh_token", {
    refresh_token: session.refresh_token,
  });
  const s = sessionFromToken(data);
  await saveSession(s);
  return s;
}

// Returns a valid access token, refreshing if needed. Null if not logged in.
export async function accessToken() {
  let s = await getSession();
  if (!s) return null;
  if (isExpired(s)) {
    try {
      s = await refresh(s);
    } catch (e) {
      // Another context (background/gate/popup) may have refreshed concurrently and
      // rotated the refresh token, making ours look invalid. Before logging the user
      // out, re-read storage — if a fresh session is already there, use it.
      const latest = await getSession();
      if (latest && !isExpired(latest) && latest.refresh_token !== s.refresh_token) {
        s = latest;
      } else {
        await clearSession();
        return null;
      }
    }
  }
  return s.access_token;
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
