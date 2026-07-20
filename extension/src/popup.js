import { getConfig } from "./lib/config.js";
import { signIn, signUp, signOut, currentUser, getSession, db } from "./lib/sb.js";

const $ = (id) => document.getElementById(id);
const showOnly = (id) => {
  ["auth", "onboard", "dash"].forEach((x) => $(x).classList.toggle("hidden", x !== id));
};

async function dashboardBase() {
  const cfg = await getConfig();
  return (cfg.DASHBOARD_URL || "https://reading-gate.vercel.app").replace(/\/$/, "");
}

// Open the web dashboard in a new tab, handing off the current Supabase session in the URL
// hash so the user arrives already signed in with the same account they made here — no second
// login. The hash (not the query string) keeps the tokens off the wire; the dashboard adopts
// and strips them on load (see dashboard/src/lib/auth.jsx).
async function openDashboard(path = "") {
  const base = await dashboardBase();
  const session = await getSession();
  let url = base + path;
  if (session?.access_token && session?.refresh_token) {
    const frag = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    url += "#" + frag.toString();
  }
  await chrome.tabs.create({ url });
}

// Push this popup's auth state into any already-open dashboard tabs, so the account shown on
// the web dashboard always follows the one you're logged into here (the extension is the
// single source of truth). On sign-in we hand off the session; on sign-out we tell the
// dashboard to sign out too. Both use the URL hash, which the dashboard adopts and strips.
async function syncOpenDashboards({ signedOut = false } = {}) {
  const base = await dashboardBase();
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ url: base + "/*" });
  } catch { return; }
  if (!tabs.length) return;

  let hash = "";
  if (signedOut) {
    hash = "#signout=1";
  } else {
    const session = await getSession();
    if (!session?.access_token || !session?.refresh_token) return;
    hash = "#" + new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }).toString();
  }
  const url = base + "/login" + hash;
  for (const t of tabs) {
    try { await chrome.tabs.update(t.id, { url }); } catch {}
  }
}

function startOfWeekISO() {
  // Monday-start week, in UTC, without relying on Date.now-forbidden APIs (popups can use Date).
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // 0 = Monday
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  return d.toISOString();
}

async function renderDash(user) {
  showOnly("dash");
  $("who").textContent = user.email || "Logged in";

  // Fallback href for middle-click / open-in-new-tab; the click handler does the signed-in handoff.
  $("dashboard-link").href = await dashboardBase();

  try {
    const read = await db("reading_log").select("id").eq("user_id", user.id)
      .gte("created_at", startOfWeekISO()).run();
    $("read-week").textContent = read ? read.length : 0;
  } catch { $("read-week").textContent = "–"; }

  try {
    const imp = await db("impulse_log").select("id").eq("user_id", user.id)
      .gte("created_at", startOfWeekISO()).run();
    $("impulses").textContent = imp ? imp.length : 0;
  } catch { $("impulses").textContent = "–"; }
}

async function refresh() {
  $("refresh").textContent = "Refreshing…";
  try {
    // Full reset: flush the unread queue and refill with a fresh, diverse batch.
    await chrome.runtime.sendMessage({ type: "RESET_POOL" });
    const user = await currentUser();
    if (user) await renderDash(user);
  } finally {
    $("refresh").textContent = "Refresh articles";
  }
}

async function doAuth(fn, { isSignup = false } = {}) {
  $("auth-err").textContent = "";
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) { $("auth-err").textContent = "Enter email and password."; return; }
  try {
    const session = await fn(email, password);
    if (!session) { $("auth-err").textContent = "Check your email to confirm your account, then log in."; return; }
    await chrome.runtime.sendMessage({ type: "REFRESH_BLOCKLIST" });
    await chrome.runtime.sendMessage({ type: "REFILL_POOL" });
    await syncOpenDashboards();
    if (isSignup) {
      // New account → show the onboarding page with a clear next step, instead of the
      // ambiguous three-button screen a first-timer can't parse. We deliberately do NOT
      // auto-open the dashboard here: opening a tab steals focus and closes the popup, so
      // the message would never be seen. The user opens Settings from the button below.
      showOnly("onboard");
    } else {
      await renderDash(session.user);
    }
  } catch (e) {
    $("auth-err").textContent = e.message;
  }
}

async function init() {
  $("version").textContent = "v" + chrome.runtime.getManifest().version;
  const user = await currentUser();
  if (user) await renderDash(user);
  else showOnly("auth");

  // Preferences live on the web dashboard, not in the extension — open it already signed in.
  $("to-prefs").addEventListener("click", () => openDashboard("/settings"));
  $("dashboard-link").addEventListener("click", (e) => { e.preventDefault(); openDashboard("/login"); });

  // Onboarding panel (shown right after a new account is created).
  $("open-settings").addEventListener("click", () => openDashboard("/settings"));
  $("onboard-later").addEventListener("click", async () => {
    const user = await currentUser();
    if (user) await renderDash(user);
  });

  $("signin").addEventListener("click", () => doAuth(signIn));
  $("signup").addEventListener("click", () => doAuth(signUp, { isSignup: true }));
  $("refresh").addEventListener("click", refresh);
  $("signout").addEventListener("click", async () => {
    await signOut();
    await syncOpenDashboards({ signedOut: true });
    showOnly("auth");
  });
}

init();
