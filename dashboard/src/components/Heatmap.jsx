import { Fragment, useMemo } from "react";
import { heatmap } from "../lib/data.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Interpolate --chart-heat-0 → --chart-heat-4 by intensity.
function mix(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  const p = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${p[0]},${p[1]},${p[2]})`;
}
function hex(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v.startsWith("#") ? v.slice(1) : "f1efe9";
}

// Doomscroll heatmap (Spec §8): hour × day-of-week, when the gate fires most.
export default function Heatmap({ impulses }) {
  const { grid, max } = useMemo(() => heatmap(impulses), [impulses]);
  const c0 = hex("--chart-heat-0");
  const c4 = hex("--chart-heat-4");
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="card">
      <h3>Doomscroll heatmap</h3>
      <p className="panel-sub">When the gate fires most (hour × day).</p>
      {max === 0 ? (
        <p className="muted">No gate triggers yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, minWidth: 560 }}>
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center" }}>
                {hours.includes(h) ? h : ""}
              </div>
            ))}
            {DAYS.map((day, di) => (
              <Fragment key={day}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>{day}</div>
                {grid[di].map((v, hi) => (
                  <div
                    key={day + hi}
                    className="heat-cell"
                    title={`${day} ${hi}:00 — ${v} trigger${v === 1 ? "" : "s"}`}
                    style={{ background: v === 0 ? mix(c0, c4, 0) : mix(c0, c4, 0.15 + 0.85 * (v / max)) }}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
