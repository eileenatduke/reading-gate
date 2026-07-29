import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EXTENSION_URL } from "../lib/config.js";

// Editorial long-form "About" page (design handoff: Layout 1A). One fixed dark
// theme, a single centered reading column with a full-bleed white "trade" band.
// It argues why conventional app blockers fail and how Reading Gate differs,
// grounded in psychology research, ending on a competitor comparison table.
//
// Content is driven from the arrays below so the markup stays flat and the copy
// lives in one place — same data-first shape as Landing.jsx's icon table.

// The three research principles. `body` is a list of paragraphs; `most` / `ours`
// are the two-up comparison cards ("Most blockers" vs "Why our approach wins").
const PRINCIPLES = [
  {
    n: "01",
    title: "The habit loop.",
    body: [
      "Habits follow a simple pattern: a cue triggers a routine, and your brain receives a reward. MIT neuroscientist Ann Graybiel found that as behaviors become habitual, the brain relies on the basal ganglia — a system for automatic actions — rather than conscious decision-making. That's why you open Instagram before you realize you've reached for your phone.",
      "Because habits are built into the brain's reward system, removing the behavior often isn't enough. A more effective approach is to replace the routine that follows the cue with a better one.",
    ],
    most: "Remove access to distracting apps but leave the underlying cue and craving unaddressed, making users more likely to return later.",
    ours: "Redirect the routine instead of eliminating it. Read a short article and write a summary — the moment that led to wasted time becomes learning.",
  },
  {
    n: "02",
    title: "Lock people out and they want in more.",
    body: [
      "In 1966, psychologist Jack Brehm introduced Psychological Reactance: when people feel their freedom being taken away, they try to regain control. Even when you create the restriction yourself, being locked out can make the blocked activity feel even more tempting, which is why you are likely to uninstall traditional app blockers.",
    ],
    most: "Build a wall and rely on users' willpower.",
    ours: "Preserve choice while changing the order of actions. Access apps, but read and learn first to earn the fun — intentional, not forbidden.",
  },
  {
    n: "03",
    title: "Predictable friction stops working.",
    body: [
      "Wolfram Schultz found that dopamine neurons in monkeys initially fired when they received a juice reward. Once a cue reliably predicted the reward, the neurons shifted to firing at the cue instead, showing that the brain had learned to anticipate the reward before it arrived. Similarly, when a blocker always uses the same password, timer, or breathing exercise, that friction becomes predictable and you learn to wait it out.",
    ],
    most: "Rely on the same repeated barrier. A week in, users have learned to wait it out.",
    ours: "Keep the interruption valuable, not predictable. Reading stays consistent but the articles change every time, so the experience stays fresh.",
  },
];

// Comparison table rows. Labels kept as authored (no "Competitor 4" by design).
const COMPARISON = [
  { product: "Competitor 1", block: 'Tap "Ignore"', result: "You bypass it easily" },
  { product: "Competitor 2", block: "Scheduled lockout", result: "Frustration" },
  { product: "Competitor 3", block: "Hard lockout, desktop only", result: "Frustration" },
  { product: "Competitor 5", block: "Escalating delay", result: "You learn to wait it out" },
  { product: "Competitor 6", block: "Pet a virtual dog, breathe", result: "You learn to wait it out" },
];

const STATS = [
  { big: "7h 11m", label: "avg. daily phone use — up 14% YoY" },
  { big: "78%", label: "of adults tried a detox" },
  { big: "72%", label: "of those attempts failed" },
];

// The "how it works" walkthrough — three beats, shown as numbered cards with arrow
// connectors. Numbers match the brand's existing motif (the 01–03 principle numerals).
const STEPS = [
  { n: "1", label: "Open a blocked site" },
  { n: "2", label: "Read and summarize an article" },
  { n: "3", label: "Unlock site or keep reading" },
];

// The apps people lose time to, shown as a row of their official icons above the
// "trade" band. Icons are hotlinked (referenced, not bundled) from Iconify's open
// icon sets, with Instagram/Snapchat on Google's favicon service. Each sits on a
// per-brand tile colour, and all tiles share one size and shape. `fit: "cover"`
// fills the tile edge-to-edge (marks that carry their own background); `fit:
// "contain"` centres a transparent glyph with padding.
const favicon = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
const brand = (name) => `https://api.iconify.design/logos/${name}.svg`;

const DOOMSCROLL_APPS = [
  { name: "Instagram", src: favicon("instagram.com"), bg: "#ffffff", fit: "cover" },
  // TikTok's note is a black glyph with cyan/red offset — on a white tile it reads
  // as the official light-background TikTok icon and stands out against the dark page.
  { name: "TikTok", src: brand("tiktok-icon"), bg: "#ffffff", fit: "contain" },
  { name: "YouTube", src: brand("youtube-icon"), bg: "#ffffff", fit: "contain" },
  { name: "LinkedIn", src: brand("linkedin-icon"), bg: "#ffffff", fit: "cover" },
  { name: "Snapchat", src: favicon("snapchat.com"), bg: "#fffc00", fit: "cover" },
  // The real gradient Netflix N (dark side bars, brighter diagonal) on a
  // transparent background, from Wikimedia — a white tile with the N centred,
  // matching the YouTube/TikTok treatment. The flat one-tone N looked wrong.
  { name: "Netflix", src: "https://upload.wikimedia.org/wikipedia/commons/1/18/Netflix_2016_N_logo.svg", bg: "#ffffff", fit: "contain" },
];

// One research principle block (number, title, paragraphs, and the two-up compare
// cards). Extracted so the list can be split around the mid-page call to action.
function renderPrinciple(p) {
  return (
    <article className="rg-ab-principle rg-reveal" key={p.n}>
      <div className="rg-ab-principle-num">{p.n}</div>
      <h3 className="rg-ab-principle-h">{p.title}</h3>
      {p.body.map((para, i) => (
        <p className="rg-ab-principle-p" key={i}>{para}</p>
      ))}
      <div className="rg-ab-compare">
        <div className="rg-ab-card">
          <div className="rg-ab-card-label">Most blockers</div>
          <p className="rg-ab-card-p">{p.most}</p>
        </div>
        <div className="rg-ab-card is-ours">
          <div className="rg-ab-card-label">Why our approach wins</div>
          <p className="rg-ab-card-p">{p.ours}</p>
        </div>
      </div>
    </article>
  );
}

// Count every number in `finalText` up from zero, preserving the surrounding text
// ("7h 11m" → "0h 0m" … "7h 11m", "78%" → "0%" … "78%"). Ease-out cubic over `duration`.
function animateCount(el, finalText, duration) {
  const parts = finalText.match(/(\d+|\D+)/g) || [finalText];
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    const p = Math.min(1, (now - start) / duration);
    const e = ease(p);
    el.textContent = parts.map((seg) => (/^\d+$/.test(seg) ? String(Math.round(Number(seg) * e)) : seg)).join("");
    if (p < 1) requestAnimationFrame(frame);
    else el.textContent = finalText;
  }
  requestAnimationFrame(frame);
}

export default function About() {
  // The page scrolls inside the fixed .rg-about container (not the window), so we
  // watch that element's scrollTop to fade the sticky nav to a translucent, blurred
  // bar once the user leaves the very top.
  const scrollRef = useRef(null);
  const glowRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Tasteful motion: fade + rise each section as it scrolls into view, and count the
  // stat numbers up the first time the stat band appears. Both honor prefers-reduced-
  // motion (content just shows at rest). Observers use the scroll container as root.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups = [];

    // Scroll-reveal for the below-the-fold sections.
    const reveals = root.querySelectorAll(".rg-reveal");
    if (reduce) {
      reveals.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-in"); obs.unobserve(e.target); }
        });
      }, { root, rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
      reveals.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }

    // Count-up on the stat band.
    const statNums = [...root.querySelectorAll(".rg-ab-stat-num")];
    const finals = statNums.map((el) => el.textContent);
    if (!reduce) {
      statNums.forEach((el) => { el.textContent = el.textContent.replace(/\d+/g, "0"); });
      const band = root.querySelector(".rg-ab-stats");
      if (band) {
        const io2 = new IntersectionObserver((entries, obs) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              statNums.forEach((el, i) => animateCount(el, finals[i], 1100));
              obs.disconnect();
            }
          });
        }, { root, threshold: 0.4 });
        io2.observe(band);
        cleanups.push(() => io2.disconnect());
      }
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  // Movable blue+orange glow: follow the cursor across the top region (nav + hero, i.e.
  // everything above the stat band). The glow layer's height is sized to the stat band's
  // top, and the position eases toward the cursor for a smooth trail. Reduced-motion just
  // leaves the glow centered.
  useEffect(() => {
    const scroller = scrollRef.current;
    const glow = glowRef.current;
    if (!scroller || !glow) return;

    const sizeGlow = () => {
      const stats = scroller.querySelector(".rg-ab-stats");
      if (stats) glow.style.height = stats.offsetTop + "px";
    };
    sizeGlow();
    window.addEventListener("resize", sizeGlow);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return () => window.removeEventListener("resize", sizeGlow);

    let tx = 0, ty = 0, cx = null, cy = null, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.16;
      cy += (ty - cy) * 0.16;
      glow.style.setProperty("--gx", cx + "px");
      glow.style.setProperty("--gy", cy + "px");
      raf = (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e) => {
      const r = glow.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || x > r.width || y < 0 || y > r.height) return; // only the top region
      tx = x; ty = y;
      if (cx === null) { cx = x; cy = y; } // first move: start from the cursor, no jump
      if (!raf) raf = requestAnimationFrame(tick);
    };
    scroller.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("resize", sizeGlow);
      scroller.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="rg-about" ref={scrollRef}>
      <div className="rg-ab">
        {/* Cursor-following blue+orange glow across the top region (behind nav + hero) */}
        <div className="rg-ab-glow" ref={glowRef} aria-hidden="true" />
        {/* Nav */}
        <nav className={`rg-ab-nav${scrolled ? " is-scrolled" : ""}`}>
          <Link className="rg-ab-wordmark" to="/">Reading Gate</Link>
          <div className="rg-ab-navlinks">
            <Link className="rg-ab-navlink is-current" to="/about" aria-current="page">About</Link>
            <Link className="rg-ab-navlink" to="/login">Log in</Link>
            <a className="rg-ab-navcta" href={EXTENSION_URL} target="_blank" rel="noopener noreferrer">
              <img className="rg-ab-navcta-logo" src="https://api.iconify.design/logos/chrome.svg" alt="" aria-hidden="true" />
              <span>Add to Chrome</span>
            </a>
          </div>
        </nav>

        {/* Hero */}
        <header className="rg-ab-hero">
          <h1 className="rg-ab-h1">
            <span>You've already tried other app blockers.</span>
            <span className="rg-ab-h1-accent">They didn't work.</span>
          </h1>
          <p className="rg-ab-lede">
            The average American now loses more of the day to a screen than ever before.
          </p>
        </header>

        {/* Stat band */}
        <div className="rg-ab-stats rg-reveal">
          {STATS.map((s) => (
            <div className="rg-ab-stat" key={s.big}>
              <div className="rg-ab-stat-num">{s.big}</div>
              <div className="rg-ab-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Apps people doomscroll on — a row of official app icons */}
        <div className="rg-ab-apps rg-reveal" aria-label="Apps people doomscroll on">
          {DOOMSCROLL_APPS.map((a) => (
            <span className="rg-ab-app" key={a.name} style={{ background: a.bg }}>
              <img
                className={`rg-ab-app-img is-${a.fit}`}
                src={a.src}
                alt={`${a.name} icon`}
                loading="lazy"
              />
            </span>
          ))}
        </div>

        {/* Trade statement — the one light/inverted band */}
        <section className="rg-ab-trade rg-reveal">
          <h2 className="rg-ab-trade-h">Trade your doomscroll for a <span className="rg-ab-trade-accent">read</span>.</h2>
          <p className="rg-ab-trade-p">
            Become more informed with every scroll.
          </p>
        </section>

        {/* How it works — three-step walkthrough that breaks up the copy */}
        <section className="rg-ab-how rg-reveal">
          <h2 className="rg-ab-how-h">How it works</h2>
          <ol className="rg-ab-steps">
            {STEPS.map((s) => (
              <li className="rg-ab-step" key={s.n}>
                <div className="rg-ab-step-num">{s.n}</div>
                <div className="rg-ab-step-label">{s.label}</div>
              </li>
            ))}
          </ol>
        </section>

        {/* Research intro */}
        <section className="rg-ab-research-intro rg-reveal">
          <h2 className="rg-ab-research-h">Reading Gate is rooted in psychology research.</h2>
        </section>

        {/* Principles 01–02 */}
        <section className="rg-ab-principles">
          {PRINCIPLES.slice(0, 2).map(renderPrinciple)}
        </section>

        {/* Mid-page call to action — the light band between studies 02 and 03 */}
        <section className="rg-ab-final rg-reveal">
          <h2 className="rg-ab-final-h">Stop reading about it.<br />Start doing it.</h2>
          <p className="rg-ab-final-p">
            Reading Gate lives in your browser, turning every doomscroll into a chance to
            learn something valuable. Free to use. Takes just 30 seconds to install.
          </p>
          <a
            className="rg-ab-navcta rg-ab-navcta-lg rg-ab-navcta-dark"
            href={EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img className="rg-ab-navcta-logo" src="https://api.iconify.design/logos/chrome.svg" alt="" aria-hidden="true" />
            <span>Add to Chrome</span>
          </a>
        </section>

        {/* Principle 03 */}
        <section className="rg-ab-principles">
          {PRINCIPLES.slice(2).map(renderPrinciple)}
        </section>

        {/* Comparison table */}
        <section className="rg-ab-table-wrap rg-reveal">
          <h2 className="rg-ab-table-h">What actually happens while you're blocked</h2>
          <div className="rg-ab-table" role="table">
            <div className="rg-ab-tr rg-ab-thead" role="row">
              <div className="rg-ab-th" role="columnheader">Product</div>
              <div className="rg-ab-th" role="columnheader">What the block does</div>
              <div className="rg-ab-th" role="columnheader">Result</div>
            </div>
            {COMPARISON.map((r) => (
              <div className="rg-ab-tr" role="row" key={r.product}>
                <div className="rg-ab-td" role="cell">{r.product}</div>
                <div className="rg-ab-td" role="cell">{r.block}</div>
                <div className="rg-ab-td" role="cell">{r.result}</div>
              </div>
            ))}
            <div className="rg-ab-tr is-us" role="row">
              <div className="rg-ab-td" role="cell">Reading Gate</div>
              <div className="rg-ab-td" role="cell">Read, write 70 words, rate it</div>
              <div className="rg-ab-td" role="cell">You become more informed and well-versed.</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
