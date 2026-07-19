// Genre distribution bars — layout from GenreBars.dc.html, themed via CSS variables.
import { genreDistribution } from "../../lib/data.js";

export default function PaperGenreBars({ reading }) {
  const dist = genreDistribution(reading);
  const total = dist.reduce((a, b) => a + b.count, 0) || 1;
  const genres = dist.slice(0, 6).map((g) => {
    const pct = Math.round((g.count / total) * 100);
    return { name: g.genre, count: g.count, pct, width: pct + "%" };
  });

  return (
    <div className="card" style={{ height: "100%", padding: "24px 26px 22px", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 400, fontSize: 24, lineHeight: 1.05, color: "var(--text)" }}>Genre distribution</h2>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Cumulative articles per genre.</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: 20 }}>
        {genres.length === 0 && <div style={{ fontSize: 14, color: "var(--muted)" }}>No reads yet — this fills in as you use the gate.</div>}
        {genres.map((g) => (
          <div key={g.name}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <span style={{ fontSize: 15, color: "var(--text)", fontWeight: 500 }}>{g.name}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}><strong style={{ color: "var(--text)" }}>{g.count}</strong> · {g.pct}%</span>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: "var(--track)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, background: "var(--bar-main)", width: g.width }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
