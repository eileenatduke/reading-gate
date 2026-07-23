import { getConfig } from "../lib/config.js";
import { currentUser, db, signIn, signUp, getUserFresh, getSession } from "../lib/sb.js";
import { pickArticle } from "../lib/recommender.js";
import { applyTheme, DEFAULT_THEME } from "../lib/themes.js";

const params = new URLSearchParams(location.search);
const domain = params.get("domain") || "";
const target = params.get("target") || "";

const $ = (id) => document.getElementById(id);
const MIN_WORDS = 70;

let article = null;
let quality = 0;
let preference = 0;
let required = 1;      // minimum articles to read before the site can be accessed
let sessionReads = 0;  // articles completed during this gate visit
let impulseId = null;  // impulse_log row for this gate visit (created at trigger, or backfilled here)

// Make sure this gate trigger is recorded in impulse_log. The background worker logs
// it at trigger time, but only if a session exists then — so a visit where the user
// had to log in first would go uncounted (and the doomscroll heatmap would miss it).
// The gate page always ends up authenticated, so backfill the row here when the
// background didn't, and hand the id back so completion marks the right row.
async function ensureImpulse() {
  if (impulseId) return;
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_PENDING_IMPULSE" });
    if (res && res.impulseId) { impulseId = res.impulseId; return; }
    const user = await currentUser();
    if (!user) return;
    const rows = await db("impulse_log").insert({ user_id: user.id, domain, completed: false });
    if (rows && rows[0]) {
      impulseId = rows[0].id;
      await chrome.runtime.sendMessage({ type: "SET_PENDING_IMPULSE", impulseId }).catch(() => {});
    }
  } catch (e) {
    // Best effort — never block reading on impulse logging.
  }
}

function show(stateId) {
  ["login-state", "message-state", "loading-state", "gate-state", "choices-state"].forEach((id) => {
    $(id).classList.toggle("hidden", id !== stateId);
  });
}

async function message(text) {
  $("message-msg").textContent = text;
  $("open-dashboard").href = await dashboardBase();
  show("message-state");
}

async function dashboardBase() {
  const cfg = await getConfig();
  return (cfg.DASHBOARD_URL || "https://reading-gate.vercel.app").replace(/\/$/, "");
}

// Open the web dashboard in a new tab, handing off the current session in the URL hash
// so the user arrives already signed in (same approach as the popup). The hash keeps the
// tokens off the wire; the dashboard adopts and strips them on load.
async function openDashboard(path = "/login") {
  const base = await dashboardBase();
  const session = await getSession();
  let url = base + path;
  if (session?.access_token && session?.refresh_token) {
    url += "#" + new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }).toString();
  }
  window.open(url, "_blank", "noopener");
}

function wordCount(text) {
  return (text.trim().match(/\S+/g) || []).length;
}

function buildStars(containerId, onChange) {
  const el = $(containerId);
  el.innerHTML = "";
  const btns = [];
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button");
    b.className = "star";
    b.type = "button";
    b.textContent = "★";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", `${i} of 5`);
    b.addEventListener("click", () => {
      onChange(i);
      btns.forEach((x, idx) => {
        const filled = idx < i;
        x.classList.toggle("filled", filled);
        x.setAttribute("aria-checked", String(idx + 1 === i));
      });
      updateSubmit();
    });
    btns.push(b);
    el.appendChild(b);
  }
}

function updateCounter() {
  const n = wordCount($("summary").value);
  const c = $("counter");
  c.textContent = `${n} / ${MIN_WORDS} words`;
  c.classList.toggle("ok", n >= MIN_WORDS);
  updateSubmit();
}

function updateSubmit() {
  const n = wordCount($("summary").value);
  const ok = n >= MIN_WORDS && quality > 0 && preference > 0;
  $("submit").disabled = !ok;
  const missing = [];
  if (n < MIN_WORDS) missing.push(`${MIN_WORDS - n} more words`);
  if (!quality) missing.push("quality rating");
  if (!preference) missing.push("interest rating");
  $("why").textContent = ok ? "" : "Need: " + missing.join(", ");
}

async function submit() {
  $("submit").disabled = true;
  $("submit").textContent = "Saving…";
  try {
    const user = await currentUser();
    if (!user) throw new Error("Not logged in");

    // Save the completed read.
    await db("reading_log").insert({
      user_id: user.id,
      article_title: article.title,
      article_url: article.url,
      source: article.source,
      genre: article.genre,
      summary_text: $("summary").value.trim(),
      quality_rating: quality,
      preference_rating: preference,
      is_serendipity: !!article.is_serendipity,
    });
    sessionReads++;

    // Mark this gate trigger completed the moment the minimum is met.
    if (sessionReads === required) {
      if (!impulseId) await ensureImpulse();
      if (impulseId) {
        await db("impulse_log").eq("id", impulseId).update({ completed: true });
        await chrome.runtime.sendMessage({ type: "CLEAR_PENDING_IMPULSE" }).catch(() => {});
      }
    }

    // Below the minimum → keep reading. At/above → let the user choose.
    if (sessionReads >= required) showChoices();
    else await loadNextArticle();
  } catch (e) {
    $("submit").disabled = false;
    $("submit").textContent = "Submit";
    $("why").textContent = "Save failed: " + e.message;
  }
}

function showChoices() {
  $("choices-msg").textContent =
    `You've read ${sessionReads} article${sessionReads === 1 ? "" : "s"} — your goal of ${required} is met. Keep reading, or head to the site.`;
  show("choices-state");
}

async function accessSite() {
  // Grant the unlock (background records it BEFORE we navigate), then send the user to the
  // exact site they just unlocked. `target` is the blocked URL captured when the gate fired;
  // fall back to the bare domain if it's missing or isn't a real web address (e.g. a
  // chrome:// / extension page), so this button can only ever open the blocked site — never
  // some unrelated page. The grant is best-effort: navigate even if the message fails.
  try { await chrome.runtime.sendMessage({ type: "GRANT_UNLOCK", domain }); } catch {}
  const dest = /^https?:\/\//i.test(target) ? target : `https://${domain}`;
  location.href = dest;
}

// Load the user's prefs (theme + minimum articles) from auth metadata.
async function loadPrefs() {
  try {
    const user = await getUserFresh();
    const meta = user?.user_metadata || {};
    if (meta.theme) {
      applyTheme(meta.theme);
      chrome.storage.local.set({ gate_theme: meta.theme });
    } else {
      // No saved theme → Mono default. Don't keep a theme cached from a different account.
      applyTheme(DEFAULT_THEME);
      chrome.storage.local.set({ gate_theme: DEFAULT_THEME });
    }
    const n = parseInt(meta.articles_required, 10);
    required = Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    required = 1;
  }
}

function updateProgress() {
  const p = $("progress");
  if (required > 1) {
    p.textContent = `Article ${sessionReads + 1} · goal ${required}`;
    p.classList.remove("hidden");
  } else {
    p.classList.add("hidden");
  }
}

function renderArticle(a) {
  article = a; quality = 0; preference = 0;
  $("a-source").textContent = a.source;
  $("a-genre").textContent = a.genre;
  $("a-serendipity").classList.toggle("hidden", !a.is_serendipity);
  $("a-title").textContent = a.title;
  $("a-blurb").textContent = a.blurb || "";
  $("a-read").href = a.url;
  $("a-read-source").textContent = a.source;
  buildStars("quality", (v) => { quality = v; });
  buildStars("preference", (v) => { preference = v; });
  $("summary").value = "";
  $("submit").textContent = "Submit";
  updateProgress();
  updateCounter();
  show("gate-state");
}

async function loadNextArticle() {
  show("loading-state");
  let a;
  try {
    a = await pickArticle();
  } catch (e) {
    await message("Couldn't load an article: " + e.message);
    return;
  }
  if (!a) {
    await message("No articles are ready yet. Add a few interests on your dashboard, then reopen this site.");
    return;
  }
  renderArticle(a);
}

async function init() {
  const user = await currentUser();
  if (!user) {
    show("login-state");
    return;
  }
  sessionReads = 0;
  impulseId = null;
  await ensureImpulse();    // record the trigger now (backfills if we just logged in)
  await loadPrefs();        // theme + minimum-articles requirement
  await loadNextArticle();
}

async function doAuth(fn) {
  const err = $("login-err");
  err.classList.add("hidden");
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) {
    err.textContent = "Enter your email and password.";
    err.classList.remove("hidden");
    return;
  }
  $("login-btn").disabled = true;
  $("signup-btn").disabled = true;
  try {
    const session = await fn(email, password);
    if (!session) {
      err.textContent = "Check your email to confirm your account, then log in.";
      err.classList.remove("hidden");
      return;
    }
    // Prime the extension, then go straight into reading — no settings detour.
    await chrome.runtime.sendMessage({ type: "REFRESH_BLOCKLIST" }).catch(() => {});
    await chrome.runtime.sendMessage({ type: "REFILL_POOL" }).catch(() => {});
    await init();
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove("hidden");
  } finally {
    $("login-btn").disabled = false;
    $("signup-btn").disabled = false;
  }
}

$("login-btn").addEventListener("click", () => doAuth(signIn));
$("signup-btn").addEventListener("click", () => doAuth(signUp));
$("password").addEventListener("keydown", (e) => { if (e.key === "Enter") $("login-btn").click(); });
$("submit").addEventListener("click", submit);
$("summary").addEventListener("input", updateCounter);
$("access-btn").addEventListener("click", accessSite);
$("more-btn").addEventListener("click", loadNextArticle);
$("go-dashboard").addEventListener("click", () => openDashboard("/login"));
// Swap the recommendation for a fresh one. loadNextArticle() replaces the global
// `article`, and submit() logs whatever `article` currently is — so the reading_log
// (and therefore the dashboard) records the genre/source of the article the user
// actually read and summarized, not the one first offered.
$("refresh-article").addEventListener("click", loadNextArticle);

// Instant paint from the cached theme, then refine from the server in loadTheme().
chrome.storage.local.get("gate_theme").then(({ gate_theme }) => applyTheme(gate_theme || DEFAULT_THEME));
init();
