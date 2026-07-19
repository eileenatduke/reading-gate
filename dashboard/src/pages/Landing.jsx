import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { EXTENSION_URL } from "../lib/config.js";

// The nine shards: each is the same CSS phone clipped to one polygon wedge, with
// its own scatter vector (--dx/--dy/--rot) and stagger. Values from the design
// handoff — an irregular 3x3 tessellation of the 220x437 phone box.
const SHARDS = [
  { clip: "0% 0%, 37% 0%, 41% 25%, 0% 29%",       dx: -164, dy: 467, rot: -38, d: 0.046 },
  { clip: "37% 0%, 69% 0%, 65% 33%, 41% 25%",      dx: 36,   dy: 461, rot: -9,  d: 0.003 },
  { clip: "69% 0%, 100% 0%, 100% 29%, 65% 33%",    dx: 163,  dy: 462, rot: 101, d: 0.027 },
  { clip: "0% 29%, 41% 25%, 33% 58%, 0% 60%",      dx: -185, dy: 323, rot: -40, d: 0.039 },
  { clip: "41% 25%, 65% 33%, 71% 65%, 33% 58%",    dx: 93,   dy: 308, rot: 1,   d: 0.043 },
  { clip: "65% 33%, 100% 29%, 100% 60%, 71% 65%",  dx: 188,  dy: 304, rot: 14,  d: 0.037 },
  { clip: "0% 60%, 33% 58%, 36% 100%, 0% 100%",    dx: -221, dy: 156, rot: -85, d: 0.049 },
  { clip: "33% 58%, 71% 65%, 68% 100%, 36% 100%",  dx: 38,   dy: 154, rot: -1,  d: 0.005 },
  { clip: "71% 65%, 100% 60%, 100% 100%, 68% 100%",dx: 172,  dy: 159, rot: 83,  d: 0.004 },
];

export default function Landing() {
  const stageRef = useRef(null);

  // Replay the one-shot crash whenever the hero (re)enters view — same technique
  // as the prototype: toggle animation off, force a reflow, restore it. Each
  // animated node keeps its animation shorthand in data-anim.
  // Scale the authored 1280x800 stage to fit the viewport (never upscaling past
  // 1:1). Done in JS because CSS calc() can't produce a unitless scale factor
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

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const replay = () => {
      stage.querySelectorAll("[data-anim]").forEach((n) => {
        const a = n.getAttribute("data-anim");
        if (!a) return;
        n.style.animation = "none";
        void n.offsetWidth; // force reflow
        n.style.animation = a;
      });
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && replay()),
      { threshold: 0.3 }
    );
    io.observe(stage);
    return () => io.disconnect();
  }, []);

  return (
    <div className="rg-landing">
      <div className="rg-hero">
        <div className="rg-stage" ref={stageRef}>
          <div className="rg-wordmark">Reading Gate</div>

          <div className="rg-phrase left">Every tap<br />A little smarter</div>
          <div className="rg-phrase right">Read first<br />Scroll later</div>

          <div className="rg-flash" data-anim="rgFlash 5.5s both" aria-hidden="true" />

          <div className="rg-phone-group" data-anim="rgDrop 5.5s both" aria-hidden="true">
            {/* The same phone image drawn nine times, each clipped to one wedge;
                stacked, the wedges reassemble into a whole phone, then each
                bursts and vanishes independently. */}
            {SHARDS.map((s, i) => (
              <img
                key={i}
                className="rg-shard"
                src="/rg-phone-blend.svg"
                alt=""
                data-anim={`rgBurst 5.5s ${s.d}s both`}
                style={{
                  clipPath: `polygon(${s.clip})`,
                  animation: `rgBurst 5.5s ${s.d}s both`,
                  "--dx": `${s.dx}px`,
                  "--dy": `${s.dy}px`,
                  "--rot": `${s.rot}deg`,
                }}
              />
            ))}
          </div>

          {/* About reveal that fades in centre-stage after the crash. */}
          <Link className="rg-pill rg-about-cta" data-anim="rgAboutIn 5.5s both" to="/about">
            About
          </Link>

          <div className="rg-cta-row" data-anim="rgButtonsUp 5.5s both">
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
