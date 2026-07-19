// "Articles read" — bars per period + cumulative line. Ported from ArticlesChart.dc.html
// (fixed warm-paper palette, dual axis), fed by the real articleCountSeries helper.
import { useMemo, useState, createElement as h } from "react";
import { articleCountSeries } from "../../lib/data.js";

const UNIT = { week: "day", month: "day", year: "month" };
const INK = "#1b1a17", MUTED = "#8b877d";

function seg(active) {
  return {
    padding: "6px 14px", fontFamily: "'Instrument Sans',sans-serif", fontSize: 12.5, fontWeight: active ? 600 : 500,
    border: "none", borderRadius: 999, cursor: "pointer", background: active ? INK : "transparent",
    color: active ? "#fff" : MUTED, transition: "all .15s", lineHeight: 1.2, whiteSpace: "nowrap",
  };
}

function buildPlot(series) {
  const grid = "rgba(40,35,20,.09)", line = "#b8b3a6";
  const n = series.length;
  const daily = series.map((s) => s.count);
  const dailyMax = Math.max(...daily, 1);
  const cum = series.map((s) => (s.future ? null : s.cumulative));
  const lastCum = [...cum].reverse().find((v) => v != null) ?? 0;
  const total = Math.max(lastCum, 1);

  const VBW = 620, VBH = 300, padT = 18, padB = 30, padL = 26, padR = 30;
  const plotW = VBW - padL - padR, plotH = VBH - padT - padB, baseY = padT + plotH;
  const slot = plotW / n;
  const bw = Math.min(slot * 0.52, 64);
  const cx = (i) => padL + slot * i + slot / 2;
  const els = [];

  [0, 0.25, 0.5, 0.75, 1].forEach((f, gi) => {
    const y = padT + f * plotH;
    els.push(h("line", { key: "g" + gi, x1: padL, y1: y, x2: padL + plotW, y2: y, stroke: grid, strokeWidth: 1, strokeDasharray: gi === 4 ? "0" : "3 4" }));
    els.push(h("text", { key: "ly" + gi, x: padL - 8, y: y + 3.5, textAnchor: "end", fontSize: 10, fill: MUTED, fontFamily: "'Instrument Sans',sans-serif" }, "" + Math.round(dailyMax * (1 - f))));
    els.push(h("text", { key: "ry" + gi, x: padL + plotW + 8, y: y + 3.5, textAnchor: "start", fontSize: 10, fill: MUTED, fontFamily: "'Instrument Sans',sans-serif" }, "" + Math.round(total * (1 - f))));
  });

  daily.forEach((v, i) => {
    if (v <= 0) return;
    const bh = (v / dailyMax) * plotH;
    els.push(h("rect", { key: "b" + i, x: cx(i) - bw / 2, y: baseY - bh, width: bw, height: bh, rx: 5, fill: INK }));
  });

  const pts = series.map((s, i) => (s.future ? null : { x: cx(i), y: baseY - (s.cumulative / total) * plotH })).filter(Boolean);
  if (pts.length) {
    let path = "M " + pts[0].x + " " + pts[0].y;
    for (let i = 1; i < pts.length; i++) path += " L " + pts[i].x + " " + pts[i].y;
    els.push(h("path", { key: "cl", d: path, fill: "none", stroke: line, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }));
    pts.forEach((p, i) => els.push(h("circle", { key: "cm" + i, cx: p.x, cy: p.y, r: 4, fill: "#ffffff", stroke: line, strokeWidth: 2 })));
  }

  series.forEach((s, i) => {
    if (!s.showLabel) return;
    els.push(h("text", { key: "xl" + i, x: cx(i), y: baseY + 16, textAnchor: "middle", fontSize: 10.5, fill: MUTED, fontFamily: "'Instrument Sans',sans-serif" }, s.label));
  });

  return h("svg", { viewBox: "0 0 " + VBW + " " + VBH, width: "100%", style: { display: "block", height: "auto", overflow: "visible", marginTop: "8px" } }, els);
}

export default function PaperArticlesChart({ reading }) {
  const [range, setRange] = useState("week");
  const series = useMemo(() => articleCountSeries(reading, range), [reading, range]);
  const empty = reading.length === 0;

  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e7e3db", borderRadius: 22, padding: "24px 26px 20px",
      fontFamily: "'Instrument Sans',system-ui,sans-serif", boxShadow: "0 1px 2px rgba(30,25,15,.03)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Instrument Serif',Georgia,serif", fontWeight: 400, fontSize: 26, lineHeight: 1.05, color: INK }}>Articles read</h2>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Bars: read each {UNIT[range]}. Line: cumulative total.</div>
        </div>
        <div style={{ display: "inline-flex", background: "#ece9e1", borderRadius: 999, padding: 3, gap: 2 }}>
          {["week", "month", "year"].map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} style={seg(range === r)}>{r[0].toUpperCase() + r.slice(1)}</button>
          ))}
        </div>
      </div>
      {empty
        ? <div style={{ fontSize: 14, color: MUTED, margin: "28px 0" }}>No reads yet — this fills in as you use the gate.</div>
        : <div>{buildPlot(series)}</div>}
    </div>
  );
}
