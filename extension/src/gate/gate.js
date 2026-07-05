import { getConfig } from "../lib/config.js";
import { currentUser, db } from "../lib/sb.js";
import { pickArticle } from "../lib/recommender.js";

const params = new URLSearchParams(location.search);
const domain = params.get("domain") || "";
const target = params.get("target") || "";

const $ = (id) => document.getElementById(id);
const MIN_WORDS = 70;

let article = null;
let quality = 0;
let preference = 0;

function show(stateId) {
  ["blocked-state", "loading-state", "gate-state"].forEach((id) => {
    $(id).classList.toggle("hidden", id !== stateId);
  });
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

    // 1. Save the completed read.
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

    // 2. Mark this gate trigger as completed.
    const { impulseId } = await chrome.runtime.sendMessage({ type: "GET_PENDING_IMPULSE" });
    if (impulseId) {
      await db("impulse_log").eq("id", impulseId).update({ completed: true });
      await chrome.runtime.sendMessage({ type: "CLEAR_PENDING_IMPULSE" });
    }

    // 3. Grant the unlock (background must record it BEFORE we navigate to target).
    await chrome.runtime.sendMessage({ type: "GRANT_UNLOCK", domain });

    // 4. Unlock this visit only — go to the site the user wanted.
    location.href = target || `https://${domain}`;
  } catch (e) {
    $("submit").disabled = false;
    $("submit").textContent = "Submit & unlock";
    $("why").textContent = "Save failed: " + e.message;
  }
}

async function init() {
  const cfg = await getConfig();
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    $("blocked-msg").textContent = "The extension isn't connected to Supabase yet.";
    show("blocked-state");
    return;
  }
  const user = await currentUser();
  if (!user) {
    $("blocked-msg").textContent = "Please log in to Read First to continue.";
    show("blocked-state");
    return;
  }

  show("loading-state");
  try {
    article = await pickArticle();
  } catch (e) {
    $("blocked-msg").textContent = "Couldn't load an article: " + e.message;
    show("blocked-state");
    return;
  }
  if (!article) {
    $("blocked-msg").textContent =
      "No articles are ready yet. Pick some interests in settings, then try again.";
    show("blocked-state");
    return;
  }

  // Render
  $("a-source").textContent = article.source;
  $("a-genre").textContent = article.genre;
  $("a-serendipity").classList.toggle("hidden", !article.is_serendipity);
  $("a-title").textContent = article.title;
  $("a-blurb").textContent = article.blurb || "";
  $("a-read").href = article.url;
  $("a-read-source").textContent = article.source;

  buildStars("quality", (v) => { quality = v; });
  buildStars("preference", (v) => { preference = v; });
  $("summary").addEventListener("input", updateCounter);
  $("submit").addEventListener("click", submit);
  updateCounter();

  show("gate-state");
}

$("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
init();
