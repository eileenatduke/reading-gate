// "Resisting the impulse" — of the times you met your reading goal, what you did next:
// went to the site (caved), kept reading, or closed the tab. The last two are both
// "resisted"; only "went to site" indulges the impulse. Rendered as a 3-segment stacked
// bar per time bucket (week / month / year), either as share % (each bar = 100%) or raw
// count. SVG colors use CSS variables via `style` so it follows the app theme.
import { useMemo, useState, createElement as h } from "react";
import { crossoverSeries } from "../../lib/data.js";

function seg(active) {
  return {
    padding: "6px 13px", fontFamily: "'Source Sans 3',sans-serif", fontSize: 12.5, fontWeight: active ? 600 : 500,
    border: "none", borderRadius: 999, cursor: "pointer", background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--muted)", transition: "all .15s", lineHeight: 1.2, whiteSpace: "nowrap",
  };
}

const total = (x) => x.site + x.reading + x.closed;
// "Resisted" = kept reading or closed the tab (anything but going to the site).
const resistShare = (x) => (total(x) ? (x.reading + x.closed) / total(x) : 0);

function computeCopy(data, range) {
  const withData = data.filter((d) => total(d) > 0);
  const word = range === "week" ? "week" : range === "month" ? "month" : "year";
  if (!withData.length) {
    return { headlineText: "No completed gates in this " + word + " yet.", deltaText: "", trendText: "—", empty: true };
  }
  const last = withData[withData.length - 1], first = withData[0];
  const prev = withData[withData.length - 2] || last;
  const lp = Math.round(resistShare(last) * 100);
  const delta = lp - Math.round(resistShare(prev) * 100);
  const tr = Math.round((resistShare(last) - resistShare(first)) * 100);
  return {
    headlineText: lp + "% of the time this " + word + ", you resisted going to the site.",
    deltaText: withData.length > 1 ? (delta >= 0 ? "▲ " : "▼ ") + Math.abs(delta) + " pts vs. last " + word : "",
    trendText: (tr >= 0 ? "▲ " : "▼ ") + Math.abs(tr) + " pts vs. your first " + word,
  };
}

// Rounded-rect path with independent top/bottom corner radii, so stacked segments round
// only their true outer corners and meet flush in the middle (mirrors PaperImpulseHistory).
function barPath(x, y, w, hh, rTop, rBot) {
  const rt0 = Math.min(rTop, w / 2), rb0 = Math.min(rBot, w / 2);
  const lim = rt0 > 0 && rb0 > 0 ? hh / 2 : hh;
  const rt = Math.max(0, Math.min(rt0, lim));
  const rb = Math.max(0, Math.min(rb0, lim));
  return `M ${x} ${y + rt} Q ${x} ${y} ${x + rt} ${y} L ${x + w - rt} ${y} Q ${x + w} ${y} ${x + w} ${y + rt} `
    + `L ${x + w} ${y + hh - rb} Q ${x + w} ${y + hh} ${x + w - rb} ${y + hh} L ${x + rb} ${y + hh} Q ${x} ${y + hh} ${x} ${y + hh - rb} Z`;
}

// Bottom → top: kept reading, then closed tab (two shades of one cool family, kept clear of
// the red so they read as "resisted" together), then went to site (the alert red) as the
// slice you want shrinking toward zero at the top.
const SEGS = [
  { key: "reading", color: "var(--resist-strong)" },
  { key: "closed", color: "var(--resist-soft)" },
  { key: "site", color: "var(--danger)" },
];

function buildPlot(data, mode) {
  const n = data.length;
  const VBW = 620, VBH = 250, padT = 16, padB = 28, padL = 34, padR = 16;
  const plotW = VBW - padL - padR, plotH = VBH - padT - padB, baseY = padT + plotH;
  const slot = plotW / n, bw = Math.min(slot * 0.52, 34);
  const cx = (i) => padL + slot * i + slot / 2;
  const maxTotal = Math.max(...data.map(total), 1);
  const els = [];

  [0, 0.25, 0.5, 0.75, 1].forEach((f, gi) => {
    const y = padT + f * plotH;
    els.push(h("line", { key: "g" + gi, x1: padL, y1: y, x2: padL + plotW, y2: y, strokeWidth: 1, strokeDasharray: gi === 4 ? "0" : "3 4", style: { stroke: "var(--grid)" } }));
  });

  data.forEach((d, i) => {
    const tot = total(d);
    if (tot > 0) {
      // Full-height in share mode (each bar = 100%); scaled to the busiest bucket in count mode.
      const barH = mode === "share" ? plotH : (tot / maxTotal) * plotH;
      const unit = barH / tot;
      const x = cx(i) - bw / 2, rr = 4;
      const present = SEGS
        .map((s) => ({ ...s, h: d[s.key] > 0 ? Math.max(d[s.key] * unit, 2) : 0 }))
        .filter((s) => s.h > 0);
      let yCur = baseY;
      present.forEach((s, k) => {
        const isBottom = k === 0, isTop = k === present.length - 1;
        const y = yCur - s.h;
        els.push(h("path", { key: s.key + i, d: barPath(x, y, bw, s.h, isTop ? rr : 0, isBottom ? rr : 0), style: { fill: s.color } }));
        yCur = y;
      });
    }
    els.push(h("text", { key: "xl" + i, x: cx(i), y: baseY + 15, textAnchor: "middle", fontSize: 9.5, fontFamily: "'Source Sans 3',sans-serif", style: { fill: "var(--xlabel)" } }, d.label));
  });

  const yl = mode === "share"
    ? [{ f: 0, t: "0" }, { f: 0.5, t: "50%" }, { f: 1, t: "100%" }]
    : [{ f: 0, t: "0" }, { f: 1, t: "" + maxTotal }];
  yl.forEach((L, li) => els.push(h("text", { key: "yl" + li, x: padL - 8, y: baseY - L.f * plotH + 3, textAnchor: "end", fontSize: 9.5, fontFamily: "'Source Sans 3',sans-serif", style: { fill: "var(--muted)" } }, L.t)));

  return h("svg", { viewBox: "0 0 " + VBW + " " + VBH, width: "100%", style: { display: "block", height: "auto", overflow: "visible", marginTop: "2px" } }, els);
}

function legendDot(color, label) {
  return h("span", { style: { display: "inline-flex", gap: 7, alignItems: "center" } }, [
    h("span", { key: "d", style: { width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block" } }),
    label,
  ]);
}

export default function PaperCrossoverChart({ impulses }) {
  const [mode, setMode] = useState("share");
  const [range, setRange] = useState("week");
  const data = useMemo(() => crossoverSeries(impulses, range), [impulses, range]);
  const copy = useMemo(() => computeCopy(data, range), [data, range]);

  return (
    <div className="card" style={{ padding: "24px 26px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ minWidth: 240, maxWidth: 460 }}>
          <h2 style={{ margin: "0 0 8px -.035em", fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 400, fontSize: 26, lineHeight: 1.05, color: "var(--text)" }}>Did you resist the site?</h2>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>
            Of the times you completed your reading goal, how often you went to the site (accessed site) vs. resisted (kept reading or closed the tab).
          </div>
          <span style={{ display: "inline-block", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 999, padding: "4px 11px" }}>{copy.trendText}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <div style={{ display: "inline-flex", background: "var(--surface-2)", borderRadius: 999, padding: 3, gap: 2 }}>
            <button type="button" onClick={() => setMode("share")} style={seg(mode === "share")}>Share&nbsp;%</button>
            <button type="button" onClick={() => setMode("count")} style={seg(mode === "count")}>Count</button>
          </div>
          <div style={{ display: "inline-flex", background: "var(--surface-2)", borderRadius: 999, padding: 3, gap: 2 }}>
            {["week", "month", "year"].map((r) => (
              <button key={r} type="button" onClick={() => setRange(r)} style={seg(range === r)}>{r[0].toUpperCase() + r.slice(1)}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 14.5, color: "var(--text)", lineHeight: 1.4, margin: "14px 0 2px", maxWidth: 460 }}>
        {copy.headlineText} {copy.deltaText && <span style={{ color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{copy.deltaText}</span>}
      </div>
      <div style={{ display: "flex", gap: 18, alignItems: "center", margin: "14px 0 8px", fontSize: 13, color: "var(--muted)", flexWrap: "wrap" }}>
        {legendDot("var(--danger)", "Went to site")}
        {legendDot("var(--resist-strong)", "Kept reading")}
        {legendDot("var(--resist-soft)", "Closed tab")}
      </div>
      <div>{buildPlot(data, mode)}</div>
    </div>
  );
}
