import { getConfig, setConfig } from "./lib/config.js";
import { currentUser, db } from "./lib/sb.js";
import { GENRE_GROUPS } from "./lib/feeds.js";

const $ = (id) => document.getElementById(id);

let selectedInterests = new Set();
let domains = [];

function status(el, msg, ok) {
  el.textContent = msg;
  el.className = "status " + (ok ? "ok" : "err");
}

function renderInterests() {
  const box = $("interests");
  box.innerHTML = "";
  for (const { group, genres } of GENRE_GROUPS) {
    const heading = document.createElement("div");
    heading.className = "group-heading";
    heading.textContent = group;
    box.appendChild(heading);

    const row = document.createElement("div");
    row.className = "pills";
    for (const g of genres) {
      const b = document.createElement("div");
      b.className = "toggle" + (selectedInterests.has(g) ? " on" : "");
      b.textContent = g;
      b.setAttribute("role", "checkbox");
      b.setAttribute("aria-checked", String(selectedInterests.has(g)));
      b.addEventListener("click", () => {
        if (selectedInterests.has(g)) selectedInterests.delete(g);
        else selectedInterests.add(g);
        renderInterests();
      });
      row.appendChild(b);
    }
    box.appendChild(row);
  }
}

function renderBlocklist() {
  const box = $("blocklist");
  box.innerHTML = "";
  if (!domains.length) {
    const p = document.createElement("span");
    p.className = "muted";
    p.textContent = "No sites yet.";
    box.appendChild(p);
  }
  domains.forEach((d, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = d;
    const x = document.createElement("button");
    x.textContent = "×";
    x.setAttribute("aria-label", `Remove ${d}`);
    x.addEventListener("click", () => { domains.splice(i, 1); renderBlocklist(); });
    chip.appendChild(x);
    box.appendChild(chip);
  });
}

function normalizeDomain(d) {
  return (d || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

async function loadConn() {
  const cfg = await getConfig();
  $("sb-url").value = cfg.SUPABASE_URL || "";
  $("sb-key").value = cfg.SUPABASE_ANON_KEY || "";
  $("guardian").value = cfg.GUARDIAN_API_KEY || "";
  $("dash-url").value = cfg.DASHBOARD_URL || "";
  $("grace").value = cfg.GRACE_SECS ?? 30;
}

async function saveConn() {
  await setConfig({
    SUPABASE_URL: $("sb-url").value.trim().replace(/\/$/, ""),
    SUPABASE_ANON_KEY: $("sb-key").value.trim(),
    GUARDIAN_API_KEY: $("guardian").value.trim() || "test",
    DASHBOARD_URL: $("dash-url").value.trim(),
    GRACE_SECS: Number($("grace").value) || 30,
  });
  status($("conn-status"), "Saved. Now log in from the popup.", true);
  await loadAccount();
}

async function loadAccount() {
  const user = await currentUser();
  if (!user) {
    $("account").classList.add("hidden");
    $("login-note").classList.remove("hidden");
    return;
  }
  $("login-note").classList.add("hidden");
  $("account").classList.remove("hidden");

  try {
    const profile = (await db("profiles").select("interests").eq("user_id", user.id).run())?.[0];
    selectedInterests = new Set(profile?.interests || []);
  } catch { selectedInterests = new Set(); }

  try {
    const rows = await db("blocklist").select("domain").eq("user_id", user.id).order("created_at").run();
    domains = (rows || []).map((r) => r.domain);
  } catch { domains = []; }

  renderInterests();
  renderBlocklist();
}

async function saveAccount() {
  const user = await currentUser();
  if (!user) { status($("acc-status"), "Log in first.", false); return; }
  try {
    // Interests → upsert into profiles.
    await db("profiles").upsert(
      [{ user_id: user.id, interests: Array.from(selectedInterests) }],
      "user_id"
    );

    // Blocklist: replace-all (simple + correct for a small list).
    const existing = (await db("blocklist").select("id,domain").eq("user_id", user.id).run()) || [];
    const want = new Set(domains.map(normalizeDomain).filter(Boolean));
    const have = new Set(existing.map((r) => normalizeDomain(r.domain)));

    for (const r of existing) {
      if (!want.has(normalizeDomain(r.domain))) {
        await db("blocklist").eq("id", r.id).remove();
      }
    }
    const toAdd = [...want].filter((d) => !have.has(d)).map((d) => ({ user_id: user.id, domain: d }));
    if (toAdd.length) await db("blocklist").upsert(toAdd, "user_id,domain");

    await chrome.runtime.sendMessage({ type: "REFRESH_BLOCKLIST" });
    await chrome.runtime.sendMessage({ type: "REFILL_POOL" });
    status($("acc-status"), "Saved.", true);
  } catch (e) {
    status($("acc-status"), e.message, false);
  }
}

$("save-conn").addEventListener("click", saveConn);
$("save-account").addEventListener("click", saveAccount);
$("add-domain").addEventListener("click", () => {
  const d = normalizeDomain($("new-domain").value);
  if (d && !domains.includes(d)) domains.push(d);
  $("new-domain").value = "";
  renderBlocklist();
});
$("new-domain").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("add-domain").click(); }
});

(async () => { await loadConn(); await loadAccount(); })();
