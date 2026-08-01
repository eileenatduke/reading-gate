// Background service worker (MV3) — the enforcement engine (Spec §3).
//
// Responsibilities:
//  - Track tab focus + per-tab unlock state.
//  - When a blocked-domain tab becomes the active foreground tab without a valid
//    unlock, trigger the gate (log an impulse, redirect the tab to gate.html).
//  - Completing the read grants a TIMED, site-wide unlock: the blocked domain stays open
//    for a per-site number of minutes (set in the dashboard's Settings), across tabs and
//    no matter how long the user steps away and returns. The gate only comes back once
//    that time is up — so a quick tab-switch never forces another read.
//  - Periodically refill each user's article pool.

import { getConfig } from "./lib/config.js";
import { db, currentUser } from "./lib/sb.js";
import { refillPool, resetPool } from "./lib/content.js";

const NONE = chrome.windows.WINDOW_ID_NONE;

// ---- in-memory + persisted state ------------------------------------------
// passes[domain] = { grantedAt }  (present + not-yet-expired => the whole site is unlocked).
// A pass is site-wide and time-boxed: once granted it holds for unlockMins[domain] minutes
// regardless of tab switches or how long the user is away, then expires and re-gates.
let passes = {};
let pendingImpulse = {}; // tabId -> impulse_log row id (to flip completed=true on submit)
let lastTrigger = {};    // tabId -> { domain, at }  (dedup rapid double-fires for one visit)
let blockDomains = [];   // bare hosts, e.g. ["instagram.com","tiktok.com"]
let unlockMins = {};     // domain -> minutes one completed read keeps that site open (per-site)
let activeTabId = null;
let windowFocused = true;

// Readiness barrier: MV3 workers restart on events, so listeners must wait until the
// persisted state + cached blocklist are loaded, or they'd evaluate against empty
// state and falsely re-gate a tab that already holds a valid unlock.
let resolveReady;
const ready = new Promise((r) => { resolveReady = r; });

async function persist() {
  await chrome.storage.session.set({ passes, pendingImpulse, activeTabId });
}
async function restore() {
  const s = await chrome.storage.session.get(["passes", "pendingImpulse", "activeTabId"]);
  passes = s.passes || {};
  pendingImpulse = s.pendingImpulse || {};
  activeTabId = s.activeTabId ?? null;
  // Fast local cache first so the barrier opens without waiting on the network.
  applyBlocklistCache((await chrome.storage.local.get("blocklist_cache")).blocklist_cache);
  resolveReady();
  // Then refresh the blocklist from Supabase in the background.
  loadBlocklist().catch(() => {});
  // One-time: flush any queue built by the old, non-diverse algorithm.
  maybeResetStalePool().catch(() => {});
}

// Load a cached blocklist into blockDomains + unlockMins. Accepts the current shape
// ([{domain, unlock_minutes}]) OR the legacy one (["instagram.com", ...]) so upgrading
// doesn't misread a cache written before per-site unlock times existed.
function applyBlocklistCache(cache) {
  if (!Array.isArray(cache)) return;
  const domains = [];
  const mins = {};
  for (const entry of cache) {
    if (typeof entry === "string") { domains.push(entry); continue; }
    if (entry && entry.domain) {
      domains.push(entry.domain);
      if (Number.isFinite(entry.unlock_minutes)) mins[entry.domain] = entry.unlock_minutes;
    }
  }
  blockDomains = domains;
  unlockMins = mins;
}

// Reset the article queue exactly once after upgrading to the diverse-pool logic,
// so users don't keep draining a stale single-topic backlog.
async function maybeResetStalePool() {
  const KEY = "pool_algo_v";
  const CURRENT = "diverse-1";
  const { [KEY]: v } = await chrome.storage.local.get(KEY);
  if (v === CURRENT) return;
  const user = await currentUser();
  if (!user) return; // not logged in yet — try again on the next worker start
  await resetPool().catch(() => {});
  await chrome.storage.local.set({ [KEY]: CURRENT });
}

// ---- blocklist cache -------------------------------------------------------
async function loadBlocklist() {
  applyBlocklistCache((await chrome.storage.local.get("blocklist_cache")).blocklist_cache);
  // Best-effort refresh from Supabase (requires login + config).
  try {
    const user = await currentUser();
    if (!user) return;
    // select("*") tolerates a DB that predates the unlock_minutes column (migration 0004):
    // the field is simply undefined and each site falls back to the default duration.
    const rows = await db("blocklist").select("*").eq("user_id", user.id).run();
    const cfg = await getConfig();
    const def = cfg.DEFAULT_UNLOCK_MINUTES || 15;
    const domains = [];
    const mins = {};
    for (const r of rows || []) {
      const d = normalizeDomain(r.domain);
      if (!d) continue;
      domains.push(d);
      const m = parseInt(r.unlock_minutes, 10);
      mins[d] = Number.isFinite(m) && m > 0 ? m : def;
    }
    blockDomains = domains;
    unlockMins = mins;
    await chrome.storage.local.set({ blocklist_cache: domains.map((d) => ({ domain: d, unlock_minutes: mins[d] })) });
    // The list may now include a domain the user just added while a tab is already sitting on
    // it — or that loaded before this fetch finished (the earlier navigation was checked
    // against a stale cache and slipped through). Re-check the active tab so the newly-blocked
    // site gets gated right away instead of only on its next navigation.
    if (activeTabId != null) evaluateActive(activeTabId);
  } catch (e) {
    // offline / not configured — keep cache
  }
}

function normalizeDomain(d) {
  if (!d) return "";
  return d.trim().toLowerCase()
    .replace(/^https?:\/\//, "")     // scheme
    .replace(/^www\./, "")           // leading www.
    .replace(/[/?#:].*$/, "");       // path, query, hash, or port — keep only the bare host
}

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ""; }
}

// Return the blocklist domain that matches this host, or null.
function matchedDomain(url) {
  const host = hostOf(url);
  if (!host) return null;
  for (const d of blockDomains) {
    if (host === d || host.endsWith("." + d)) return d;
  }
  return null;
}

function gateUrl(domain, target) {
  return chrome.runtime.getURL("src/gate/gate.html") +
    `?domain=${encodeURIComponent(domain)}&target=${encodeURIComponent(target)}`;
}

// ---- unlock validity -------------------------------------------------------
// A pass unlocks the whole domain for a fixed number of minutes from when it was granted —
// no tab binding, no blur/grace bookkeeping. Returning after any absence is fine until the
// pass expires; only then does the next visit re-gate.
async function isUnlockValid(domain) {
  const p = passes[domain];
  if (!p) return false;
  const cfg = await getConfig();
  const mins = unlockMins[domain] || cfg.DEFAULT_UNLOCK_MINUTES || 15;
  if (Date.now() - p.grantedAt <= mins * 60 * 1000) return true;
  // Expired — drop it so we don't keep re-checking a dead pass.
  delete passes[domain];
  persist();
  return false;
}

// ---- core: evaluate the focused tab ---------------------------------------
async function evaluateActive(tabId) {
  if (tabId == null) return;
  let tab;
  try { tab = await chrome.tabs.get(tabId); } catch { return; }
  const domain = matchedDomain(tab.url || "");
  if (!domain) return; // not a blocked site
  if (await isUnlockValid(domain)) return; // still inside the timed pass — let them through
  await triggerGate(tabId, domain, tab.url);
}

async function triggerGate(tabId, domain, target) {
  // One visit to a blocked site can wake this from two paths at once (webNavigation
  // onBeforeNavigate + tab activation/visibility), and redirects (http→https, apex→www)
  // can fire onBeforeNavigate several more times before the tab lands on the gate page.
  // Each fire would insert its own impulse_log row, so the counter reads one open as
  // several. Debounce per tab+domain: set the marker synchronously (before any await) so a
  // near-simultaneous second call sees it and bails; a genuine later re-visit (or a
  // different domain) is well past the window and still gates normally.
  const now = Date.now();
  const prev = lastTrigger[tabId];
  if (prev && prev.domain === domain && now - prev.at < 2000) return;
  lastTrigger[tabId] = { domain, at: now };

  delete passes[domain];
  // Log the impulse at trigger time — every gate trigger counts (Spec §7).
  try {
    const user = await currentUser();
    if (user) {
      const rows = await db("impulse_log").insert({ user_id: user.id, domain, completed: false });
      if (rows && rows[0]) pendingImpulse[tabId] = rows[0].id;
    }
  } catch (e) { console.warn("[gate:impulse]", e.message); }
  await persist();
  try { await chrome.tabs.update(tabId, { url: gateUrl(domain, target) }); } catch (e) {}
}

// ---- events ----------------------------------------------------------------
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await ready;
  activeTabId = tabId;
  await persist();
  if (windowFocused) evaluateActive(tabId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await ready;
  if (windowId === NONE) {
    windowFocused = false;
    return;
  }
  windowFocused = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) { activeTabId = tab.id; await persist(); evaluateActive(tab.id); }
  } catch {}
});

// Navigation into a blocked domain on the focused tab → gate before it settles.
chrome.webNavigation.onBeforeNavigate.addListener(async (d) => {
  if (d.frameId !== 0) return;
  await ready;
  const domain = matchedDomain(d.url);
  if (!domain) return;
  // Only gate the tab the user is actually looking at; background loads wait for focus.
  if (d.tabId !== activeTabId || !windowFocused) return;
  if (await isUnlockValid(domain)) return;
  await triggerGate(d.tabId, domain, d.url);
});

// A URL change in the focused tab (including SPA history navigations that skip
// webNavigation) → re-evaluate, so entering a blocked domain still gates. evaluateActive
// no-ops on an unblocked domain or one that still holds a valid pass, so this is cheap.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url) return;
  await ready;
  if (tabId === activeTabId && windowFocused) evaluateActive(tabId);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  delete pendingImpulse[tabId];
  delete lastTrigger[tabId];
  if (activeTabId === tabId) activeTabId = null;
  await persist();
});

// Content-script Page Visibility signal (Spec §3): same-tab hide/show backup.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    await ready;
    switch (msg?.type) {
      case "VISIBILITY": {
        const tabId = sender.tab?.id;
        if (tabId == null) return sendResponse({ ok: true });
        // A page reporting itself visible is authoritative that the user is looking at it —
        // more reliable than our cached `windowFocused` flag, which Chrome leaves stale when
        // the OS focus is held by a Picture-in-Picture / screen-share window during a video
        // call (onFocusChanged fires WINDOW_ID_NONE and never flips back until the call ends).
        // Gate on the page's own signal so a blocked site opened mid-call isn't left ungated.
        // (Hidden no longer matters — the pass is time-based, not blur-based.)
        if (!msg.hidden && tabId === activeTabId) await evaluateActive(tabId);
        return sendResponse({ ok: true });
      }
      case "GRANT_UNLOCK": {
        // Sent by the gate on successful submit, before it navigates to the target. Grant a
        // site-wide timed pass so the user can move around (and come back to) the whole
        // domain until it expires — not just this one tab.
        if (msg.domain) {
          passes[msg.domain] = { grantedAt: Date.now() };
          await persist();
        }
        return sendResponse({ ok: true });
      }
      case "GET_PENDING_IMPULSE": {
        const tabId = sender.tab?.id;
        return sendResponse({ impulseId: tabId != null ? pendingImpulse[tabId] || null : null });
      }
      case "SET_PENDING_IMPULSE": {
        // The gate page logged the impulse itself (background couldn't at trigger
        // time — e.g. no session yet). Register its id so completion still lands
        // on the right row and we don't double-count.
        const tabId = sender.tab?.id;
        if (tabId != null && msg.impulseId != null) { pendingImpulse[tabId] = msg.impulseId; await persist(); }
        return sendResponse({ ok: true });
      }
      case "CLEAR_PENDING_IMPULSE": {
        const tabId = sender.tab?.id;
        if (tabId != null) { delete pendingImpulse[tabId]; await persist(); }
        return sendResponse({ ok: true });
      }
      case "REFRESH_BLOCKLIST": {
        await loadBlocklist();
        return sendResponse({ ok: true, blockDomains });
      }
      case "REFILL_POOL": {
        const r = await refillPool().catch((e) => ({ error: e.message }));
        return sendResponse(r);
      }
      case "RESET_POOL": {
        const r = await resetPool().catch((e) => ({ error: e.message }));
        return sendResponse(r);
      }
      default:
        return sendResponse({ ok: false, error: "unknown message" });
    }
  })();
  return true; // async response
});

// ---- periodic content refresh ---------------------------------------------
async function ensureAlarms() {
  const cfg = await getConfig();
  chrome.alarms.create("refill", { periodInMinutes: cfg.POOL_REFILL_MINUTES || 30 });
  // Keep the blocklist fresh on a short cadence so a site the user just added on the web
  // dashboard starts gating within about a minute — even when the dashboard→extension push
  // can't reach us (e.g. the dashboard tab isn't open). loadBlocklist() re-checks the active
  // tab, so a site already open when it becomes blocked gets gated without a reload.
  chrome.alarms.create("blocklist", { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await ensureAlarms();
  await restore();

  // On a fresh install (not an update or Chrome refresh), open the welcome tab so new
  // users land on account creation instead of having to hunt for the toolbar icon.
  if (details.reason === "install") {
    try {
      await chrome.tabs.create({ url: chrome.runtime.getURL("src/welcome.html") });
    } catch {}
  }
});
chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarms();
  await restore();
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "blocklist") {
    loadBlocklist().catch(() => {});
    return;
  }
  if (a.name === "refill") {
    // Re-sync the blocklist from Supabase too, so edits made on the web dashboard
    // reach the extension without needing a browser restart.
    loadBlocklist().catch(() => {});
    refillPool().catch(() => {});
  }
});

// Kick a restore on first load of the worker.
restore();
