import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EXTENSION_URL } from "../lib/config.js";

// Interactive silhouette hero (prototype 7a). Fifteen frosted app-icon
// silhouettes float invisibly on the dark stage; they fade in only near the
// cursor, and each one is clickable. Clicking any silhouette "enters" the site:
// the About pill fades in centre-stage, the CTA row lifts into place, and every
// silhouette is hidden + disabled so only the three buttons stay interactive.
//
// Values (positions, sizes, per-icon opacity/shadow depth, float timing) are the
// hand-tuned handoff from the prototype — an irregular scatter across the
// authored 1280x800 frame. Depth reads through border/gradient/shadow alpha,
// which all track each icon's max opacity (op).
const ICONS = [
  { l: 803, t: 395, s: 75,  bw: 1.17, r: 18, ga: 0.029, sy: 7,  sb: 14, sa: 0.157, it: 0.097, ib: 0.086, op: 0.317, dur: 8.7, del: 0.1 },
  { l: 385, t: 141, s: 87,  bw: 1.03, r: 21, ga: 0.005, sy: 5,  sb: 9,  sa: 0.027, it: 0.017, ib: 0.015, op: 0.170, dur: 8.9, del: 2.9 },
  { l: 614, t: 379, s: 96,  bw: 1.33, r: 23, ga: 0.055, sy: 11, sb: 19, sa: 0.303, it: 0.187, ib: 0.165, op: 0.481, dur: 8.1, del: 2.3 },
  { l: 754, t: 270, s: 98,  bw: 1.20, r: 24, ga: 0.034, sy: 8,  sb: 15, sa: 0.185, it: 0.114, ib: 0.101, op: 0.348, dur: 6.9, del: 0.3 },
  { l: 513, t: 183, s: 134, bw: 1.19, r: 32, ga: 0.032, sy: 8,  sb: 14, sa: 0.176, it: 0.109, ib: 0.096, op: 0.338, dur: 8.9, del: 0.4 },
  { l: 485, t: 544, s: 69,  bw: 1.08, r: 17, ga: 0.013, sy: 6,  sb: 11, sa: 0.071, it: 0.044, ib: 0.039, op: 0.220, dur: 7.4, del: 1.5 },
  { l: 698, t: 494, s: 105, bw: 1.17, r: 25, ga: 0.028, sy: 7,  sb: 14, sa: 0.152, it: 0.094, ib: 0.083, op: 0.311, dur: 6.5, del: 1.2 },
  { l: 485, t: 343, s: 95,  bw: 1.24, r: 23, ga: 0.039, sy: 9,  sb: 16, sa: 0.216, it: 0.134, ib: 0.118, op: 0.384, dur: 6.3, del: 0.3 },
  { l: 738, t: 152, s: 65,  bw: 1.12, r: 16, ga: 0.020, sy: 6,  sb: 12, sa: 0.110, it: 0.068, ib: 0.060, op: 0.264, dur: 6.5, del: 1.5 },
  { l: 573, t: 532, s: 75,  bw: 1.15, r: 18, ga: 0.025, sy: 7,  sb: 13, sa: 0.139, it: 0.086, ib: 0.076, op: 0.297, dur: 8.5, del: 0.9 },
  { l: 379, t: 388, s: 88,  bw: 1.16, r: 21, ga: 0.026, sy: 7,  sb: 13, sa: 0.143, it: 0.088, ib: 0.078, op: 0.301, dur: 7.5, del: 1.4 },
  { l: 374, t: 273, s: 77,  bw: 1.06, r: 18, ga: 0.010, sy: 5,  sb: 10, sa: 0.053, it: 0.033, ib: 0.029, op: 0.199, dur: 8.4, del: 1.8 },
  { l: 840, t: 550, s: 78,  bw: 1.01, r: 19, ga: 0.001, sy: 4,  sb: 8,  sa: 0.008, it: 0.005, ib: 0.004, op: 0.149, dur: 5.7, del: 1.9 },
  { l: 364, t: 564, s: 85,  bw: 1.01, r: 20, ga: 0.001, sy: 4,  sb: 8,  sa: 0.008, it: 0.005, ib: 0.004, op: 0.149, dur: 7.7, del: 1.2 },
  { l: 859, t: 117, s: 58,  bw: 1.00, r: 14, ga: 0.000, sy: 4,  sb: 8,  sa: 0.000, it: 0.000, ib: 0.000, op: 0.140, dur: 8.6, del: 0.5 },
];

const PAPER = "244,244,242";

function iconStyle(ic) {
  return {
    left: ic.l,
    top: ic.t,
    width: ic.s,
    height: ic.s,
    borderRadius: ic.r,
    border: `${ic.bw}px solid rgba(${PAPER},${ic.op})`,
    background: `linear-gradient(150deg, rgba(${PAPER},${ic.ga}) 0%, rgba(${PAPER},0) 62%)`,
    boxShadow: `0 ${ic.sy}px ${ic.sb}px rgba(0,0,0,${ic.sa}), inset 0 1px 0 rgba(255,255,255,${ic.it}), inset 0 -6px 14px rgba(0,0,0,${ic.ib})`,
    animation: `rgIconFloat ${ic.dur}s ease-in-out ${ic.del}s infinite alternate`,
  };
}

export default function Landing() {
  const stageRef = useRef(null);
  const enteredRef = useRef(false);
  const [entered, setEntered] = useState(false);

  // Scale the authored 1280x800 stage to fit the viewport (never upscaling past
  // 1:1). Done in JS because CSS calc() can't derive a unitless scale factor
  // from a viewport length divided by the reference width.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const s = Math.min(1, (window.innerWidth - 32) / 1280, (window.innerHeight - 32) / 800);
      stage.style.setProperty("--rg-scale", s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Cursor-proximity reveal. Each silhouette fades up as the pointer nears its
  // centre (radius R), eased so the falloff feels soft. Opacity is written to
  // the DOM directly — a per-move React state update across 15 nodes would be
  // needlessly heavy. offsetWidth/rect.width backs out any CSS scale so the
  // hit-test stays in the stage's own unscaled coordinate space.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const icons = Array.from(stage.querySelectorAll("[data-silhouette]"));
    const R = 250;

    const onMove = (e) => {
      if (enteredRef.current) return;
      const rect = stage.getBoundingClientRect();
      const sc = stage.offsetWidth / rect.width;
      const px = (e.clientX - rect.left) * sc;
      const py = (e.clientY - rect.top) * sc;
      icons.forEach((ic) => {
        const cx = ic.offsetLeft + ic.offsetWidth / 2;
        const cy = ic.offsetTop + ic.offsetHeight / 2;
        const d = Math.hypot(cx - px, cy - py);
        const t = Math.pow(Math.max(0, 1 - d / R), 0.6);
        const maxop = parseFloat(ic.dataset.maxop || 0.7);
        ic.style.opacity = (Math.min(1, t * 1.35) * maxop).toFixed(3);
      });
    };
    const onLeave = () => {
      if (enteredRef.current) return;
      icons.forEach((ic) => { ic.style.opacity = 0; });
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Clicking any silhouette enters the site: About fades in, the CTA row lifts,
  // and all silhouettes are hidden + disabled (driven by the `entered` class).
  const enter = () => {
    enteredRef.current = true;
    setEntered(true);
  };

  return (
    <div className="rg-landing">
      <div className="rg-hero">
        <div className={`rg-stage${entered ? " entered" : ""}`} ref={stageRef}>
          <div className="rg-silhouettes" aria-hidden="true">
            {ICONS.map((ic, i) => (
              <button
                key={i}
                type="button"
                className="rg-silhouette"
                data-silhouette
                data-maxop={ic.op}
                style={iconStyle(ic)}
                tabIndex={-1}
                onClick={enter}
              />
            ))}
          </div>

          <div className="rg-wordmark">Reading Gate</div>

          <div className="rg-phrase left">Every tap<br />A little smarter</div>
          <div className="rg-phrase right">Read first<br />Scroll later</div>

          {/* About reveal — fades in centre-stage once a silhouette is clicked. */}
          <Link className="rg-pill rg-about-cta" to="/about" tabIndex={entered ? 0 : -1}>
            About
          </Link>

          <div className="rg-cta-row">
            <a className="rg-pill solid" href={EXTENSION_URL} target="_blank" rel="noopener noreferrer">
              Download Now
            </a>
            <Link className="rg-pill" to="/login">Log in / Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
