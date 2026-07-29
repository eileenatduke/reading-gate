import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { fetchProfile, fetchBlocklist } from "../lib/data.js";
import { GENRE_GROUPS, SOURCES } from "../lib/genres.js";
import { useTheme } from "../lib/theme-context.jsx";
import { THEME_GROUPS, THEMES, swatchBg } from "../lib/themes.js";

function normalizeDomain(d) {
  return (d || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "")     // scheme
    .replace(/^www\./, "")           // leading www.
    .replace(/[/?#:].*$/, "");       // path, query, hash, or port — keep only the bare host
}

// One-tap presets for the most-requested sites, so users don't have to type them. Each is a
// bare host that matches the extension's blocklist matcher (apex + any subdomain).
const PRESET_SITES = [
  { label: "Instagram", domain: "instagram.com" },
  { label: "TikTok", domain: "tiktok.com" },
  { label: "YouTube", domain: "youtube.com" },
  { label: "LinkedIn", domain: "linkedin.com" },
  { label: "Snapchat", domain: "snapchat.com" },
  { label: "Netflix", domain: "netflix.com" },
  { label: "Hulu", domain: "hulu.com" },
  { label: "Disney+", domain: "disneyplus.com" },
  { label: "Pinterest", domain: "pinterest.com" },
  { label: "Reddit", domain: "reddit.com" },
];

// A custom source is just a site address plus an optional display name. The user can
// paste a homepage ("nytimes.com") OR a raw feed URL — the extension figures out the
// actual feed when it fetches (autodiscovery), so here we only need a plausible URL.
// Name defaults to the site's hostname.
function normalizeFeed(name, url) {
  let u = (url || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u.replace(/^\/+/, "");
  let host;
  try { host = new URL(u).hostname; } catch { return null; }
  if (!host.includes(".")) return null; // reject "asdf" but allow any real domain
  let n = (name || "").trim();
  if (!n) n = host.replace(/^www\./, "");
  return { name: n, url: u };
}

export default function Settings() {
  const navigate = useNavigate();
  const { theme, preview, commit, resetPreview } = useTheme();
  const [pendingTheme, setPendingTheme] = useState(theme);
  // Follow the saved theme until the user picks a different one.
  useEffect(() => { setPendingTheme(theme); }, [theme]);
  // Revert any unsaved theme preview when leaving the page.
  useEffect(() => () => resetPreview(), [resetPreview]);

  const [interests, setInterests] = useState(new Set());
  const [domains, setDomains] = useState([]);
  const [customFeeds, setCustomFeeds] = useState([]);
  const [articlesRequired, setArticlesRequired] = useState(1);
  // Whether the user has saved settings before — gates the one-time "You're all set" modal.
  const [onboarded, setOnboarded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  // The first-time "Getting started" guide shows until the user saves once (i.e. while
  // !onboarded) or dismisses it by hand.
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [domainErr, setDomainErr] = useState("");
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([fetchProfile(), fetchBlocklist()])
      .then(([p, b]) => {
        setInterests(new Set(p?.interests || []));
        setCustomFeeds(Array.isArray(p?.custom_feeds) ? p.custom_feeds : []);
        setDomains(b.map((r) => r.domain));
      })
      .catch((e) => setErr(e.message));
    // Minimum-articles preference lives in auth metadata (shared with the gate).
    supabase.auth.getUser().then(({ data }) => {
      const n = parseInt(data?.user?.user_metadata?.articles_required, 10);
      if (Number.isFinite(n) && n > 0) setArticlesRequired(n);
      setOnboarded(!!data?.user?.user_metadata?.onboarded);
    }).catch(() => {});
  }, []);

  // The saved check only reflects the last successful save — any edit clears it.
  useEffect(() => { setStatus(""); }, [pendingTheme, interests, domains, customFeeds, articlesRequired]);

  // Let Escape dismiss the welcome modal.
  useEffect(() => {
    if (!showWelcome) return;
    const onKey = (e) => { if (e.key === "Escape") setShowWelcome(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showWelcome]);

  const clampReq = (n) => Math.max(1, Math.min(20, parseInt(n, 10) || 1));

  function toggle(g) {
    const next = new Set(interests);
    next.has(g) ? next.delete(g) : next.add(g);
    setInterests(next);
  }

  function addDomain() {
    const d = normalizeDomain(newDomain);
    // Require a real host (must contain a dot). A bare word like "tiktok" would be stored but
    // could never match a visited URL's hostname, so the site would silently never gate.
    if (!d || !d.includes(".")) {
      setDomainErr("Enter a full site address, like tiktok.com");
      return;
    }
    if (!domains.includes(d)) setDomains([...domains, d]);
    setNewDomain("");
    setDomainErr("");
  }

  // Toggle a preset site on/off in the blocklist with a single click.
  function togglePreset(domain) {
    setDomains((cur) => (cur.includes(domain) ? cur.filter((d) => d !== domain) : [...cur, domain]));
    if (domainErr) setDomainErr("");
  }

  function addFeed() {
    const f = normalizeFeed(newFeedName, newFeedUrl);
    if (!f) { setErr("Enter a site address, like nytimes.com"); return; }
    setErr("");
    if (!customFeeds.some((x) => x.url === f.url)) setCustomFeeds([...customFeeds, f]);
    setNewFeedName(""); setNewFeedUrl("");
  }

  async function save() {
    setStatus(""); setErr("");
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user.id;

      // Persist the previewed theme locally now (not on click).
      commit(pendingTheme);
      // Theme + minimum-articles → auth metadata in one write (shared with the gate).
      await supabase.auth.updateUser({ data: { theme: pendingTheme, articles_required: articlesRequired, onboarded: true } });

      // interests + custom feeds → profiles. If the DB hasn't had the custom_feeds
      // migration (0002) applied, that column is missing and PostgREST rejects the whole
      // upsert (code PGRST204). Detect that and retry without custom_feeds so theme,
      // interests, and the blocklist still save — the rest of Settings keeps working.
      const base = { user_id: uid, interests: [...interests] };
      let { error: pErr } = await supabase.from("profiles")
        .upsert({ ...base, custom_feeds: customFeeds }, { onConflict: "user_id" });
      if (pErr && (pErr.code === "PGRST204" || /custom_feeds/i.test(pErr.message || ""))) {
        // custom_feeds column missing (migration 0002 not applied) — retry without it so
        // theme, interests, and the blocklist still save.
        ({ error: pErr } = await supabase.from("profiles").upsert(base, { onConflict: "user_id" }));
      }
      if (pErr) throw pErr;

      // blocklist → replace-all
      const { data: existing } = await supabase.from("blocklist").select("id,domain");
      const want = new Set(domains.map(normalizeDomain).filter(Boolean));
      const have = new Set((existing || []).map((r) => normalizeDomain(r.domain)));

      const toDelete = (existing || []).filter((r) => !want.has(normalizeDomain(r.domain))).map((r) => r.id);
      if (toDelete.length) await supabase.from("blocklist").delete().in("id", toDelete);

      const toAdd = [...want].filter((d) => !have.has(d)).map((d) => ({ user_id: uid, domain: d }));
      if (toAdd.length) await supabase.from("blocklist").insert(toAdd);

      // Nudge the extension to re-fetch the blocklist right away, so a domain the user just
      // added starts gating immediately instead of waiting for the extension's periodic
      // refresh. The dashboard-bridge content script (running on this origin) relays this to
      // the background worker; on pages without the extension installed it's a harmless no-op.
      if (toAdd.length || toDelete.length) {
        window.postMessage({ __readingGate: true, type: "BLOCKLIST_CHANGED" }, window.location.origin);
      }

      setStatus("saved");
      // First successful save ever → welcome the user and point them to next steps.
      if (!onboarded) { setOnboarded(true); setShowWelcome(true); }
    } catch (e) {
      setErr(e.message);
    }
  }

  // "Try it on a blocked site" — open the first site the user just blocked in a new tab so
  // the gate fires live. If they blocked nothing there's nothing to demo, so just close.
  function tryBlockedSite() {
    setShowWelcome(false);
    const first = domains.map(normalizeDomain).filter(Boolean)[0];
    if (first) window.open("https://" + first, "_blank", "noopener");
  }

  if (err) return <div className="loading">Error: {err}</div>;

  // Preset picks are shown (and toggled) by the "Popular sites" buttons, so keep them out of
  // the list below — that list is only for sites the user typed in by hand. Presets stay in
  // `domains` either way, so they're still saved and enforced.
  const presetDomainSet = new Set(PRESET_SITES.map((p) => p.domain));
  const additionalSites = domains.filter((d) => !presetDomainSet.has(d));

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Personalize your reading and your view.</p>
        </div>
      </div>

      {!onboarded && !guideDismissed && (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--accent)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <h2 style={{ margin: 0 }}>Getting started</h2>
            <button
              onClick={() => setGuideDismissed(true)}
              aria-label="Dismiss getting started guide"
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", font: "inherit", fontSize: 13, padding: 0 }}
            >
              Dismiss
            </button>
          </div>
          <p className="sub" style={{ marginTop: 4 }}>New here? Set up Reading Gate top to bottom, then hit Save.</p>
          <ol style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.7, fontSize: "0.9375rem" }}>
            <li><b>Block distracting sites</b> — tap a popular site or paste any URL.</li>
            <li><b>Set your reading goal</b> — how many articles unlock a site.</li>
            <li><b>Pick your interests</b> — and add any custom sources you subscribe to.</li>
            <li><b>Choose a theme</b> — make the dashboard yours.</li>
            <li><b>Save changes</b> — your gate goes live right away.</li>
          </ol>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Blocked sites</h2>
        <p className="sub">Tap a popular site to block it, or paste in any other URL below.</p>
        <div className="group-heading" style={{ marginBottom: 8 }}>Popular sites</div>
        <div className="row" style={{ marginBottom: 16 }}>
          {PRESET_SITES.map(({ label, domain }) => {
            const on = domains.includes(domain);
            return (
              <div key={domain} className={"toggle" + (on ? " on" : "")}
                role="checkbox" aria-checked={on} tabIndex={0}
                onClick={() => togglePreset(domain)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), togglePreset(domain))}>
                {label}
              </div>
            );
          })}
        </div>
        <div className="group-heading" style={{ marginBottom: 8 }}>Additional sites</div>
        <div className="row" style={{ marginBottom: 16 }}>
          {additionalSites.length === 0 && <span className="muted">No sites yet.</span>}
          {additionalSites.map((d) => (
            <span className="chip" key={d}>
              {d}
              <button aria-label={`Remove ${d}`} onClick={() => setDomains(domains.filter((x) => x !== d))}>×</button>
            </span>
          ))}
        </div>
        <div className="row">
          <input className="input" placeholder="tiktok.com" value={newDomain}
            onChange={(e) => { setNewDomain(e.target.value); if (domainErr) setDomainErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomain())} />
          <button className="btn ghost" onClick={addDomain}>Add</button>
        </div>
        {domainErr && <p className="sub" style={{ color: "var(--danger, #c0392b)", marginTop: 8 }}>{domainErr}</p>}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Reading goal</h2>
        <p className="sub">How many articles you must read before a blocked site unlocks. You can always keep reading beyond it.</p>
        <div className="row" style={{ alignItems: "center", gap: 12 }}>
          <button className="btn ghost" aria-label="Fewer" onClick={() => setArticlesRequired((v) => clampReq(v - 1))} style={{ padding: "8px 16px", fontSize: 18, lineHeight: 1 }}>−</button>
          <input className="input" type="number" min="1" max="20" value={articlesRequired}
            onChange={(e) => setArticlesRequired(clampReq(e.target.value))}
            style={{ width: 72, textAlign: "center" }} />
          <button className="btn ghost" aria-label="More" onClick={() => setArticlesRequired((v) => clampReq(v + 1))} style={{ padding: "8px 16px", fontSize: 18, lineHeight: 1 }}>+</button>
          <span className="muted" style={{ fontSize: 13 }}>{articlesRequired === 1 ? "article" : "articles"} to unlock a site</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Where your articles come from</h2>
        <p className="sub">For transparency, here are all the publishers Reading Gate pulls news from. This is a read-only list — nothing to pick here.</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.85, color: "var(--muted)" }}>
          {SOURCES.join("  ·  ")}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Custom sources</h2>
        <p className="sub">
          If you are subscribed to something that isn't on our feed, such as the New York Times, WSJ, a
          favorite blog, add it here and Reading Gate will pull from those sites too.
        </p>
        <div className="row" style={{ marginBottom: 16 }}>
          {customFeeds.length === 0 && <span className="muted">No custom sources yet.</span>}
          {customFeeds.map((f, i) => (
            <span className="chip" key={f.url} title={f.url}>
              {f.name}
              <button aria-label={`Remove ${f.name}`} onClick={() => setCustomFeeds(customFeeds.filter((_, j) => j !== i))}>×</button>
            </span>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" placeholder="(News Source Name)" value={newFeedName}
            style={{ maxWidth: 220 }}
            onChange={(e) => setNewFeedName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeed())} />
          <input className="input" placeholder="(News Source Website URL)" value={newFeedUrl}
            style={{ flex: 1, minWidth: 240 }}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeed())} />
          <button className="btn ghost" onClick={addFeed}>Add</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Interests</h2>
        {GENRE_GROUPS.map(({ group, genres }) => (
          <div key={group} style={{ marginBottom: 16 }}>
            <div className="group-heading">{group}</div>
            <div className="row">
              {genres.map((g) => (
                <div key={g} className={"toggle" + (interests.has(g) ? " on" : "")}
                  role="checkbox" aria-checked={interests.has(g)} tabIndex={0}
                  onClick={() => toggle(g)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle(g))}>
                  {g}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Theme</h2>
        {THEME_GROUPS.map(({ label, keys }) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <div className="group-heading">{label}</div>
            <div className="swatches">
              {keys.map((k) => (
                <button
                  key={k}
                  title={THEMES[k].name}
                  aria-label={`${THEMES[k].name} theme`}
                  aria-pressed={pendingTheme === k}
                  onClick={() => { setPendingTheme(k); preview(k); }}
                  className="swatch"
                  style={{ background: swatchBg(k), boxShadow: pendingTheme === k ? "0 0 0 2px var(--accent)" : "0 0 0 1px rgba(0,0,0,.08)" }}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="muted" style={{ fontSize: 13 }}>
          Selected: <b style={{ color: "var(--text)" }}>{THEMES[pendingTheme].name}</b>
          {pendingTheme !== theme && <span style={{ color: "var(--accent)" }}> · unsaved</span>}
        </div>
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn" onClick={save}>Save changes</button>
        {status === "saved" && (
          <span role="img" aria-label="Saved" title="Saved"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 14, lineHeight: 1 }}>
            ✓
          </span>
        )}
      </div>

      {showWelcome && (
        <div role="dialog" aria-modal="true" aria-labelledby="welcome-title"
          onClick={() => setShowWelcome(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(20,20,30,.45)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}>
          <div className="card" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, width: "100%", textAlign: "center", padding: "44px 40px" }}>
            <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 18 }}>🎉</div>
            <h2 id="welcome-title" style={{ margin: "0 0 14px", fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 400, fontSize: 34, letterSpacing: "-.01em", color: "var(--text)" }}>You're all set</h2>
            <p style={{ margin: "0 auto 28px", maxWidth: 400, fontSize: 17, lineHeight: 1.6, color: "var(--muted)" }}>
              Your reading gate is live! Try it on a blocked site to see it in action, or explore your dashboard.
            </p>
            <div className="row" style={{ justifyContent: "center", flexWrap: "wrap", gap: 12 }}>
              <button className="btn" autoFocus onClick={tryBlockedSite} style={{ padding: "0.75rem 1.75rem" }}>Try it on a blocked site</button>
              <button className="btn ghost" onClick={() => { setShowWelcome(false); navigate("/"); }} style={{ padding: "0.75rem 1.75rem" }}>Go to dashboard</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
