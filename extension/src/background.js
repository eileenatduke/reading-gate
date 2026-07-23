// Background service worker (MV3) — the enforcement engine (Spec §3).
//
// Responsibilities:
//  - Track tab focus + per-tab unlock state.
//  - When a blocked-domain tab becomes the active foreground tab without a valid
//    unlock, trigger the gate (log an impulse, redirect the tab to gate.html).
//  - An unlock is valid only while the user stays actively on that tab; it is revoked
//    on close, navigate-away, or losing focus for LONGER than the grace period (30s).
//  - Periodically refill each user's article pool.

import { getConfig } from "./lib/config.js";
import { db, currentUser } from "./lib/sb.js";
import { refillPool, resetPool } from "./lib/content.js";

const NONE = chrome.windows.WINDOW_ID_NONE;

// ---- in-memory + persisted state ------------------------------------------
// unlocks[tabId] = { domain, grantedAt, lastBlurAt|null }  (presence => unlocked)
let unlocks = {};
let pendingImpulse = {}; // tabId -> impulse_log row id (to flip completed=true on submit)
let blockDomains = [];   // bare hosts, e.g. ["instagram.com","tiktok.com"]
let activeTabId = null;
let windowFocused = true;

// Readiness barrier: MV3 workers restart on events, so listeners must wait until the
// persisted state + cached blocklist are loaded, or they'd evaluate against empty
// state and falsely re-gate a tab that already holds a valid unlock.
let resolveReady;
const ready = new Promise((r) => { resolveReady = r; });

async function persist() {
  await chrome.storage.session.set({ unlocks, pendingImpulse, activeTabId });
}
async function restore() {
  const s = await chrome.storage.session.get(["unlocks", "pendingImpulse", "activeTabId"]);
  unlocks = s.unlocks || {};
  pendingImpulse = s.pendingImpulse || {};
  activeTabId = s.activeTabId ?? null;
  // Fast local cache first so the barrier opens without waiting on the network.
  const cached = (await chrome.storage.local.get("blocklist_cache")).blocklist_cache;
  if (Array.isArray(cached)) blockDomains = cached;
  resolveReady();
  // Then refresh the blocklist from Supabase in the background.
  loadBlocklist().catch(() => {});
  // One-time: flush any queue built by the old, non-diverse algorithm.
  maybeResetStalePool().catch(() => {});
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
  const cached = (await chrome.storage.local.get("blocklist_cache")).blocklist_cache;
  if (Array.isArray(cached)) blockDomains = cached;
  // Best-effort refresh from Supabase (requires login + config).
  try {
    const user = await currentUser();
    if (!user) return;
    const rows = await db("blocklist").select("domain").eq("user_id", user.id).run();
    blockDomains = (rows || []).map((r) => normalizeDomain(r.domain)).filter(Boolean);
    await chrome.storage.local.set({ blocklist_cache: blockDomains });
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
async function isUnlockValid(tabId, domain) {
  const u = unlocks[tabId];
  if (!u || u.domain !== domain) return false;
  const cfg = await getConfig();

  // Optional stricter lever: cap continuous unlock length (disabled by default).
  const maxMs = (cfg.MAX_SESSION_MINUTES || 0) * 60 * 1000;
  if (maxMs && Date.now() - u.grantedAt > maxMs) return false;

  if (u.lastBlurAt == null) return true; // active, never blurred since grant
  const elapsed = Date.now() - u.lastBlurAt;
  const graceMs = (cfg.GRACE_SECS ?? 30) * 1000;
  return elapsed <= graceMs;
}

// ---- core: evaluate the focused tab ---------------------------------------
async function evaluateActive(tabId) {
  if (tabId == null) return;
  let tab;
  try { tab = await chrome.tabs.get(tabId); } catch { return; }
  const domain = matchedDomain(tab.url || "");
  if (!domain) return; // not a blocked site

  if (await isUnlockValid(tabId, domain)) {
    // Returning within grace (or still active): keep it, clear the blur stamp.
    if (unlocks[tabId]) { unlocks[tabId].lastBlurAt = null; await persist(); }
    return;
  }
  await triggerGate(tabId, domain, tab.url);
}

function markBlur(tabId) {
  if (tabId != null && unlocks[tabId] && unlocks[tabId].lastBlurAt == null) {
    unlocks[tabId].lastBlurAt = Date.now();
    persist();
  }
}

async function triggerGate(tabId, domain, target) {
  delete unlocks[tabId];
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
  if (activeTabId != null && activeTabId !== tabId) markBlur(activeTabId);
  activeTabId = tabId;
  await persist();
  if (windowFocused) evaluateActive(tabId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await ready;
  if (windowId === NONE) {
    windowFocused = false;
    markBlur(activeTabId);
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
  if (await isUnlockValid(d.tabId, domain)) return;
  await triggerGate(d.tabId, domain, d.url);
});

// Navigating away from the unlocked domain revokes the unlock for that tab.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url) return;
  await ready;
  const u = unlocks[tabId];
  if (u && matchedDomain(changeInfo.url) !== u.domain) {
    delete unlocks[tabId];
    await persist();
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  delete unlocks[tabId];
  delete pendingImpulse[tabId];
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
        if (msg.hidden) markBlur(tabId);
        // A page reporting itself visible is authoritative that the user is looking at it —
        // more reliable than our cached `windowFocused` flag, which Chrome leaves stale when
        // the OS focus is held by a Picture-in-Picture / screen-share window during a video
        // call (onFocusChanged fires WINDOW_ID_NONE and never flips back until the call ends).
        // Gate on the page's own signal so a blocked site opened mid-call isn't left ungated.
        else if (tabId === activeTabId) await evaluateActive(tabId);
        return sendResponse({ ok: true });
      }
      case "GRANT_UNLOCK": {
        // Sent by the gate page on successful submit, before it navigates to target.
        const tabId = sender.tab?.id;
        if (tabId != null) {
          unlocks[tabId] = { domain: msg.domain, grantedAt: Date.now(), lastBlurAt: null };
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
