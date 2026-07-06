import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { fetchProfile, fetchBlocklist } from "../lib/data.js";
import { GENRE_GROUPS } from "../lib/genres.js";

function normalizeDomain(d) {
  return (d || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

export default function Settings() {
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
      <h1 className="page-title">Settings</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Interests</h3>
        <p className="panel-sub">Articles are drawn from these topics (plus a 1-in-10 wildcard).</p>
        {GENRE_GROUPS.map(({ group, genres }) => (
          <div key={group} style={{ marginBottom: "var(--sp-4)" }}>
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

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Blocked sites</h3>
        <p className="panel-sub">Opening any of these triggers the gate. Use a bare domain like <code>instagram.com</code>.</p>
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
