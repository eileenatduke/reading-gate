# About page: colour → gray drain on the app icons

## Goal

On the About page, the row of doomscroll app icons (Instagram, TikTok, YouTube,
LinkedIn, Snapchat, Netflix) sits directly above the "Trade your doomscroll for a
read" band. Today the tiles are static full-colour. They should drain from colour to
gray as the row scrolls into view, one tile after another, and stay gray — a visual
echo of the trade the band states in words.

## Current state

- `dashboard/src/pages/About.jsx:277` — the row is
  `<div className="rg-ab-apps rg-reveal">`, mapping `DOOMSCROLL_APPS` to
  `<span className="rg-ab-app" style={{ background: a.bg }}>` tiles, each wrapping a
  hotlinked, lazy-loaded `<img className="rg-ab-app-img">`.
- Each tile carries its own background colour: white for five of them, `#fffc00` for
  Snapchat.
- `dashboard/src/styles/landing.css:343` — `.rg-ab-app` is a fixed-size rounded tile
  with `transition: transform .18s ease, box-shadow .18s ease` and a hover rule that
  lifts and scales it.
- `About.jsx:151–192` — one `useEffect` already owns the page's motion: an
  `IntersectionObserver` that adds `is-in` to every `.rg-reveal` element, and a second
  one that runs the stat count-up. It reads `prefers-reduced-motion` once at the top
  and pushes teardown functions onto a `cleanups` array.

Because the row is already a `.rg-reveal`, a scroll-into-view signal exists, but it is
not reused directly — see "Rejected alternatives".

## Behaviour

| Aspect | Decision |
| --- | --- |
| Trigger | First time the app row scrolls into view; once only |
| Order | Staggered left → right, 90ms between tiles |
| Fade duration | 700ms per tile |
| Head start | 400ms after the row enters view, before the first tile starts |
| Resting state | `grayscale(1) brightness(.85)` — fully gray and slightly dimmed |
| Hover | Restores full colour immediately; re-grays on mouse-out |
| Reduced motion | Tiles are gray at rest from mount; no stagger, no transition |

## Implementation

### `dashboard/src/pages/About.jsx`

Add a third block to the existing motion `useEffect`, after the count-up block and
before the `return`:

- Query `.rg-ab-apps` and its `.rg-ab-app` children off `root`. If either is missing,
  skip the block.
- If `reduce` is true, add `is-gray` to every tile immediately and skip the observer.
- Otherwise create an `IntersectionObserver` rooted on `scrollRef.current` with
  `threshold: 0.35`. On the first intersecting entry, disconnect the observer and
  schedule one `setTimeout` per tile at `400 + i * 90` ms, each adding `is-gray` to its
  tile.
- Collect the timeout ids in an array; push a cleanup that clears every pending
  timeout and disconnects the observer onto the existing `cleanups` array, so
  unmounting mid-drain touches nothing detached.

### `dashboard/src/styles/landing.css`

- Extend `.rg-ab-app`'s existing `transition` with `filter .7s ease`. Leave the
  `transform`/`box-shadow` timings alone so the hover lift keeps its current feel.
- Add `.rg-ab-app.is-gray { filter: grayscale(1) brightness(.85); }`.
- Add `.rg-ab-app.is-gray:hover { filter: none; }`.
- In the existing `@media (prefers-reduced-motion: reduce)` block at line 321, add
  `.rg-ab-app { transition: none; }`.

The filter is applied to the tile rather than the `<img>` so that Snapchat's yellow
background desaturates along with its glyph. No `transition-delay` is used anywhere:
the stagger lives entirely in the JS timeouts, which keeps hover-on and hover-off
immediate in both directions.

## Rejected alternatives

- **CSS-only, stagger via `transition-delay` keyed to the row's existing `is-in`
  class.** Zero JS, but the same delay applies when the pointer leaves a hovered tile,
  so colour would linger for up to ~0.9s before re-graying. Reads as lag.
- **CSS `@keyframes` with `animation-fill-mode: forwards`.** Clean drain, but the
  filled animation value outranks the `:hover` rule, so restoring colour on hover would
  need `!important`.

## Verification

No test runner exists in `dashboard/` (Vite only), so verification is visual:

1. `cd dashboard && npm run dev`, open `/about`, scroll to the app row. Colour drains
   left → right and settles gray.
2. Hover a settled tile: full colour returns immediately; it re-grays on mouse-out,
   with the hover lift unchanged.
3. Enable reduced motion (macOS Reduce Motion, or DevTools rendering emulation) and
   reload: tiles are gray on arrival with no animation.
4. `npm run build` completes without error.

## Out of scope

A "(see your garden)" affordance on the Overview Articles-read card — a separate
request, to be designed after this ships.
