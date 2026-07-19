// Doomscroll heatmap (time-rows) — layout from Heatmap.dc.html, wired to impulse_log.
// Real grid is 7 days × 24 hours; folded into 7 × 12 two-hour buckets. Cell colors are
// a CSS color-mix ramp on the theme accent → heading color, so the heatmap follows the
// Settings theme (and updates live during theme preview).
import { heatmap } from "../../lib/data.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_LABELS = ["12a", "", "", "6a", "", "", "12p", "", "", "6p", "", ""];

// r in 0..1 → white → accent (mid) → heading color. Mirrors themes.js heatColor(),
// but with CSS variables so it re-themes without a re-render.
function ramp(r) {
  if (r <= 0.5) return `color-mix(in srgb, var(--accent) ${(r / 0.5 * 100).toFixed(1)}%, #ffffff)`;
  // Dark end defaults to the heading color; solid themes set --heat-dark to a dark shade
  // of the accent so the heatmap stays in one (brand) color family.
  return `color-mix(in srgb, var(--heat-dark, var(--text)) ${((r - 0.5) / 0.5 * 100).toFixed(1)}%, var(--accent))`;
}

export default function PaperHeatmap({ impulses }) {
  const { grid } = heatmap(impulses);
  const matrix = grid.map((row) => {
    const out = [];
    for (let b = 0; b < 12; b++) out.push((row[b * 2] || 0) + (row[b * 2 + 1] || 0));
    return out;
  });
  let max = 0;
  for (const row of matrix) for (const v of row) if (v > max) max = v;
  const level = (v) => (v <= 0 || max === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const cellStyle = (v) => {
    const lv = level(v);
    return lv === 0
      ? { background: "var(--track)", border: "1px solid var(--border)" }
      : { background: ramp(lv / 4) };
  };

  const cells = [];
  cells.push(<div key="corner" />);
  DAYS.forEach((d, di) => cells.push(
    <div key={"d" + di} style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", paddingBottom: 2, alignSelf: "end" }}>{d}</div>
  ));
  for (let ti = 0; ti < 12; ti++) {
    cells.push(
      <div key={"tl" + ti} style={{ fontSize: 10, color: "var(--muted)", textAlign: "right", paddingRight: 4, alignSelf: "center" }}>{TIME_LABELS[ti]}</div>
    );
    for (let di = 0; di < 7; di++) {
      cells.push(<div key={"c" + ti + "-" + di} style={{ borderRadius: 4, ...cellStyle(matrix[di][ti]) }} />);
    }
  }

  const legend = [
    { background: "var(--track)", border: "1px solid var(--border)" },
    { background: ramp(0.33) }, { background: ramp(0.66) }, { background: ramp(1) },
  ];

  return (
    <div className="card" style={{ height: "100%", padding: "24px 26px 22px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 0 -.035em", fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 400, fontSize: 24, lineHeight: 1.05, color: "var(--text)" }}>Doomscroll heatmap</h2>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>When you scroll most, by day and hour.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
          <span>less</span>
          {legend.map((s, i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 3, ...s }} />)}
          <span>more</span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "26px repeat(7,1fr)", gridTemplateRows: "auto repeat(12,1fr)", gap: 5, minHeight: 0 }}>{cells}</div>
      </div>
    </div>
  );
}
