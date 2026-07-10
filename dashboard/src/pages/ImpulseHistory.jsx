import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchImpulseLog, impulseTrend } from "../lib/data.js";

const PLOT_H = 210;                 // plot height in px (matches the "4e" design)
const NUM_WEEKS = 8;
const MONO = "ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, monospace";
const SERIF = "'Instrument Serif', Georgia, serif";
// Completed = the accent; bailed = a pale tint of it. Mixing toward opaque white keeps
// the tint readable on both translucent glass and solid themes, whatever the accent hue.
const COMPLETED = "var(--accent)";
const BAILED = "color-mix(in srgb, var(--accent) 30%, #ffffff)";

// Build an SVG sparkline (fill area + polyline) from a numeric series, normalised into
// the 150×38 viewBox so every row's line is directly comparable in shape.
function spark(series) {
  const W = 150, H = 38, pad = 4;
  const max = Math.max(...series), min = Math.min(...series);
  const range = max - min || 1;
  const n = series.length;
  const px = (i) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const py = (v) => pad + (1 - (v - min) / range) * (H - 2 * pad);
  const pts = series.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`);
  const area =
    `M${px(0).toFixed(1)},${H} ` +
    series.map((v, i) => `L${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ") +
    ` L${px(n - 1).toFixed(1)},${H} Z`;
  return { poly: pts.join(" "), area };
}

function fmtDelta(m) {
  if (m.delta == null) return "—";   // no prior-week baseline to compare against
  const unit = m.unit || "";
  if (m.delta === 0) return `±0${unit}`;
  return `${m.delta > 0 ? "+" : "−"}${Math.abs(m.delta)}${unit}`;
}

// Colour a delta by whether it moved in the favourable direction for that metric.
// A null delta (cold start) and a flat delta are both neutral, never red.
function deltaColor(m) {
  if (m.delta == null || m.delta === 0) return "var(--muted)";
  const good = m.goodWhenDown ? m.delta < 0 : m.delta > 0;
  return good ? "var(--success)" : "var(--danger)";
}

// Drill-in reached by clicking the Impulse counter on Overview (Spec §8).
// Layout follows the Claude Design "4e" (aligned table): a stacked completed-vs-bailed
// bar chart beside a metrics table, with every colour sourced from theme variables so
// it re-skins with whichever theme the user picks in Settings.
export default function ImpulseHistory() {
  const [impulses, setImpulses] = useState(null);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    fetchImpulseLog().then(setImpulses).catch((e) => setErr(e.message));
  }, []);

  const { weeks, metrics } = useMemo(
    () => impulseTrend(impulses || [], NUM_WEEKS),
    [impulses]
  );

  // Y-axis scale: four even steps above a nice max so the top gridline clears the data.
  const { top, ticks } = useMemo(() => {
    const maxTotal = Math.max(1, ...weeks.map((w) => w.total));
    const step = Math.max(1, Math.ceil(maxTotal / 4));
    return { top: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
  }, [weeks]);

  if (err) return <div className="loading">Error: {err}</div>;
  if (impulses === null) return <div className="loading">Loading…</div>;

  const hLabel = { flex: "none", font: `600 9px ${MONO}`, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--faint)", textAlign: "center" };

  return (
    <>
      <button className="btn ghost" style={{ marginBottom: 20 }} onClick={() => nav("/")}>← Overview</button>
      <div className="page-head">
        <div>
          <h1 className="page-title">Impulse history</h1>
          <p className="page-sub">Every gate trigger over the last {NUM_WEEKS} weeks — how often each site called, and how often you read through instead of bailing.</p>
        </div>
      </div>

      <div className="card">
        {impulses.length === 0 ? (
          <p className="muted">No gate triggers yet.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignItems: "stretch" }}>

            {/* ---- Left: stacked completed / bailed bars ---- */}
            <div style={{ flex: "1 1 360px", minWidth: 300, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, marginBottom: 14, flexWrap: "wrap" }}>
                <Legend swatch={COMPLETED} label="Completed" />
                <Legend swatch={BAILED} label="Bailed" />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{
                  width: 16, height: PLOT_H, display: "flex", alignItems: "center", justifyContent: "center",
                  font: `600 9.5px ${MONO}`, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--faint)",
                  writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap",
                }}>
                  Gate triggers per week
                </div>

                {/* y-axis tick labels */}
                <div style={{ position: "relative", width: 22, height: PLOT_H }}>
                  {ticks.map((v) => (
                    <div key={v} style={{
                      position: "absolute", right: 0, bottom: `${(v / top) * PLOT_H}px`,
                      transform: "translateY(50%)", font: `500 11px ${MONO}`, color: "var(--muted)",
                    }}>{v}</div>
                  ))}
                </div>

                {/* plot: gridlines + stacked bars */}
                <div style={{ position: "relative", flex: 1, minWidth: 0, height: PLOT_H }}>
                  {ticks.map((v) => (
                    <div key={v} style={{
                      position: "absolute", left: 0, right: 0, bottom: `${(v / top) * PLOT_H}px`,
                      borderTop: "1px dashed var(--grid)",
                    }} />
                  ))}
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
                    {weeks.map((w) => (
                      <div key={w.key} title={`Week of ${w.label}: ${w.completed} completed, ${w.bailed} bailed`}
                        style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                        <div style={{ width: 24, maxWidth: "70%", height: `${(w.bailed / top) * PLOT_H}px`, background: BAILED, borderRadius: "4px 4px 0 0" }} />
                        <div style={{ width: 24, maxWidth: "70%", height: `${(w.completed / top) * PLOT_H}px`, background: COMPLETED, borderRadius: w.bailed ? 0 : "4px 4px 0 0" }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* x-axis labels, aligned under the plot */}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <div style={{ width: 16 }} />
                <div style={{ width: 22 }} />
                <div style={{ flex: 1, display: "flex" }}>
                  {weeks.map((w) => (
                    <div key={w.key} style={{ flex: 1, textAlign: "center", font: `500 10px ${MONO}`, color: "var(--muted)" }}>{w.label}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* ---- Right: aligned metrics table (headers state the columns once) ---- */}
            <div style={{
              flex: "1 1 300px", minWidth: 260, display: "flex", flexDirection: "column",
              background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, padding: "0 0 12px", borderBottom: "1.5px solid var(--border)" }}>
                <div style={{ ...hLabel, flex: 1, textAlign: "left" }}>Metric</div>
                <div style={{ ...hLabel, width: 46 }}>This wk</div>
                <div style={{ ...hLabel, width: 56 }}>vs last</div>
                <div style={{ ...hLabel, width: 76 }}>{NUM_WEEKS}-wk trend</div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {metrics.map((m, i) => {
                  const s = spark(m.series);
                  return (
                    <div key={m.key} style={{
                      flex: 1, minHeight: 54, display: "flex", alignItems: "center", gap: 12,
                      borderBottom: i < metrics.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: "500 13px/1.25 'Instrument Sans', system-ui, sans-serif", color: "var(--text)" }}>{m.name}</div>
                        {m.sub && <div style={{ font: "400 10.5px/1.3 'Instrument Sans', system-ui, sans-serif", color: "var(--muted)", marginTop: 3 }}>{m.sub}</div>}
                      </div>
                      <div style={{ width: 46, textAlign: "center", font: `19px ${SERIF}`, color: "var(--text)" }}>{m.value}</div>
                      <div style={{ width: 56, textAlign: "center", whiteSpace: "nowrap", font: `600 10px ${MONO}`, color: deltaColor(m) }}>{fmtDelta(m)}</div>
                      <div style={{ width: 76, display: "flex", justifyContent: "center" }}>
                        <svg width="74" height="46" viewBox="0 0 150 38" preserveAspectRatio="none" style={{ display: "block" }}>
                          <path d={s.area} style={{ fill: "var(--accent)", fillOpacity: 0.12 }} />
                          <polyline points={s.poly} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

function Legend({ swatch, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "500 12px 'Instrument Sans', system-ui, sans-serif", color: "var(--muted)" }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: swatch }} />
      {label}
    </span>
  );
}
