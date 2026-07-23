import { useEffect, useState, useRef } from "react";
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
  const [newDomain, setNewDomain] = useState("");
  const [domainErr, setDomainErr] = useState("");
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  // True once we detect the DB is missing the custom_feeds column (migration 0002
  // not applied). We still save everything else; custom sources persist once it's run.
  const [feedsUnsupported, setFeedsUnsupported] = useState(false);
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
    }).catch(() => {});
  }, []);

  // The saved check only reflects the last successful save — any edit clears it.
  useEffect(() => { setStatus(""); }, [pendingTheme, interests, domains, customFeeds, articlesRequired]);

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
      await supabase.auth.updateUser({ data: { theme: pendingTheme, articles_required: articlesRequired } });

      // interests + custom feeds → profiles. If the DB hasn't had the custom_feeds
      // migration (0002) applied, that column is missing and PostgREST rejects the whole
      // upsert (code PGRST204). Detect that and retry without custom_feeds so theme,
      // interests, and the blocklist still save — the rest of Settings keeps working.
      const base = { user_id: uid, interests: [...interests] };
      let { error: pErr } = await supabase.from("profiles")
        .upsert({ ...base, custom_feeds: customFeeds }, { onConflict: "user_id" });
      if (pErr && (pErr.code === "PGRST204" || /custom_feeds/i.test(pErr.message || ""))) {
        setFeedsUnsupported(true);
        ({ error: pErr } = await supabase.from("profiles").upsert(base, { onConflict: "user_id" }));
      } else if (!pErr) {
        setFeedsUnsupported(false);
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
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err) return <div className="loading">Error: {err}</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Personalize your reading and your view.</p>
        </div>
      </div>

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
        <div className="group-heading" style={{ marginBottom: 8 }}>Your blocked sites</div>
        <div className="row" style={{ marginBottom: 16 }}>
          {domains.length === 0 && <span className="muted">No sites yet.</span>}
          {domains.map((d, i) => (
            <span className="chip" key={d}>
              {d}
              <button aria-label={`Remove ${d}`} onClick={() => setDomains(domains.filter((_, j) => j !== i))}>×</button>
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
        <h2>Articles per unlock</h2>
        <p className="sub">How many articles you must read before a blocked site will open. You always have the option to keep reading more beyond this minimum requirement.</p>
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
        <p className="sub">For transparency, here are all the publishers Reading Gate pulls news from.</p>
        <div className="row">
          {SOURCES.map((s) => <span key={s} className="pill source">{s}</span>)}
        </div>
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
        {feedsUnsupported && (
          <p className="sub" style={{ margin: "12px 0 0", color: "var(--danger)" }}>
            Custom sources can’t be saved until your Supabase database has the{" "}
            <code>custom_feeds</code> update applied (migration <code>0002_custom_feeds.sql</code>).
            Your other settings saved fine.
          </p>
        )}
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
    </>
  );
}
