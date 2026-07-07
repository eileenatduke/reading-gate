import { useMemo, useState } from "react";
import { articleCountSeries } from "../lib/data.js";

function niceMax(m) {
  if (m <= 5) return Math.max(1, Math.ceil(m));
  const pow = Math.pow(10, Math.floor(Math.log10(m)));
  const step = pow / 2;
  return Math.ceil(m / step) * step;
}

const UNIT = { week: "week", month: "month", year: "year" };

// Dual-axis combo chart (design-faithful, custom SVG/CSS): bars = articles per period
// (left axis), line = cumulative total (right axis). Themed via CSS variables.
export default function ArticleCountChart({ reading }) {
  const [period, setPeriod] = useState("week");
  const [tipI, setTipI] = useState(null);
  const series = useMemo(() => articleCountSeries(reading, period), [reading, period]);

  const n = series.length;
  const counts = series.map((s) => s.count);
  const cums = series.map((s) => s.cumulative);
  const axisMax = niceMax(Math.max(1, ...counts));
  const cumMax = niceMax(Math.max(1, ...cums));
  const cumMin = cums.length ? Math.max(0, cums[0] - counts[0]) : 0;
  const span = cumMax - cumMin || 1;
  const cumTop = (v) => 100 - ((v - cumMin) / span) * 100;

  const bars = series.map((s, i) => ({
    label: s.period, count: s.count, cum: s.cumulative,
    heightPct: (s.count / axisMax) * 100,
    centerPct: ((i + 0.5) / n) * 100,
    cumTopPct: cumTop(s.cumulative),
  }));
  const linePoints = bars.map((b) => `${b.centerPct.toFixed(2)},${b.cumTopPct.toFixed(2)}`).join(" ");
  const leftTicks = [0, 1, 2, 3, 4].map((i) => ({ val: Math.round(axisMax * (4 - i) / 4), topPct: (i / 4) * 100 }));
  const rightTicks = [0, 1, 2, 3, 4].map((i) => ({ val: Math.round(cumMin + span * (4 - i) / 4), topPct: (i / 4) * 100 }));
  const tip = tipI != null && bars[tipI] ? bars[tipI] : null;

  return (
    <section className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <div>
          <h2>Articles read</h2>
          <p className="sub" style={{ margin: "5px 0 0" }}>Bars: read each {UNIT[period]}. Line: cumulative total.</p>
        </div>
        <div className="seg">
          {["week", "month", "year"].map((p) => (
            <button key={p} className={period === p ? "on" : ""} onClick={() => { setPeriod(p); setTipI(null); }}>
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {n === 0 ? (
        <p className="muted" style={{ margin: "20px 0" }}>No reads yet — this fills in as you use the gate.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <div style={{ position: "relative", width: 22, flexShrink: 0, height: 280 }}>
              {leftTicks.map((tk, i) => (
                <div key={i} style={{ position: "absolute", right: 0, top: `${tk.topPct}%`, transform: "translateY(-50%)", fontSize: 11, color: "var(--axis-left,var(--faint))" }}>{tk.val}</div>
              ))}
            </div>

            <div style={{ position: "relative", flex: 1, minWidth: 0, height: 280 }}>
              {leftTicks.map((tk, i) => (
                <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${tk.topPct}%`, borderTop: "1px dashed var(--grid)" }} />
              ))}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: "2%", padding: "0 1%" }}>
                {bars.map((b, i) => (
                  <div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", cursor: "pointer" }}
                    onMouseEnter={() => setTipI(i)} onMouseLeave={() => setTipI(null)}>
                    <div style={{ width: n > 8 ? "58%" : "52%", borderRadius: "6px 6px 0 0", background: "var(--accent)", height: `${b.heightPct}%`, boxShadow: "0 2px 8px rgba(var(--accent-rgb),.35)", transition: "height .55s cubic-bezier(.22,1,.36,1)" }} />
                  </div>
                ))}
              </div>
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
                  <polyline points={linePoints} fill="none" stroke="var(--line)" strokeWidth="2.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.18))" }} />
                </svg>
                {bars.map((b, i) => (
                  <div key={i} style={{ position: "absolute", left: `${b.centerPct}%`, top: `${b.cumTopPct}%`, width: 9, height: 9, borderRadius: "50%", background: "var(--dot,#fff)", border: "2px solid var(--line)", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transform: "translate(-50%,-50%)" }} />
                ))}
              </div>
              {tip && (
                <div style={{ position: "absolute", left: `${tip.centerPct}%`, top: `${tip.cumTopPct}%`, transform: "translate(-50%,calc(-100% - 14px))", background: "var(--tip-bg)", color: "var(--tip-text)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 13px", boxShadow: "0 10px 30px rgba(0,0,0,.18)", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 5, backdropFilter: "var(--blur)" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{tip.label}</div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--accent)" }} />Per {UNIT[period]}<b style={{ marginLeft: "auto", paddingLeft: 14 }}>{tip.count}</b></div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13, marginTop: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--line)" }} />Cumulative<b style={{ marginLeft: "auto", paddingLeft: 14 }}>{tip.cum}</b></div>
                </div>
              )}
            </div>

            <div style={{ position: "relative", width: 22, flexShrink: 0, height: 280 }}>
              {rightTicks.map((tk, i) => (
                <div key={i} style={{ position: "absolute", left: 0, top: `${tk.topPct}%`, transform: "translateY(-50%)", fontSize: 11, color: "var(--axis-right,var(--muted))" }}>{tk.val}</div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "2%", padding: "10px 44px 0 32px" }}>
            {bars.map((b, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 12, color: "var(--xlabel,var(--muted))" }}>{b.label}</div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
