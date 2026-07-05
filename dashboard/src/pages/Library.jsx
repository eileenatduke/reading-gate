import { useEffect, useMemo, useState } from "react";
import { fetchReadingLog } from "../lib/data.js";
import Stars from "../components/Stars.jsx";

export default function Library() {
  const [reading, setReading] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [source, setSource] = useState("");
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    fetchReadingLog()
      .then((r) => setReading(r.slice().reverse())) // newest first
      .catch((e) => setErr(e.message));
  }, []);

  const genres = useMemo(() => [...new Set((reading || []).map((r) => r.genre))].sort(), [reading]);
  const sources = useMemo(() => [...new Set((reading || []).map((r) => r.source))].sort(), [reading]);

  const filtered = useMemo(() => {
    if (!reading) return [];
    const needle = q.trim().toLowerCase();
    return reading.filter((r) => {
      if (genre && r.genre !== genre) return false;
      if (source && r.source !== source) return false;
      if (minRating && r.quality_rating < minRating) return false;
      if (needle) {
        const hay = (r.article_title + " " + r.summary_text).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [reading, q, genre, source, minRating]);

  if (err) return <div className="loading">Couldn't load your library: {err}</div>;
  if (reading === null) return <div className="loading">Loading…</div>;

  return (
    <>
      <h1 className="page-title">Library</h1>
      <p className="muted" style={{ marginTop: -12, marginBottom: 16 }}>
        Your personal knowledge base — {reading.length} article{reading.length === 1 ? "" : "s"} read.
      </p>

      <div className="filters">
        <input type="search" placeholder="Search titles & summaries…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">All genres</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
          <option value={0}>Any quality</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}★ and up</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="muted">No articles match.</p>
      ) : (
        filtered.map((r) => (
          <div className="lib-row" key={r.id}>
            <div className="top">
              <a className="title" href={r.article_url} target="_blank" rel="noopener noreferrer">{r.article_title}</a>
              <span className="date">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p className="summary">{r.summary_text}</p>
            <div className="meta">
              <span className="pill source">{r.source}</span>
              <span className="pill">{r.genre}</span>
              {r.is_serendipity && <span className="pill">wildcard</span>}
              <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>Quality</span>
              <Stars value={r.quality_rating} label="Quality" />
              <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>Interest</span>
              <Stars value={r.preference_rating} label="Interest" />
            </div>
          </div>
        ))
      )}
    </>
  );
}
