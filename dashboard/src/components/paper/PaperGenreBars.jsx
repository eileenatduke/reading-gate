// Genre distribution bars — ported from GenreBars.dc.html, wired to real reads.
import { genreDistribution } from "../../lib/data.js";

export default function PaperGenreBars({ reading }) {
  const dist = genreDistribution(reading);
  const total = dist.reduce((a, b) => a + b.count, 0) || 1;
  const genres = dist.slice(0, 6).map((g) => {
    const pct = Math.round((g.count / total) * 100);
    return { name: g.genre, count: g.count, pct, width: pct + "%" };
  });

  return (
    <div style={{
      height: "100%", boxSizing: "border-box", background: "#ffffff", border: "1px solid #e7e3db", borderRadius: 22,
      padding: "24px 26px 22px", fontFamily: "'Instrument Sans',system-ui,sans-serif",
      boxShadow: "0 1px 2px rgba(30,25,15,.03)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontFamily: "'Instrument Serif',Georgia,serif", fontWeight: 400, fontSize: 24, lineHeight: 1.05, color: "#1b1a17" }}>Genre distribution</h2>
        <div style={{ fontSize: 13, color: "#8b877d", marginTop: 4 }}>Cumulative articles per genre.</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: 20 }}>
        {genres.length === 0 && <div style={{ fontSize: 14, color: "#8b877d" }}>No reads yet — this fills in as you use the gate.</div>}
        {genres.map((g) => (
          <div key={g.name}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <span style={{ fontSize: 15, color: "#1b1a17", fontWeight: 500 }}>{g.name}</span>
              <span style={{ fontSize: 13, color: "#5c584e" }}><strong style={{ color: "#1b1a17" }}>{g.count}</strong> · {g.pct}%</span>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: "#eae6dd", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, background: "#1b1a17", width: g.width }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
