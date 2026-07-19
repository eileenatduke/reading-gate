// "Impulse history" (detail + trend) — layout from ImpulseHistory.dc.html, colors from
// the app theme. Stacked weekly bars (completed vs bailed) + a metrics table with
// 8-week sparklines, fed by the real impulseTrend helper. SVG colors use CSS variables
// via `style` so the panel follows the Settings theme.
import { createElement as h } from "react";
import { impulseTrend } from "../../lib/data.js";

function niceMax(m) {
  if (m <= 4) return Math.max(1, Math.ceil(m));
  const pow = Math.pow(10, Math.floor(Math.log10(m)));
  const step = pow / 2;
  return Math.ceil(m / step) * step;
}

function buildChart(weeks) {
  const n = weeks.length;
  const max = niceMax(Math.max(...weeks.map((w) => w.total), 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  // Wider left padding so the numeric ticks clear the rotated axis label.
  const VBW = 560, VBH = 210, padT = 16, padB = 30, padL = 56, padR = 8;
  const plotW = VBW - padL - padR, plotH = VBH - padT - padB, baseY = padT + plotH;
  const slot = plotW / n, bw = Math.min(slot * 0.5, 30);
  const cx = (i) => padL + slot * i + slot / 2;
  const els = [];
  ticks.forEach((t, i) => {
    const y = baseY - (t / max) * plotH;
    els.push(h("line", { key: "g" + i, x1: padL, y1: y, x2: padL + plotW, y2: y, strokeWidth: 1, strokeDasharray: t === 0 ? "0" : "3 4", style: { stroke: "var(--grid)" } }));
    els.push(h("text", { key: "t" + i, x: padL - 12, y: y + 3.5, textAnchor: "end", fontSize: 10, fontFamily: "'Source Sans 3',sans-serif", style: { fill: "var(--muted)" } }, "" + t));
  });
  weeks.forEach((d, i) => {
    const tot = d.completed + d.bailed;
    if (tot > 0) {
      const bh = (tot / max) * plotH;
      const ch = d.completed > 0 ? Math.max((d.completed / max) * plotH, 2) : 0;
      const bH = bh - ch;
      const x = cx(i) - bw / 2, rr = 4;
      // One continuous bar, two colors: bailed on top (rounds the bar's top), completed
      // at the bottom (rounds the bar's bottom); they meet on a flat edge. Corners round
      // only where they're the true outer edge, so a stack reads as a single bar.
      if (bH > 0) {
        els.push(h("path", { key: "bb" + i, d: barPath(x, baseY - bh, bw, bH, rr, ch > 0 ? 0 : rr), style: { fill: "var(--faint)" } }));
      }
      if (ch > 0) {
        els.push(h("path", { key: "cc" + i, d: barPath(x, baseY - ch, bw, ch, bH > 0 ? 0 : rr, rr), style: { fill: "var(--bar-main)" } }));
      }
    }
    els.push(h("text", { key: "xl" + i, x: cx(i), y: baseY + 16, textAnchor: "middle", fontSize: 9.5, fontFamily: "'Source Sans 3',sans-serif", style: { fill: "var(--muted)" } }, d.label));
  });
  els.push(h("text", { key: "axl", x: 12, y: padT + plotH / 2, textAnchor: "middle", fontSize: 9, letterSpacing: ".08em", fontFamily: "'Source Sans 3',sans-serif", transform: "rotate(-90 12 " + (padT + plotH / 2) + ")", style: { fill: "var(--muted)" } }, "GATE TRIGGERS / WEEK"));
  return h("svg", { viewBox: "0 0 " + VBW + " " + VBH, width: "100%", style: { display: "block", height: "auto", overflow: "visible" } }, els);
}

// Rounded-rect path with independent top/bottom corner radii, so stacked segments can
// round only their outer corners and meet flush in the middle.
function barPath(x, y, w, hh, rTop, rBot) {
  const rt0 = Math.min(rTop, w / 2), rb0 = Math.min(rBot, w / 2);
  const lim = rt0 > 0 && rb0 > 0 ? hh / 2 : hh;
  const rt = Math.max(0, Math.min(rt0, lim));
  const rb = Math.max(0, Math.min(rb0, lim));
  return `M ${x} ${y + rt} Q ${x} ${y} ${x + rt} ${y} L ${x + w - rt} ${y} Q ${x + w} ${y} ${x + w} ${y + rt} `
    + `L ${x + w} ${y + hh - rb} Q ${x + w} ${y + hh} ${x + w - rb} ${y + hh} L ${x + rb} ${y + hh} Q ${x} ${y + hh} ${x} ${y + hh - rb} Z`;
}

function spark(vals) {
  const W = 96, H = 34, pad = 3;
  const max = Math.max(...vals, 1), n = vals.length;
  const x = (i) => pad + (i * (W - 2 * pad)) / (n - 1);
  const y = (v) => H - pad - (v / max) * (H - 2 * pad);
  let d = "M " + x(0) + " " + y(vals[0]);
  for (let i = 1; i < n; i++) d += " L " + x(i) + " " + y(vals[i]);
  const area = d + " L " + x(n - 1) + " " + (H - pad) + " L " + x(0) + " " + (H - pad) + " Z";
  return h("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, style: { display: "block" } }, [
    h("path", { key: "a", d: area, style: { fill: "rgba(var(--accent-rgb),.12)" } }),
    h("path", { key: "l", d, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", style: { fill: "none", stroke: "var(--accent)" } }),
  ]);
}

function fmtDelta(m) {
  if (m.delta == null) return { text: "—", color: "var(--muted)" };
  const bad = m.goodWhenDown ? m.delta > 0 : m.delta < 0;
  const sign = m.delta >= 0 ? "+" : "";
  return { text: sign + m.delta + (m.unit === "pp" ? "pp" : ""), color: bad ? "var(--danger)" : "var(--text)" };
}

function buildMetrics(metrics) {
  const cols = "1.3fr .7fr .8fr 1fr";
  const labels = ["Gate triggers", "Read through", "Follow-through"];
  const hd = (t, al) => h("div", { key: t, style: { fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, textAlign: al || "left" } }, t);
  const head = h("div", { key: "h", style: { display: "grid", gridTemplateColumns: cols, gap: 10, alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--border)" } },
    [hd("Metric"), hd("This wk", "right"), hd("Vs last", "right"), hd("8-wk trend", "right")]);
  const body = metrics.map((m, i) => {
    const del = fmtDelta(m);
    return h("div", { key: "r" + i, style: { display: "grid", gridTemplateColumns: cols, gap: 10, alignItems: "center", padding: "16px 0", borderBottom: i < metrics.length - 1 ? "1px solid var(--border)" : "none" } }, [
      h("div", { key: "m", style: { fontSize: 14, color: "var(--text)", fontWeight: 500, lineHeight: 1.15 } }, labels[i] || m.name),
      h("div", { key: "v", style: { fontFamily: "'Playfair Display',serif", fontSize: 27, color: "var(--text)", textAlign: "right", lineHeight: 1 } }, "" + m.value),
      h("div", { key: "d", style: { fontSize: 13, fontWeight: 600, color: del.color, textAlign: "right" } }, del.text),
      h("div", { key: "s", style: { display: "flex", justifyContent: "flex-end" } }, spark(m.series)),
    ]);
  });
  return h("div", {}, [head].concat(body));
}

export default function PaperImpulseHistory({ impulses }) {
  const { weeks, metrics } = impulseTrend(impulses, 8);

  return (
    <div className="card" style={{ padding: "24px 26px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ maxWidth: 520 }}>
          <h2 style={{ margin: "0 0 0 -.035em", fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 400, fontSize: 26, lineHeight: 1.05, color: "var(--text)" }}>Impulse history</h2>
          <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 5, lineHeight: 1.5 }}>Gate completion vs. bailing pattern over the past 8 weeks.</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--bar-main)", display: "inline-block" }} />Completed</span>
          <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--faint)", display: "inline-block" }} />Bailed</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ width: "100%" }}>{buildChart(weeks)}</div>
        <div style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 22px" }}>{buildMetrics(metrics)}</div>
      </div>
    </div>
  );
}
