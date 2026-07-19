// Doomscroll heatmap (time-rows) — ported from Heatmap.dc.html, wired to impulse_log.
// Real grid is 7 days × 24 hours; we fold it into 7 × 12 two-hour buckets and map
// each bucket's count onto a 0–4 intensity relative to the busiest bucket.
import { heatmap } from "../../lib/data.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_LABELS = ["12a", "", "", "6a", "", "", "12p", "", "", "6p", "", ""];
const SCALE = ["#f2eee4", "#d7d1c4", "#a7a294", "#6d685c", "#2d2a22"];

export default function PaperHeatmap({ impulses }) {
  const { grid } = heatmap(impulses);
  // Fold 24 hours → 12 two-hour buckets: matrix[day][bucket].
  const matrix = grid.map((row) => {
    const out = [];
    for (let b = 0; b < 12; b++) out.push((row[b * 2] || 0) + (row[b * 2 + 1] || 0));
    return out;
  });
  let max = 0;
  for (const row of matrix) for (const v of row) if (v > max) max = v;
  const intensity = (v) => (v <= 0 || max === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const color = (v) => SCALE[intensity(v)] || SCALE[0];

  const cells = [];
  cells.push(<div key="corner" />);
  DAYS.forEach((d, di) => cells.push(
    <div key={"d" + di} style={{ fontSize: 11, color: "#8b877d", textAlign: "center", paddingBottom: 2, alignSelf: "end" }}>{d}</div>
  ));
  for (let ti = 0; ti < 12; ti++) {
    cells.push(
      <div key={"tl" + ti} style={{ fontSize: 10, color: "#8b877d", textAlign: "right", paddingRight: 4, alignSelf: "center" }}>{TIME_LABELS[ti]}</div>
    );
    for (let di = 0; di < 7; di++) {
      const v = matrix[di][ti];
      cells.push(
        <div key={"c" + ti + "-" + di} style={{ borderRadius: 4, background: color(v), border: v === 0 ? "1px solid #e6e1d6" : "none" }} />
      );
    }
  }

  return (
    <div style={{
      height: "100%", boxSizing: "border-box", background: "#ffffff", border: "1px solid #e7e3db", borderRadius: 22,
      padding: "24px 26px 22px", fontFamily: "'Instrument Sans',system-ui,sans-serif",
      boxShadow: "0 1px 2px rgba(30,25,15,.03)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Instrument Serif',Georgia,serif", fontWeight: 400, fontSize: 24, lineHeight: 1.05, color: "#1b1a17" }}>Doomscroll heatmap</h2>
          <div style={{ fontSize: 13, color: "#8b877d", marginTop: 4 }}>When you scroll most, by day and hour.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8b877d" }}>
          <span>less</span>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#eee9df", border: "1px solid #e2ddd2" }} />
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#c9c3b6" }} />
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#8f8a7d" }} />
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#3b382f" }} />
          <span>more</span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{
          flex: 1, display: "grid", gridTemplateColumns: "26px repeat(7,1fr)",
          gridTemplateRows: "auto repeat(12,1fr)", gap: 5, minHeight: 0,
        }}>{cells}</div>
      </div>
    </div>
  );
}
