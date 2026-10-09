import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchReadingLog, readsByWeekday, sourceScorecard, interestByGenre } from "../lib/data.js";
import PaperArticlesChart from "../components/paper/PaperArticlesChart.jsx";

// Drill-in from the Overview's reading cards: reading volume over time, which days you
// read, where your articles come from, and which genres you liked most.
export default function ReadingStats() {
  const [reading, setReading] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchReadingLog().then(setReading).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="loading">Couldn't load data: {err}</div>;
  if (reading === null) return <div className="loading">Loading…</div>;

  const weekdays = readsByWeekday(reading);
  const dayMax = Math.max(1, ...weekdays.map((d) => d.count));
  const sources = sourceScorecard(reading).slice(0, 8);
  const srcMax = Math.max(1, ...sources.map((s) => s.count));
  const liked = interestByGenre(reading).slice(0, 8);

  return (
    <>
      <Link to="/" className="cc-back">← Overview</Link>
      <div className="page-head">
        <div>
          <h1 className="page-title">Reading record</h1>
          <p className="page-sub">All {reading.length} article{reading.length === 1 ? "" : "s"} you've read through the gate.</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.625rem" }}>
        <PaperArticlesChart reading={reading} />

        <div className="cc-two">
          <section className="cc-card">
            <div className="cc-head"><h2 className="cc-title">Which days you read</h2></div>
            <p className="cc-note">All-time articles by day of the week.</p>
            <div className="cc-cols">
              {weekdays.map((d) => (
                <div key={d.label} className="cc-col-bar">
                  <b>{d.count || ""}</b>
                  <div style={{ height: `${(d.count / dayMax) * 75}%` }} />
                </div>
              ))}
            </div>
            <div className="cc-col-labels">{weekdays.map((d) => <span key={d.label}>{d.label}</span>)}</div>
          </section>

          <section className="cc-card">
            <div className="cc-head"><h2 className="cc-title">Where you read</h2></div>
            <p className="cc-note">Articles per source.</p>
            {sources.length === 0 ? <p className="cc-note">No reads yet.</p> : (
              <div className="cc-bars">
                {sources.map((s) => (
                  <div key={s.source} className="cc-bar-row">
                    <span title={s.source}>{s.source}</span>
                    <div className="cc-bar-track"><div className="cc-bar-fill" style={{ width: `${(s.count / srcMax) * 100}%` }} /></div>
                    <span className="cc-bar-val">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="cc-card">
          <div className="cc-head"><h2 className="cc-title">What you liked most</h2></div>
          <p className="cc-note">Average interest you gave each genre at the gate (out of 5), and how many you read.</p>
          {liked.length === 0 ? <p className="cc-note">No reads yet.</p> : (
            <div className="cc-bars">
              {liked.map((g) => (
                <div key={g.genre} className="cc-bar-row">
                  <span title={g.genre}>{g.genre}</span>
                  <div className="cc-bar-track"><div className="cc-bar-fill" style={{ width: `${(g.interest / 5) * 100}%`, background: "var(--stamp)" }} /></div>
                  <span className="cc-bar-val">{g.interest.toFixed(1)} <span className="muted" style={{ fontWeight: 400 }}>· {g.count}</span></span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
