import { getConfig } from "../lib/config.js";
import { currentUser, db, signIn, signUp, getUserFresh, getSession } from "../lib/sb.js";
import { pickArticle } from "../lib/recommender.js";
import { verifySummary } from "../lib/verify.js";
import { applyTheme, DEFAULT_THEME } from "../lib/themes.js";

const params = new URLSearchParams(location.search);
const domain = params.get("domain") || "";
const target = params.get("target") || "";

const $ = (id) => document.getElementById(id);
const MIN_WORDS = 50;

let article = null;
let preference = 0;  // interest signal (1/4/5) from the reaction row
let required = 1;      // minimum articles to read before the site can be accessed
let sessionReads = 0;  // articles completed during this gate visit
let impulseId = null;  // impulse_log row for this gate visit (created at trigger, or backfilled here)
let openedArticle = false; // did the reader click through to the article on the source?
let openedAt = null;       // timestamp of the first open — powers the dwell-time signal

// Invisible anti-gaming dwell timer. The user must spend at least MIN_READ_SECONDS on
// the gate (per article) before Submit unlocks — enough time to actually read and write,
// not paste a summary and leave. It's wall-clock and does NOT pause on blur: reading
// happens on the source site, which opens in a new tab, so the gate is backgrounded while
// the user reads and that time must count. The countdown is never shown to the user.
let minReadSecs = 60;  // loaded from config in init()
let readStartMs = 0;   // when the current article was rendered
let tickTimer = null;  // 1s interval that re-checks the dwell timer

function elapsedSecs() {
  return readStartMs ? (Date.now() - readStartMs) / 1000 : Infinity;
}

function stopTick() {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
}

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
  stopTick();  // leaving the reading view — don't leave a tick running
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

// "Teach your feed" reactions. One tap sets the interest signal the recommender averages
// per genre: 👎 pulls a genre below the neutral-3 default, 👍/🔥 push it above.
const REACTIONS = [
  { emoji: "👎", label: "Not for me", score: 1 },
  { emoji: "👍", label: "Good", score: 4 },
  { emoji: "🔥", label: "More like this", score: 5 },
];

function buildReactions(containerId, onChange) {
  const el = $(containerId);
  el.innerHTML = "";
  const btns = [];
  REACTIONS.forEach((r) => {
    const b = document.createElement("button");
    b.className = "reaction";
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", "false");
    b.setAttribute("aria-label", r.label);
    b.innerHTML = `<span class="emoji" aria-hidden="true">${r.emoji}</span><span>${r.label}</span>`;
    b.addEventListener("click", () => {
      onChange(r.score);
      btns.forEach((x) => {
        const on = x === b;
        x.classList.toggle("selected", on);
        x.setAttribute("aria-checked", String(on));
      });
      updateSubmit();
    });
    btns.push(b);
    el.appendChild(b);
  });
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
  const timeOk = elapsedSecs() >= minReadSecs;
  const ok = n >= MIN_WORDS && preference > 0 && timeOk;
  $("submit").disabled = !ok;
  // Build the visible "why" hint from the ratable requirements only — the dwell timer is
  // deliberately invisible. If everything the user can see is satisfied but the timer hasn't
  // elapsed, show a neutral note (no number, no mention of a timer) so Submit is never a dead
  // button with no explanation. Once the timer's met, stop ticking — nothing left to recheck.
  const missing = [];
  if (n < MIN_WORDS) missing.push(`${MIN_WORDS - n} more words`);
  if (!preference) missing.push("a reaction");
  if (missing.length) {
    $("why").textContent = "Need: " + missing.join(", ");
  } else if (!timeOk) {
    $("why").textContent = "Just a moment…";
  } else {
    $("why").textContent = "";
    stopTick();
  }
}

async function submit() {
  $("submit").disabled = true;
  $("why").textContent = "";
  try {
    const user = await currentUser();
    if (!user) throw new Error("Not logged in");

    // Anti-gaming check (Spec §11 v2): before we accept the read, ask the backend
    // AI check whether this summary is a genuine reflection of the article the reader
    // was shown — catching random text typed without opening the article. Fail-open:
    // verifySummary returns ok:true whenever the check can't run, so an outage never
    // blocks a real reader; only an explicit "fail" holds the gate.
    $("submit").textContent = "Checking…";
    const summaryText = $("summary").value.trim();
    const check = await verifySummary({
      article,
      summary: summaryText,
      signals: {
        openedArticle,
        dwellSeconds: openedAt ? (Date.now() - openedAt) / 1000 : 0,
      },
    });
    if (!check.ok) {
      $("submit").disabled = false;
      $("submit").textContent = "Submit";
      $("why").textContent = check.reason;
      return;
    }

    $("submit").textContent = "Saving…";

    // Save the completed read.
    await db("reading_log").insert({
      user_id: user.id,
      article_title: article.title,
      article_url: article.url,
      source: article.source,
      genre: article.genre,
      summary_text: $("summary").value.trim(),
      quality_rating: 3, // Quality rating retired from the UI; column is NOT NULL, so write neutral.
      preference_rating: preference,
      is_serendipity: !!article.is_serendipity,
    });
    sessionReads++;

    // Mark this gate trigger completed the moment the minimum is met, and default its
    // outcome to "closed" — the user did the reading and hasn't gone to the site. The
    // choice buttons below overwrite this if they keep reading or head to the site; if
    // they just close the tab, "closed" stands (still a resisted impulse).
    if (sessionReads === required) {
      if (!impulseId) await ensureImpulse();
      if (impulseId) {
        // Impulse logging must never block the reading flow, so keep this out of submit()'s
        // main throw path. Try the combined write; if the DB predates migration 0003 (no
        // `outcome` column) it 400s, so fall back to just `completed` — the completion
        // metrics still work, and the resist chart fills in once the migration is applied.
        try {
          await db("impulse_log").eq("id", impulseId).update({ completed: true, outcome: "closed" });
        } catch (e) {
          console.warn("[gate:impulse] outcome write failed — is migration 0003 applied?", e.message);
          try { await db("impulse_log").eq("id", impulseId).update({ completed: true }); } catch (e2) { console.warn("[gate:impulse]", e2.message); }
        }
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
  stopTick();  // reading done for this article — nothing left to time
  $("choices-msg").textContent =
    `You've read ${sessionReads} article${sessionReads === 1 ? "" : "s"} — your goal of ${required} is met. Keep reading, or head to the site.`;
  show("choices-state");
}

// The user met their goal and chose to read more instead of going to the site — record
// that resisting choice (overwriting the default "closed" outcome), then load the next
// article. Best-effort: never block reading on impulse logging.
async function keepReading() {
  // Reaching this button means the goal is met, so assert completed too — that keeps every
  // row that has an outcome consistent with the resist chart's "completed" filter.
  try {
    if (!impulseId) await ensureImpulse();
    if (impulseId) await db("impulse_log").eq("id", impulseId).update({ completed: true, outcome: "kept_reading" });
  } catch (e) {
    console.warn("[gate:impulse] kept_reading write failed — is migration 0003 applied?", e.message);
  }
  await loadNextArticle();
}

async function accessSite() {
  // Record that they caved to the site BEFORE navigating, so the "went to site" outcome is
  // captured even as we leave the page (this overwrites "closed"/"kept_reading").
  try {
    if (!impulseId) await ensureImpulse();
    if (impulseId) await db("impulse_log").eq("id", impulseId).update({ completed: true, outcome: "went_to_site" });
  } catch (e) {
    console.warn("[gate:impulse] went_to_site write failed — is migration 0003 applied?", e.message);
  }
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
  article = a; preference = 0;
  openedArticle = false; openedAt = null;
  $("a-source").textContent = a.source;
  $("a-genre").textContent = a.genre;
  $("a-serendipity").classList.toggle("hidden", !a.is_serendipity);
  $("a-title").textContent = a.title;
  $("a-blurb").textContent = a.blurb || "";
  $("a-read").href = a.url;
  $("a-read-source").textContent = a.source;
  buildReactions("reactions", (v) => { preference = v; });
  $("summary").value = "";
  $("submit").textContent = "Submit";
  // (Re)start the invisible dwell timer for this article and tick every second so Submit
  // unlocks the moment the minimum reading time is reached.
  stopTick();
  readStartMs = Date.now();
  tickTimer = setInterval(updateSubmit, 1000);
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
  const cfg = await getConfig();
  const s = parseInt(cfg.MIN_READ_SECONDS, 10);
  minReadSecs = Number.isFinite(s) && s >= 0 ? s : 60;
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
// Type-only summary: block pasting/drag-dropping external text so the user writes in
// their own words rather than dropping in an AI-generated summary. `paste` covers
// Ctrl/Cmd-V, right-click paste, and middle-click (primary-selection) paste; `drop` +
// `dragover` cover dragged text. Copy/cut stay allowed — only inserting text is blocked.
["paste", "drop", "dragover"].forEach((evt) =>
  $("summary").addEventListener(evt, (e) => e.preventDefault())
);
// Record that the reader opened the article on the source (the gate's only path to
// the full text). First open stamps the dwell clock; both feed the AI check as
// behavioral signals for "did they actually read it?".
$("a-read").addEventListener("click", () => {
  openedArticle = true;
  if (!openedAt) openedAt = Date.now();
});
$("access-btn").addEventListener("click", accessSite);
$("more-btn").addEventListener("click", keepReading);
$("go-dashboard").addEventListener("click", () => openDashboard("/login"));
// Swap the recommendation for a fresh one. loadNextArticle() replaces the global
// `article`, and submit() logs whatever `article` currently is — so the reading_log
// (and therefore the dashboard) records the genre/source of the article the user
// actually read and summarized, not the one first offered.
$("refresh-article").addEventListener("click", loadNextArticle);

// Instant paint from the cached theme, then refine from the server in loadTheme().
chrome.storage.local.get("gate_theme").then(({ gate_theme }) => applyTheme(gate_theme || DEFAULT_THEME));
init();
