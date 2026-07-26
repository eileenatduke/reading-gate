// "Articles read" — bars per period + cumulative line (dual axis). Layout from
// ArticlesChart.dc.html, colors from the app theme. SVG fills/strokes use CSS
// variables via `style` (custom properties don't resolve on presentation attributes),
// so the chart follows the Settings theme and updates live on preview.
import { useMemo, useState, createElement as h } from "react";
import { articleCountSeries } from "../../lib/data.js";
import { dualNiceAxes } from "../../lib/scale.js";

const UNIT = { week: "day", month: "day", year: "month" };

function seg(active) {
  return {
    padding: "6px 14px", fontFamily: "'Source Sans 3',sans-serif", fontSize: 12.5, fontWeight: active ? 600 : 500,
    border: "none", borderRadius: 999, cursor: "pointer", background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--muted)", transition: "all .15s", lineHeight: 1.2, whiteSpace: "nowrap",
  };
}

function label(x, y, anchor, fill, text) {
  return h("text", { key: "t" + x + "-" + y + "-" + text, x, y, textAnchor: anchor, fontSize: 10, fontFamily: "'Source Sans 3',sans-serif", style: { fill } }, text);
}

function buildPlot(series) {
  const n = series.length;
  const daily = series.map((s) => s.count);
  const dailyMax = Math.max(...daily, 1);
  const cum = series.map((s) => (s.future ? null : s.cumulative));
  const lastCum = [...cum].reverse().find((v) => v != null) ?? 0;
  const total = Math.max(lastCum, 1);

  // Left axis (per-period bars) and right axis (cumulative line) get independent nice
  // scales, but both step by a constant amount and share the same gridlines.
  const axes = dualNiceAxes(dailyMax, total);
  const leftMax = axes.left.max, rightMax = axes.right.max;

  const VBW = 620, VBH = 300, padT = 18, padB = 30, padL = 26, padR = 30;
  const plotW = VBW - padL - padR, plotH = VBH - padT - padB, baseY = padT + plotH;
  const slot = plotW / n;
  const bw = Math.min(slot * 0.52, 64);
  const cx = (i) => padL + slot * i + slot / 2;
  const els = [];

  for (let i = 0; i <= axes.intervals; i++) {
    const y = baseY - (i / axes.intervals) * plotH;   // i=0 bottom (0), i=intervals top (max)
    els.push(h("line", { key: "g" + i, x1: padL, y1: y, x2: padL + plotW, y2: y, strokeWidth: 1, strokeDasharray: i === 0 ? "0" : "3 4", style: { stroke: "var(--grid)" } }));
    els.push(label(padL - 8, y + 3.5, "end", "var(--axis-left)", "" + axes.left.step * i));
    els.push(label(padL + plotW + 8, y + 3.5, "start", "var(--axis-right)", "" + axes.right.step * i));
  }

  daily.forEach((v, i) => {
    if (v <= 0) return;
    const bh = (v / leftMax) * plotH;
    els.push(h("rect", { key: "b" + i, x: cx(i) - bw / 2, y: baseY - bh, width: bw, height: bh, rx: 5, style: { fill: "var(--bar-main)" } }));
  });

  const pts = series.map((s, i) => (s.future ? null : { x: cx(i), y: baseY - (s.cumulative / rightMax) * plotH })).filter(Boolean);
  if (pts.length) {
    let path = "M " + pts[0].x + " " + pts[0].y;
    for (let i = 1; i < pts.length; i++) path += " L " + pts[i].x + " " + pts[i].y;
    els.push(h("path", { key: "cl", d: path, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", style: { fill: "none", stroke: "var(--line)" } }));
    pts.forEach((p, i) => els.push(h("circle", { key: "cm" + i, cx: p.x, cy: p.y, r: 4, strokeWidth: 2, style: { fill: "var(--dot)", stroke: "var(--line)" } })));
  }

  series.forEach((s, i) => {
    if (!s.showLabel) return;
    els.push(h("text", { key: "xl" + i, x: cx(i), y: baseY + 16, textAnchor: "middle", fontSize: 10.5, fontFamily: "'Source Sans 3',sans-serif", style: { fill: "var(--xlabel)" } }, s.label));
  });

  return h("svg", { viewBox: "0 0 " + VBW + " " + VBH, width: "100%", style: { display: "block", height: "auto", overflow: "visible", marginTop: "8px" } }, els);
}

export default function PaperArticlesChart({ reading }) {
  const [range, setRange] = useState("week");
  const series = useMemo(() => articleCountSeries(reading, range), [reading, range]);
  const empty = reading.length === 0;

  return (
    <div className="card" style={{ padding: "24px 26px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <div>
          <h2 style={{ margin: "0 0 0 -.035em", fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 400, fontSize: 26, lineHeight: 1.05, color: "var(--text)" }}>Articles read</h2>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Bars: read each {UNIT[range]}. Line: cumulative total.</div>
        </div>
        <div style={{ display: "inline-flex", background: "var(--surface-2)", borderRadius: 999, padding: 3, gap: 2 }}>
          {["week", "month", "year"].map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} style={seg(range === r)}>{r[0].toUpperCase() + r.slice(1)}</button>
          ))}
        </div>
      </div>
      {empty
        ? <div style={{ fontSize: 14, color: "var(--muted)", margin: "28px 0" }}>No reads yet — this fills in as you use the gate.</div>
        : <div>{buildPlot(series)}</div>}
    </div>
  );
}
