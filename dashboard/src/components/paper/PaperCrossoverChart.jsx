// "Kept reading vs. went to site" — ported from CrossoverChart.dc.html.
// kept = completed gates (read the article); site = bailed (went to the distracting
// site). Two smooth lines (share % or raw count) with a crossover marker, fed by the
// real crossoverSeries helper over week / month / year.
import { useMemo, useState, createElement as h } from "react";
import { crossoverSeries } from "../../lib/data.js";

const INK = "#1b1a17", NEUTRAL = "#bdb8ab", MUTED = "#8b877d";

function seg(active) {
  return {
    padding: "6px 13px", fontFamily: "'Instrument Sans',sans-serif", fontSize: 12.5, fontWeight: active ? 600 : 500,
    border: "none", borderRadius: 999, cursor: "pointer", background: active ? INK : "transparent",
    color: active ? "#fff" : MUTED, transition: "all .15s", lineHeight: 1.2, whiteSpace: "nowrap",
  };
}

const share = (x) => (x.kept + x.site ? x.kept / (x.kept + x.site) : 0);

function computeCopy(data, range) {
  const n = data.length;
  const last = data[n - 1], prev = data[n - 2] || data[n - 1], first = data[0];
  const lp = Math.round(share(last) * 100);
  const delta = lp - Math.round(share(prev) * 100);
  const tr = Math.round((share(last) - share(first)) * 100);
  const word = range === "week" ? "week" : range === "month" ? "month" : "year";
  return {
    headlineText: lp + "% of the time this " + word + ", you chose to keep reading.",
    deltaText: (delta >= 0 ? "▲ " : "▼ ") + Math.abs(delta) + " pts vs. last " + word,
    trendText: (tr >= 0 ? "▲ " : "▼ ") + Math.abs(tr) + " pts vs. your first " + word,
  };
}

function smooth(pts) {
  if (pts.length < 2) return pts.length ? "M " + pts[0].x + " " + pts[0].y : "";
  let d = "M " + pts[0].x + " " + pts[0].y;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2.x + " " + p2.y;
  }
  return d;
}

function buildPlot(data, mode) {
  const grid = "rgba(40,35,20,.09)";
  const n = data.length;
  const VBW = 620, VBH = 250, padT = 16, padB = 28, padL = 26, padR = 30;
  const plotW = VBW - padL - padR, plotH = VBH - padT - padB, baseY = padT + plotH;
  const slot = plotW / n;
  const X = (i) => padL + slot * i + slot / 2;
  const els = [];
  [0, 0.25, 0.5, 0.75, 1].forEach((f, gi) => {
    const y = padT + f * plotH;
    els.push(h("line", { key: "g" + gi, x1: padL, y1: y, x2: padL + plotW, y2: y, stroke: grid, strokeWidth: 1 }));
  });

  let keptPts, sitePts;
  if (mode === "share") {
    keptPts = data.map((d, i) => ({ x: X(i), y: baseY - share(d) * plotH }));
    sitePts = data.map((d, i) => ({ x: X(i), y: baseY - (d.kept + d.site ? d.site / (d.kept + d.site) : 0) * plotH }));
  } else {
    const maxV = Math.max(...data.map((d) => Math.max(d.kept, d.site)), 1);
    keptPts = data.map((d, i) => ({ x: X(i), y: baseY - (d.kept / maxV) * plotH }));
    sitePts = data.map((d, i) => ({ x: X(i), y: baseY - (d.site / maxV) * plotH }));
  }
  els.push(h("path", { key: "sl", d: smooth(sitePts), fill: "none", stroke: NEUTRAL, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" }));
  els.push(h("path", { key: "kl", d: smooth(keptPts), fill: "none", stroke: INK, strokeWidth: 2.8, strokeLinecap: "round", strokeLinejoin: "round" }));

  for (let i = 0; i < n - 1; i++) {
    const a = data[i].kept - data[i].site, b = data[i + 1].kept - data[i + 1].site;
    if (a <= 0 && b > 0) {
      const fr = (-a) / (b - a);
      const cx = X(i) + fr * (X(i + 1) - X(i));
      const cy = keptPts[i].y + fr * (keptPts[i + 1].y - keptPts[i].y);
      els.push(h("circle", { key: "xo", cx, cy, r: 5.5, fill: "#ffffff", stroke: INK, strokeWidth: 2.5 }));
      break;
    }
  }

  const yl = mode === "share"
    ? [{ f: 0, t: "0" }, { f: 0.5, t: "50%" }, { f: 1, t: "100%" }]
    : (() => { const maxV = Math.max(...data.map((d) => Math.max(d.kept, d.site)), 1); return [{ f: 0, t: "0" }, { f: 1, t: "" + maxV }]; })();
  yl.forEach((L, li) => els.push(h("text", { key: "yl" + li, x: padL - 8, y: baseY - L.f * plotH + 3, textAnchor: "end", fontSize: 9.5, fill: MUTED, fontFamily: "'Instrument Sans',sans-serif" }, L.t)));
  data.forEach((d, i) => els.push(h("text", { key: "xl" + i, x: X(i), y: baseY + 15, textAnchor: "middle", fontSize: 9.5, fill: MUTED, fontFamily: "'Instrument Sans',sans-serif" }, d.label)));

  return h("svg", { viewBox: "0 0 " + VBW + " " + VBH, width: "100%", style: { display: "block", height: "auto", overflow: "visible", marginTop: "2px" } }, els);
}

export default function PaperCrossoverChart({ impulses }) {
  const [mode, setMode] = useState("share");
  const [range, setRange] = useState("week");
  const data = useMemo(() => crossoverSeries(impulses, range), [impulses, range]);
  const copy = useMemo(() => computeCopy(data, range), [data, range]);

  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e7e3db", borderRadius: 22, padding: "24px 26px 22px",
      fontFamily: "'Instrument Sans',system-ui,sans-serif", boxShadow: "0 1px 2px rgba(30,25,15,.03)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ minWidth: 220 }}>
          <h2 style={{ margin: "0 0 8px", fontFamily: "'Instrument Serif',Georgia,serif", fontWeight: 400, fontSize: 26, lineHeight: 1.05, color: INK }}>Kept reading vs. went to site</h2>
          <span style={{ display: "inline-block", fontSize: 12.5, fontWeight: 600, color: "#5c584e", background: "#efece4", border: "1px solid #e5e1d7", borderRadius: 999, padding: "4px 11px" }}>{copy.trendText}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <div style={{ display: "inline-flex", background: "#ece9e1", borderRadius: 999, padding: 3, gap: 2 }}>
            <button type="button" onClick={() => setMode("share")} style={seg(mode === "share")}>Share&nbsp;%</button>
            <button type="button" onClick={() => setMode("count")} style={seg(mode === "count")}>Count</button>
          </div>
          <div style={{ display: "inline-flex", background: "#ece9e1", borderRadius: 999, padding: 3, gap: 2 }}>
            {["week", "month", "year"].map((r) => (
              <button key={r} type="button" onClick={() => setRange(r)} style={seg(range === r)}>{r[0].toUpperCase() + r.slice(1)}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 14.5, color: INK, lineHeight: 1.4, margin: "14px 0 2px", maxWidth: 460 }}>
        {copy.headlineText} <span style={{ color: "#5c584e", fontWeight: 600, whiteSpace: "nowrap" }}>{copy.deltaText}</span>
      </div>
      <div style={{ display: "flex", gap: 18, alignItems: "center", margin: "14px 0 8px", fontSize: 13, color: MUTED }}>
        <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><span style={{ width: 16, height: 3, borderRadius: 2, background: INK, display: "inline-block" }} />Kept reading</span>
        <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><span style={{ width: 16, height: 3, borderRadius: 2, background: "#bdb8ab", display: "inline-block" }} />Went to site</span>
      </div>
      <div>{buildPlot(data, mode)}</div>
    </div>
  );
}
