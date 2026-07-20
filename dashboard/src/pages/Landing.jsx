import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EXTENSION_URL } from "../lib/config.js";

// Interactive silhouette hero. Frosted app-icon silhouettes float invisibly on
// the dark stage; they fade in only near the cursor, and each one is clickable.
// Clicking any silhouette "enters" the site: the About pill fades in centre-
// stage, the CTA row lifts into place, and every silhouette is hidden + disabled
// so only the three buttons stay interactive.
//
// The scatter fills the hero's empty space — corners, edges, and centre — while
// staying clear of the wordmark, the two phrases, and the always-visible CTA row.

// Depth params (border weight, radius, gradient/shadow alphas, float timing) are
// derived from each icon's size and max opacity so the whole set reads as one
// consistent family however many icons there are.
function makeIcon(l, t, s, op) {
  const d = Math.max(0, op - 0.14); // depth above the faintest icons
  return {
    l, t, s, op,
    bw: +(1 + d * 0.7).toFixed(2),
    r: Math.round(s * 0.24),
    ga: +(d * 0.16).toFixed(3),
    sy: Math.round(4 + d * 20),
    sb: Math.round(8 + d * 32),
    sa: +(d * 0.9).toFixed(3),
    it: +(d * 0.55).toFixed(3),
    ib: +(d * 0.49).toFixed(3),
    dur: 6 + (s % 4),              // 6–9s float, varied by size
    del: +((l % 30) / 10).toFixed(1), // 0–2.9s stagger, varied by position
  };
}

// [left, top, size, maxOpacity] on the authored 1280x800 frame. Every box is
// kept out of: wordmark (x40–300,y25–85), left phrase (x40–400,y300–455),
// right phrase (x880–1240,y300–455), and CTA row (x470–810,y555–750).
const ICONS = [
  // top band
  [70, 110, 96, 0.34], [210, 175, 62, 0.20], [360, 120, 80, 0.30], [500, 150, 120, 0.42],
  [660, 110, 72, 0.26], [760, 175, 98, 0.35], [900, 130, 84, 0.30], [1050, 150, 90, 0.33], [1165, 108, 58, 0.16],
  // upper-centre
  [600, 250, 100, 0.46], [470, 260, 88, 0.32], [740, 270, 95, 0.36],
  // mid-left gap
  [110, 480, 120, 0.42], [250, 560, 70, 0.22], [60, 600, 54, 0.16], [330, 500, 80, 0.28],
  // centre playground (About is hidden until entered; icons hide on enter)
  [500, 380, 95, 0.40], [620, 440, 105, 0.44], [690, 335, 78, 0.28], [560, 470, 75, 0.24], [820, 430, 88, 0.30],
  // mid-right gap
  [1010, 480, 100, 0.40], [1150, 560, 72, 0.22], [960, 600, 80, 0.26], [1185, 468, 56, 0.16],
  // bottom band (flanking the CTA row)
  [150, 660, 84, 0.30], [300, 705, 70, 0.22], [900, 660, 92, 0.32], [1050, 690, 76, 0.24], [1165, 650, 60, 0.16],
].map(([l, t, s, op]) => makeIcon(l, t, s, op));

// Cool silver — replaces the warm off-white so the reveal/outline reads silvery.
const SILVER = "210,216,226";

function iconStyle(ic) {
  return {
    left: ic.l,
    top: ic.t,
    width: ic.s,
    height: ic.s,
    borderRadius: ic.r,
    border: `${ic.bw}px solid rgba(${SILVER},${ic.op})`,
    background: `linear-gradient(150deg, rgba(${SILVER},${ic.ga}) 0%, rgba(${SILVER},0) 62%)`,
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
              Add to Chrome
            </a>
            <Link className="rg-pill" to="/login">Log in / Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
