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
    const pool = await db("article_pool").select("id,served").eq("user_id", user.id).is("served", "false").run();
    $("pool").textContent = pool ? pool.length : 0;
  } catch { $("pool").textContent = "–"; }

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
    if (isSignup) {
      // New account → send them straight to set up preferences on the dashboard (already
      // signed in), instead of the ambiguous three-button screen a first-timer can't parse.
      showOnly("onboard");
      await openDashboard("/settings");
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
  $("dashboard-link").addEventListener("click", (e) => { e.preventDefault(); openDashboard(""); });

  // Onboarding panel (shown right after a new account is created).
  $("open-settings").addEventListener("click", () => openDashboard("/settings"));
  $("onboard-later").addEventListener("click", async () => {
    const user = await currentUser();
    if (user) await renderDash(user);
  });

  $("signin").addEventListener("click", () => doAuth(signIn));
  $("signup").addEventListener("click", () => doAuth(signUp, { isSignup: true }));
  $("refresh").addEventListener("click", refresh);
  $("signout").addEventListener("click", async () => { await signOut(); showOnly("auth"); });
}

init();
