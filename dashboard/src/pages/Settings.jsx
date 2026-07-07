import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { fetchProfile, fetchBlocklist } from "../lib/data.js";
import { GENRE_GROUPS, SOURCES } from "../lib/genres.js";
import { useTheme } from "../lib/theme-context.jsx";
import { THEME_GROUPS, THEMES, swatchBg } from "../lib/themes.js";

function normalizeDomain(d) {
  return (d || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
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
  const [newDomain, setNewDomain] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([fetchProfile(), fetchBlocklist()])
      .then(([p, b]) => {
        setInterests(new Set(p?.interests || []));
        setDomains(b.map((r) => r.domain));
      })
      .catch((e) => setErr(e.message));
  }, []);

  function toggle(g) {
    const next = new Set(interests);
    next.has(g) ? next.delete(g) : next.add(g);
    setInterests(next);
  }

  function addDomain() {
    const d = normalizeDomain(newDomain);
    if (d && !domains.includes(d)) setDomains([...domains, d]);
    setNewDomain("");
  }

  async function save() {
    setStatus(""); setErr("");
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user.id;

      // Persist the previewed theme now (not on click).
      commit(pendingTheme);

      // interests → profiles
      const { error: pErr } = await supabase.from("profiles")
        .upsert({ user_id: uid, interests: [...interests] }, { onConflict: "user_id" });
      if (pErr) throw pErr;

      // blocklist → replace-all
      const { data: existing } = await supabase.from("blocklist").select("id,domain");
      const want = new Set(domains.map(normalizeDomain).filter(Boolean));
      const have = new Set((existing || []).map((r) => normalizeDomain(r.domain)));

      const toDelete = (existing || []).filter((r) => !want.has(normalizeDomain(r.domain))).map((r) => r.id);
      if (toDelete.length) await supabase.from("blocklist").delete().in("id", toDelete);

      const toAdd = [...want].filter((d) => !have.has(d)).map((d) => ({ user_id: uid, domain: d }));
      if (toAdd.length) await supabase.from("blocklist").insert(toAdd);

      setStatus("Saved. The extension picks up changes on its next refresh.");
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
        <h2>Theme</h2>
        <p className="sub">Pick a look. It applies to the dashboard and the reading gate.</p>
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

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Where your articles come from</h2>
        <p className="sub">For transparency, here are all the publishers Read First pulls news from. Which topics draw from which sources is chosen automatically.</p>
        <div className="row">
          {SOURCES.map((s) => <span key={s} className="pill source">{s}</span>)}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Interests</h2>
        <p className="sub">Articles are drawn from these topics (plus a 1-in-10 wildcard).</p>
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
        <h2>Blocked sites</h2>
        <p className="sub">Opening any of these triggers the gate. Use a bare domain like <code>instagram.com</code>.</p>
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
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomain())} />
          <button className="btn ghost" onClick={addDomain}>Add</button>
        </div>
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn" onClick={save}>Save changes</button>
        {status && <span style={{ color: "var(--success)", fontSize: "var(--fs-sm)" }}>{status}</span>}
      </div>
    </>
  );
}
