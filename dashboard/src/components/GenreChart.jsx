import { useMemo, useState } from "react";
import { genreDistribution } from "../lib/data.js";

// Horizontal, single-hue, sorted bars (design-faithful). Themed via CSS variables.
export default function GenreChart({ reading }) {
  const genres = useMemo(() => genreDistribution(reading), [reading]);
  const [hi, setHi] = useState(null);
  const max = Math.max(1, ...genres.map((g) => g.count));
  const total = genres.reduce((a, g) => a + g.count, 0) || 1;

  return (
    <section className="card">
      <h2>Genre distribution</h2>
      <p className="sub">Cumulative articles per genre.</p>
      {genres.length === 0 ? (
        <p className="muted">No reads yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {genres.map((g, i) => (
            <div key={g.genre} style={{ cursor: "pointer" }} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 6 }}>
                <span style={{ fontWeight: 500 }}>{g.genre}</span>
                <span className="muted"><b style={{ color: "var(--text)" }}>{g.count}</b> · {Math.round(g.count / total * 100)}%</span>
              </div>
              <div style={{ height: 12, borderRadius: 8, background: "var(--track,var(--surface-2))", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 8, width: `${(g.count / max) * 100}%`,
                  background: (hi == null || hi === i) ? "var(--bar-main)" : "color-mix(in srgb, var(--bar-main) 52%, #ffffff)",
                  transition: "width .6s cubic-bezier(.22,1,.36,1), background .2s ease",
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
