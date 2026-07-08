# DESIGN.md — Reading Gate visual contract

The **visual contract** both surfaces (browser extension gate + web dashboard)
follow. Everything is **token-based**: components reference CSS custom properties,
never hardcoded colors or sizes. Shipping one theme now; a future theme switcher is
just another token set + a `data-theme` toggle, no rewrite.

Tokens live in code at:
- `dashboard/src/styles/tokens.css`
- `extension/src/gate/tokens.css`

Keep the two token files in sync — they are the same design system.

## Mood

Calm, editorial, focused. The gate should feel like a quiet reading room, not a
punishment. Generous whitespace, one accent color, restrained motion. The dashboard
is a clean analytics surface: legible numbers, one hue per chart, no chartjunk.

## Color tokens

Light theme (default), with a dark set behind `[data-theme="dark"]`.

| Token | Light | Role |
|---|---|---|
| `--bg` | `#f7f6f3` | app background (warm paper) |
| `--surface` | `#ffffff` | cards, panels |
| `--surface-2` | `#f1efe9` | subtle raised / hover |
| `--border` | `#e4e1d8` | hairlines, dividers |
| `--text` | `#1f1d1a` | primary text |
| `--text-muted` | `#6b6660` | secondary text, captions |
| `--accent` | `#c2410c` | primary action, links, brand (warm ember) |
| `--accent-weak` | `#fdecdf` | accent tint backgrounds |
| `--success` | `#3f7d5b` | streaks, completed states |
| `--warning` | `#b58a2b` | attention |
| `--danger` | `#b3352b` | destructive (remove domain), errors |

Dark theme:

| Token | Dark |
|---|---|
| `--bg` | `#17150f` |
| `--surface` | `#211e17` |
| `--surface-2` | `#2b271e` |
| `--border` | `#38332a` |
| `--text` | `#f2 efe6`→`#f2efe6` |
| `--text-muted` | `#a49d90` |
| `--accent` | `#f97316` |
| `--accent-weak` | `#3a2417` |

### Chart palette (Recharts)

Single-hue where the chart is a magnitude comparison; a small categorical ramp
where a chart needs distinct series. Ordered, colorblind-considerate.

```
--chart-1: #c2410c   /* primary / bars */
--chart-2: #2563eb   /* cumulative line */
--chart-3: #3f7d5b
--chart-4: #7c3aed
--chart-5: #b58a2b
--chart-6: #0891b2
--chart-grid: var(--border)
--chart-heat-0: #f1efe9  /* heatmap empty */
--chart-heat-4: #c2410c  /* heatmap hottest */
```

- **Article-count combo chart:** bars use `--chart-1`, cumulative line uses `--chart-2`.
- **Genre distribution:** single hue `--chart-1`, sorted descending.
- **Doomscroll heatmap:** interpolate `--chart-heat-0` → `--chart-heat-4`.

## Typography

- **Sans (UI):** system stack — `-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
- **Serif (article headline in the gate):** `Georgia, "Times New Roman", serif` — signals "read me."

Type scale (rem): `--fs-xs .75`, `--fs-sm .875`, `--fs-base 1`, `--fs-lg 1.125`,
`--fs-xl 1.375`, `--fs-2xl 1.75`, `--fs-3xl 2.25`. Line-height 1.5 body, 1.2 headings.
Weights: 400 body, 500 UI emphasis, 600–700 headings.

## Spacing scale

`--sp-1 4px`, `--sp-2 8px`, `--sp-3 12px`, `--sp-4 16px`, `--sp-5 24px`,
`--sp-6 32px`, `--sp-7 48px`, `--sp-8 64px`.

## Radius & elevation

`--radius-sm 6px`, `--radius 10px`, `--radius-lg 16px`, `--radius-pill 999px`.
Shadows: `--shadow-sm 0 1px 2px rgba(0,0,0,.05)`, `--shadow 0 4px 16px rgba(0,0,0,.08)`.

## Motion

`--ease: cubic-bezier(.2,.7,.2,1)`; durations 120ms (hover) / 200ms (enter).
Respect `prefers-reduced-motion`.

## Components

### Extension gate screen
- **Full-viewport overlay**, `--bg`, centered column max-width 640px.
- **Article card:** `--surface`, `--radius-lg`, `--shadow`, padding `--sp-6`.
  Source pill (`--accent-weak`/`--accent`) + genre pill, serif headline (`--fs-2xl`),
  blurb (`--text-muted`), and a **"Read on {source} ↗"** primary button that opens the
  publisher link in a new tab.
- **Summary textarea:** `--surface`, `--border`, `--radius`. Below it a **live word
  counter** — muted until ≥70 words, then `--success`. Submit stays disabled under 70.
- **Ratings:** two required rows — Quality (1–5 stars) and Interest (1–5). Unfilled =
  `--border` outline; filled = `--accent`.
- **Submit button:** primary (`--accent` bg, white text). Disabled state = `--surface-2`
  bg, `--text-muted`, `not-allowed` cursor. Enabled only when ≥70 words AND both ratings set.
- **Locked feel:** no visible close/escape affordance; the site stays gated until submit.

### Dashboard
- **Nav:** left rail (desktop) / top bar (mobile). Overview · Library · Settings. Accent
  marks the active route.
- **Stat cards:** `--surface`, `--radius-lg`, `--shadow-sm`. Big number (`--fs-3xl`),
  label (`--text-muted`, `--fs-sm`). The Impulse card is clickable (cursor pointer,
  hover raises to `--shadow`) → Impulse history.
- **Charts:** wrapped in a titled panel (`--surface`, `--radius-lg`, padding `--sp-5`).
  Grid lines `--chart-grid`, axis text `--text-muted`, tooltip `--surface` + `--shadow`.
- **Library rows:** title as an accent link (opens `article_url` in new tab), summary
  in `--text-muted`, rating stars, genre + source pills, date right-aligned. Sticky
  filter bar (search box + genre/source/rating selects) at top.
- **Settings:** blocklist chips with a remove (×, `--danger` on hover) + add-domain
  input; interest topics as toggle pills (`--accent` when selected).

## Accessibility
- Contrast ≥ 4.5:1 for text. Focus-visible outline `2px solid --accent`.
- Ratings and word-counter states are not color-only — pair with text/aria-labels.
- All interactive controls keyboard reachable; charts have an accessible summary.
