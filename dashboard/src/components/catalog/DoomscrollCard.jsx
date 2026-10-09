import { heatmap } from "../../lib/data.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["12a", "2a", "4a", "6a", "8a", "10a", "12p", "2p", "4p", "6p", "8p", "10p"];

// Level 0..4 → card track (empty) → pale ink → full ink → near-black ink.
function ramp(lv) {
  if (lv === 0) return "var(--track)";
  const r = lv / 4;
  if (r <= 0.5) return `color-mix(in srgb, var(--accent) ${(r / 0.5 * 100).toFixed(0)}%, #ffffff)`;
  return `color-mix(in srgb, var(--heat-dark) ${((r - 0.5) / 0.5 * 100).toFixed(0)}%, var(--accent))`;
}

// Doomscroll heatmap — when the gate fires, by weekday and two-hour slot (impulse_log).
export default function DoomscrollCard({ impulses }) {
  const { grid } = heatmap(impulses);
  const matrix = grid.map((row) => HOURS.map((_, b) => (row[b * 2] || 0) + (row[b * 2 + 1] || 0)));
  const max = Math.max(0, ...matrix.flat());
  const level = (v) => (v <= 0 || max === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));

  return (
    <section className="cc-card cc-tilt-s">
      <div className="cc-head">
        <h2 className="cc-title">Doomscroll hours</h2>
        <span className="cc-heat-legend" aria-hidden="true">
          less {[0, 1, 2, 3, 4].map((l) => <span key={l} style={{ background: ramp(l) }} />)} more
        </span>
      </div>
      <p className="cc-note">When the gate catches you, by day and time.</p>
      <div className="cc-heat" role="img" aria-label="Gate triggers by weekday and two-hour slot">
        <span />
        {HOURS.map((h) => <span key={h} className="cc-heat-h">{h}</span>)}
        {DAYS.map((d, di) => (
          <div key={d} style={{ display: "contents" }}>
            <span className="cc-heat-d">{d}</span>
            {matrix[di].map((v, hi) => (
              <span key={hi} className="cc-heat-c" style={{ background: ramp(level(v)) }}
                title={`${d} ${HOURS[hi]}: ${v} trigger${v === 1 ? "" : "s"}`} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
