import { Fragment, useMemo, useState } from "react";
import { heatmap } from "../lib/data.js";
import { useTheme } from "../lib/theme-context.jsx";
import { heatColor } from "../lib/themes.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Doomscroll heatmap (design-faithful): 7 days × 12 two-hour buckets, themed ramp.
export default function Heatmap({ impulses }) {
  const { theme, isGlass } = useTheme();
  const [cell, setCell] = useState(null);

  const { rows, max } = useMemo(() => {
    const { grid } = heatmap(impulses);
    const bucketed = grid.map((cells) => {
      const b = [];
      for (let h = 0; h < 24; h += 2) b.push(cells[h] + cells[h + 1]);
      return b;
    });
    return { rows: bucketed, max: Math.max(1, ...bucketed.flat()) };
  }, [impulses]);

  const bg = (val) => {
    const ratio = val / max;
    if (isGlass) return heatColor(theme, ratio);
    if (val === 0) return "var(--surface-2)";
    return `rgba(var(--accent-rgb), ${(0.06 + ratio * 0.94).toFixed(2)})`;
  };

  const legend = isGlass ? [0.04, 0.28, 0.52, 0.76, 1] : [0.1, 0.3, 0.5, 0.75, 1];
  const hourLabels = Array.from({ length: 12 }, (_, i) => {
    const h = i * 2;
    return h % 6 === 0 ? (h === 0 ? "12a" : h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`) : "";
  });

  let caption = "When you scroll most, by day and hour.";
  if (cell) {
    const h = cell.h * 2;
    const hr = h === 0 ? "12am" : h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`;
    caption = `${DAYS[cell.d]} at ${hr} · ${cell.val} trigger${cell.val === 1 ? "" : "s"}`;
  }

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2>Doomscroll heatmap</h2>
          <p className="sub" style={{ minHeight: 19, marginBottom: 0 }}>{caption}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--faint)" }}>less
          <div style={{ display: "flex", gap: 3 }}>
            {legend.map((r, i) => <span key={i} style={{ width: 13, height: 13, borderRadius: 3, background: isGlass ? heatColor(theme, r) : `rgba(var(--accent-rgb),${r})` }} />)}
          </div>more
        </div>
      </div>

      <div style={{ marginTop: 24, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {rows.map((cells, di) => (
          <div key={di} style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
            <span style={{ width: 30, fontSize: 12, color: "var(--hlabel,var(--muted))", textAlign: "right", flexShrink: 0 }}>{DAYS[di]}</span>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 8 }}>
              {cells.map((val, hi) => (
                <div key={hi}
                  onMouseEnter={() => setCell({ d: di, h: hi, val })}
                  onMouseLeave={() => setCell(null)}
                  style={{
                    aspectRatio: "1", borderRadius: 5, background: bg(val),
                    border: isGlass ? "1px solid var(--bar-main)" : "1px solid transparent",
                    boxShadow: cell && cell.d === di && cell.h === hi ? "0 0 0 2px var(--accent2)" : "none",
                    cursor: "pointer", transition: "box-shadow .15s ease",
                  }} />
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, paddingLeft: 41, marginTop: 6 }}>
          {hourLabels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: "var(--hlabel,var(--faint))" }}>{l}</div>)}
        </div>
      </div>
    </section>
  );
}
