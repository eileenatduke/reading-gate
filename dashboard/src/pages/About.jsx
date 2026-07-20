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
      "Habits follow a simple pattern: a cue triggers them, you perform a routine, and your brain receives a reward. MIT neuroscientist Ann Graybiel found that as behaviors become habitual, the brain increasingly relies on the basal ganglia, a system involved in automatic actions, instead of conscious decision-making. That's why you can find yourself opening Instagram before you even realize you've reached for your phone.",
      "Because habits are built into the brain's reward system, simply removing the behavior is often not enough. A more effective approach is replacing the routine that follows the cue with a better one.",
    ],
    most: "Remove access to distracting apps but leave the underlying cue and craving unaddressed, making users more likely to return later.",
    ours: "Redirect the routine instead of eliminating it. Read a short article and write a summary — the moment that led to wasted time becomes learning.",
  },
  {
    n: "02",
    title: "Lock people out and they want in more.",
    body: [
      "In 1966, psychologist Jack Brehm introduced Psychological Reactance: when people feel their freedom is being taken away, they naturally try to regain control. Even when people create the restriction themselves, being completely locked out can make the blocked activity feel even more tempting.",
    ],
    most: "Build a wall and rely on users' willpower.",
    ours: "Preserve choice while changing the order of actions. Access apps, but read and learn first to earn the fun — intentional, not forbidden.",
  },
  {
    n: "03",
    title: "Predictable friction stops working.",
    body: [
      "Wolfram Schultz studied dopamine neurons in monkeys receiving juice rewards. After a cue consistently predicted the reward, the neurons began firing at the cue instead. The same applies to blockers using a fixed password, timer, or breathing exercise — your brain learns to anticipate the friction and bypasses it.",
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

// The apps people lose time to, shown as a row of their official icons above the
// "trade" band. Icons are hotlinked (referenced, not bundled): the crisp full-color
// brand marks come from Iconify's open "logos" set, and Instagram/Snapchat stay on
// Google's favicon service. Each sits on a per-brand tile colour so it matches the
// real app icon (e.g. red "N" on black for Netflix), and all tiles share one size
// and shape. `fit: "cover"` fills the tile edge-to-edge (marks that carry their own
// background); `fit: "contain"` centres a transparent glyph with padding.
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
  { name: "Netflix", src: brand("netflix-icon"), bg: "#ffffff", fit: "contain" },
];

export default function About() {
  // The page scrolls inside the fixed .rg-about container (not the window), so we
  // watch that element's scrollTop to fade the sticky nav to a translucent, blurred
  // bar once the user leaves the very top.
  const scrollRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="rg-about" ref={scrollRef}>
      <div className="rg-ab">
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
            <span>They didn't work.</span>
          </h1>
          <p className="rg-ab-lede">
            The average American now loses more of the day to a screen than ever before.
          </p>
        </header>

        {/* Stat band */}
        <div className="rg-ab-stats">
          {STATS.map((s) => (
            <div className="rg-ab-stat" key={s.big}>
              <div className="rg-ab-stat-num">{s.big}</div>
              <div className="rg-ab-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Apps people doomscroll on — a row of official app icons */}
        <div className="rg-ab-apps" aria-label="Apps people doomscroll on">
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
        <section className="rg-ab-trade">
          <h2 className="rg-ab-trade-h">Trade your doomscroll for a read.</h2>
          <p className="rg-ab-trade-p">
            Unlike traditional app blockers, Reading Gate replaces every doomscroll with a
            valuable read, then unlocks your apps after you've learned something.
          </p>
        </section>

        {/* Research intro */}
        <section className="rg-ab-research-intro">
          <h2 className="rg-ab-research-h">Reading Gate is rooted in psychology research.</h2>
        </section>

        {/* Three principles */}
        <section className="rg-ab-principles">
          {PRINCIPLES.map((p) => (
            <article className="rg-ab-principle" key={p.n}>
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
          ))}
        </section>

        {/* Comparison table */}
        <section className="rg-ab-table-wrap">
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
