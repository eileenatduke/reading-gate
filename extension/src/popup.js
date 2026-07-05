import { getConfig } from "./lib/config.js";
import { signIn, signUp, signOut, currentUser, db } from "./lib/sb.js";

const $ = (id) => document.getElementById(id);
const showOnly = (id) => {
  ["need-config", "auth", "dash"].forEach((x) => $(x).classList.toggle("hidden", x !== id));
};

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

  const cfg = await getConfig();
  $("dashboard-link").href = cfg.DASHBOARD_URL || "https://reading-gate.vercel.app";

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
    await chrome.runtime.sendMessage({ type: "REFILL_POOL" });
    const user = await currentUser();
    if (user) await renderDash(user);
  } finally {
    $("refresh").textContent = "Refresh articles";
  }
}

async function doAuth(fn) {
  $("auth-err").textContent = "";
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) { $("auth-err").textContent = "Enter email and password."; return; }
  try {
    const session = await fn(email, password);
    if (!session) { $("auth-err").textContent = "Check your email to confirm your account."; return; }
    await chrome.runtime.sendMessage({ type: "REFRESH_BLOCKLIST" });
    await chrome.runtime.sendMessage({ type: "REFILL_POOL" });
    await renderDash(session.user);
  } catch (e) {
    $("auth-err").textContent = e.message;
  }
}

async function init() {
  const cfg = await getConfig();
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) { showOnly("need-config"); }
  else {
    const user = await currentUser();
    if (user) await renderDash(user);
    else showOnly("auth");
  }

  $("to-options-1").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("to-options-2").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("signin").addEventListener("click", () => doAuth(signIn));
  $("signup").addEventListener("click", () => doAuth(signUp));
  $("refresh").addEventListener("click", refresh);
  $("signout").addEventListener("click", async () => { await signOut(); showOnly("auth"); });
}

init();
