# Build Spec — "Read First" (working title)

A browser extension that makes you read and summarize a news article before it unlocks a distracting site (Instagram, TikTok, YouTube, etc.), plus a web dashboard that tracks everything you've read.

This document is written to be handed directly to **Claude Code** as the source of truth for the build. Point every build session — and every subagent — at this file.

---

## 1. What we're building (in one paragraph)

A **multi-user** product with two pieces of software that share **one backend**:

1. A **browser extension** (the "gate") that intercepts when the user opens a site on their personal blocklist, shows them a news article, and refuses to unlock the site until they've read it, written a 70-word summary, and rated it.
2. A **web dashboard** (a separate, deployed website) where the user sees their full reading history and progress graphs.

Both talk to a single **Supabase** project (database + login). The extension *writes* reading records; the dashboard *reads* them. They never talk to each other directly — only to Supabase.

Anyone can sign up. Each user chooses **which sites to block** themselves (one user blocks Instagram + TikTok; another adds YouTube).

---

## 2. Core user flow

1. User installs the extension and creates an account (or logs in).
2. **Onboarding:** user (a) picks the topics they're interested in, and (b) adds the sites/domains they want to block.
3. User later opens a blocked site (e.g., types `instagram.com`).
4. The extension **intercepts** and replaces the page with the **gate screen**, showing one article: **headline + short blurb + a "Read on [source]" button** that opens the real article on the publisher's site in a new tab.
5. User reads the article on the source site, comes back to the gate.
6. User writes a summary. **The Submit button stays disabled until the summary is at least 70 words.**
7. User gives two ratings, both **required**:
   - **Quality** (1–5 stars) — how good the article was.
   - **Interest / Preference** (1–5) — how much it matched what they want to learn.
8. On Submit, the record is saved to Supabase and **only then** does the blocked site unlock for that visit.
9. Next time they open the blocked site, they get a **fresh article** and repeat.

> **Hard requirement:** the gate screen must not disappear and the site must not unlock until the summary (≥70 words) **and both ratings** are submitted.

---

## 3. The enforcement / unlock rule ("every open")

**Every open of a blocked site requires a fresh article**, and leaving a tab open must NOT be a way to bypass this. Precise definition to build against:

- The gate triggers whenever a blocked-domain tab **becomes the active foreground tab** and is not currently in an unlocked session.
- Completing the article (summary + ratings) grants an **active unlock**, valid only while the user stays actively on that tab.
- The unlock is **revoked** as soon as the tab is closed, navigates away, **or loses focus** (user switches to another tab or another app).
- Returning to the site — new tab, or switching back to a backgrounded one — re-triggers the gate → **a fresh article**. This closes the "open it once and leave it open all day" exploit.

**Grace period (30 seconds):** a returning tab only re-gates if it was out of focus for **longer than 30 seconds**. This is not leniency — it prevents false re-gating when focus is momentarily stolen by the address bar, an OS notification, or an accidental click. Keep it configurable, but 30s is the chosen default.

**Optional stricter lever (not required for MVP):** also cap a single continuous unlock at a **max session length** (e.g., 20 minutes), after which the tab re-gates even if never left. Flagged here in case the owner wants it later.

**How to implement (MV3):** track tab focus with `chrome.tabs.onActivated` + `chrome.windows.onFocusChanged`, and page foreground/background with the Page Visibility API (`visibilitychange` / `document.hidden`) in the content script. Store a `lastActive` timestamp per unlocked tab; on refocus, if `now - lastActive > grace`, revoke and re-gate.

**MVP scope note:** no honor-system bypass protection beyond the 70-word minimum. No LLM checking that the summary actually matches the article (explicitly out of scope for v1).

---

## 4. The AI / MCP exemption (important design principle)

Requirement: when an **AI agent** (e.g., Claude operating the computer via MCP) accesses Instagram, it must **not** hit the gate. Only humans get gated.

**Do this architecturally, not by detection.** The gate only exists where it's installed. The extension lives in the **human's browser profile**. Any AI/automation runs in its **own browser profile / context that does not have the extension installed**. Result: there is nothing to detect and nothing to bypass — the AI simply operates on an un-gated surface, while the same Supabase backend is still available if needed. Do **not** rely on fragile signals like `navigator.webdriver`.

---

## 5. Content system

### Sources (final)
- **BBC** — official RSS feeds by section (Technology, Science, Business, Politics, World). Reliable.
- **NPR** — official RSS feeds by topic. Reliable.
- **The Guardian** — via the free **Guardian Open Platform API** (free key, allows real use, articles come pre-categorized by "section"). Reliable backbone for Science / Politics / World.
- **Yahoo Tech** and **Yahoo Finance** — via RSS. Keep them for tech/finance coverage, but treat as **best-effort**: Yahoo feeds can be flaky. **Fallback:** if a Yahoo feed fails, fill Tech from BBC/Guardian Technology and Finance from BBC/Guardian Business so those genres never go empty.
- **Reuters — removed.** Reuters shut down official RSS in 2020; no clean, legal, free feed exists. Do not include it.

### Rules
- **No full article text.** Free RSS/APIs return only headline + blurb + link. The gate shows headline + blurb + "Read on source" link-out. This is by design (and legally correct) — do not attempt to scrape and render full article bodies.
- **Genre labeling is free:** derive each article's genre from the **feed/section it came from** (e.g., the BBC Technology feed → genre = "Technology"). No AI classification needed for the MVP.
- Fetch articles on a schedule (e.g., a periodic background refresh) and keep a small pool of unread articles per user so the gate loads instantly. De-duplicate by URL.

---

## 6. Recommendation logic

**Cold start (onboarding):** user picks interest topics from a fixed list, e.g.: Technology, Science, Politics, World, Business/Finance, Health. (Adjust the list to whatever the chosen feeds can reliably supply.)

**Steady state:** for each user, keep a **running average of the Interest/Preference rating per genre**. Bias article selection toward the genres they rate highly, while still only pulling from genres in their selected interest set.

**The serendipity rule (from the brief):** for every 10 articles served, **1 must come from a genre outside the user's selected interests** (still from the trusted sources above), so they keep learning something new. The other 9 come from within their interests, weighted by the learned preference scores.

---

## 7. Data model (Supabase)

Use Supabase **Auth** for accounts and **Row Level Security (RLS)** so every user can only read/write their own rows.

**`profiles`** (one row per user)
- `user_id` (FK to auth user)
- `interests` (array/JSON of chosen genres)
- `created_at`

**`blocklist`** (the sites each user wants gated)
- `id`, `user_id`
- `domain` (e.g., `instagram.com`)
- `created_at`

**`reading_log`** (the main table — one row per completed article)
- `id`, `user_id`
- `article_title`
- `article_url`
- `source` (BBC, NPR, Guardian, Yahoo…)
- `genre`
- `summary_text`
- `quality_rating` (1–5)
- `preference_rating` (1–5)
- `created_at`

**`impulse_log`** (one row every time the gate is triggered — powers the impulse counter)
- `id`, `user_id`
- `domain` (which blocked site they tried to open)
- `completed` (bool — did they meet their reading goal, or bail out?)
- `outcome` (text, nullable — what they did *after* meeting the goal: `kept_reading`, `closed` (left without going to the site), or `went_to_site`; `null` when the gate was never completed. Powers the "Resisting the impulse" chart, which counts only completed gates.)
- `created_at`

> Note: an "impulse" = **every gate trigger**, including times the user hit the gate and closed the tab without reading. That's deliberate — the times they bailed are some of the most telling. This is why impulses live in their own table and are NOT derived from `reading_log` (which only records completed articles).

**`article_pool`** (optional cache of fetched-but-unread articles, for instant gate loads)
- `id`, `user_id` (or global), `title`, `url`, `source`, `genre`, `blurb`, `fetched_at`, `served` (bool)

The reading history, genre breakdowns, and article-count charts derive from `reading_log`; the impulse counter and its weekly history derive from `impulse_log`.

> **This schema is the shared contract.** Every other layer (extension, content pipeline, recommender, dashboard) reads or writes these tables. Build and freeze it first — see Section 10.

---

## 8. The dashboard (web app)

A deployed website, login-gated, showing the logged-in user's data.

### Layout / information architecture

Three top-level pages (three distinct modes: **monitor**, **browse**, **configure**), plus one drill-in route. Do NOT put everything on one long scroll — the searchable archive and the glance-stats are different jobs.

**Page 1 — Overview (home / landing):** the "how am I doing" glance.
- **Stat cards (top row):** Impulse counter (this week) + current streak.
- **Article-count combo chart** (see below).
- **Genre distribution** (which topics they've read most).
- **Doomscroll heatmap** (hour × day-of-week — when the gate fires most).
- **Serendipity tracker** (how they rated the 1-in-10 "outside your interests" articles).
- **Source scorecard** (which sources they rate highest on quality + interest).

> If Overview ever feels crowded, split the bottom three (heatmap, serendipity, scorecard) into a separate **Insights** tab. Not needed for v1.

**Page 2 — Library (reading history):** the full, **searchable and filterable** archive — every article as a **clickable title-link**, with the user's summary, both ratings, genre, source, and date. Filter by genre/source/rating; search summary text. This is the user's growing personal knowledge base, so it gets its own page (it's browse/search-heavy and grows large).

**Page 3 — Settings:** manage the blocklist (add/remove sites) and edit interests. These feed both the extension and the recommender.

**Drill-in — Impulse history** (reached by clicking the Impulse counter on Overview): full history of weekly impulse counts since the user started, bucketed by week.

### Charts (implementation detail)

**Article-count combo chart (Bar + Line) — dual-axis, on purpose:**
- **Bars** = incremental articles read **per period** (small numbers), read against the **left** Y-axis.
- **Line** = cumulative running total (monotonic — only goes up or flat), read against the **right** Y-axis.
- **Two axes are intentional.** The cumulative total climbs into the hundreds while a single period is a handful; on one shared axis the bars would be squashed to nothing. This is the standard incremental-plus-cumulative pattern (same idea as a Pareto chart), and because both series are the same underlying data (the line is just the running sum of the bars), the dual axis is not misleading.
- **Period toggle:** Week / Month / Year — re-buckets both series together.
- This single chart replaces what were originally two separate items ("cumulative count" and "progress over time") — they were two views of the same data.
- **Recharts:** use `ComposedChart` with a `<Bar yAxisId="left">` and a `<Line yAxisId="right">`, plus two `<YAxis>` elements (`yAxisId="left"` and `yAxisId="right" orientation="right"`). Drive the Week/Month/Year toggle from React state that swaps the bucketed dataset.

**Genre distribution — horizontal bar, single hue, sorted:**
- A horizontal bar chart (not a pie): with six-plus genres and long names like "Technology," bars stay readable where pie slices get fiddly. It's a simple "who's biggest" magnitude comparison, sorted descending, one color.
- **Recharts:** `BarChart` with `layout="vertical"` (category on the Y-axis), one `<Bar>` series.

**Doomscroll heatmap, Serendipity tracker, Source scorecard:** all derived from `reading_log` + `impulse_log`.

### Impulse counter behavior
- Shows the **current week's** impulse count on Overview (every gate trigger counts — see `impulse_log`).
- **Clickable** → opens the Impulse history drill-in: all weekly impulse counts since day one.

---

## 9. Recommended tech stack (chosen for a non-technical builder)

- **Extension:** Chrome / Manifest V3, plain JavaScript or TypeScript. (Works on Chrome, Edge, Brave. Firefox can come later.)
- **Dashboard:** React + **Recharts** (charts) + the Supabase JS client, deployed on **Vercel** or **Netlify** (free tier).
- **Backend:** **Supabase** — Postgres database, built-in Auth, and Row Level Security. Free tier is plenty to start.
- **Content:** direct RSS parsing (BBC, NPR, Yahoo) + Guardian Open Platform API (free key). All free, no localhost/production restrictions.

Everything above has a generous free tier — expected running cost for the MVP is **$0**.

---

## 10. Build strategy — Claude Code & subagents

This project has multiple layers, but the layers are **tightly coupled through one shared schema** (Section 7) and much of the work is **sequential** (everything depends on the schema existing first). That shape favors a mostly single-session build, with subagents used **tactically, not structurally**. Do not spin up a large team of parallel agents mirroring the architecture — for a coupled MVP this adds coordination overhead and drift without buying much.

**Core rules**
- **Freeze the schema first.** Build the Supabase tables + RLS before anything else, in the main session. It's the contract every other layer depends on.
- **This spec is the single source of truth.** A subagent starts with a fresh, empty context — the only thing it knows is what you hand it. Always point each subagent at this file so they don't drift from the schema or the rules.
- **The design system lives in `DESIGN.md`.** Just as the schema is the data contract, `DESIGN.md` — produced by the ui-ux-designer agent from your reference images — is the visual contract. Produce it early and have every UI step follow it, so the extension and dashboard share one look. Keep styling token-based from the start so a theme switcher can be added later without a rewrite.
- **Build mostly sequentially**, following Section 11. Keep tightly coupled changes in one context window; don't have two agents edit the same files in parallel.

**Subagents worth using here** (keep it to ~2–4; ready-to-use definitions in Appendix A):
- **Code reviewer** (reviews, then applies fixes) — the single highest-value agent. Run it on each layer before committing.
- **Supabase engineer** — a one-pass specialist to build the schema + RLS cleanly (via the Supabase MCP), then done.
- **UI/UX designer** — captures your desired look from reference images, writes the `DESIGN.md` design system both surfaces follow, and implements the styling. See Appendix A for how to feed it examples.
- **Dashboard reviewer (Playwright)** — tests the dashboard's pages in a browser, then fixes the functional/rendering bugs it finds. Note it can't meaningfully test the extension.

**Skip for an MVP this size** (these come from multi-agent tutorials built to show off the toolkit, not because a small app needs them):
- A UI-component-generation *command loop* (a slash-command that spins up a new component and auto-reviews it every time) — pays off at dozens of components; you have three pages plus a drill-in. Note: a single design-system agent is worth it and is included above — that per-component factory is the part to skip, not the design agent itself.
- A full 80–90% automated test suite — nice later, beyond MVP.
- A project-manager orchestrator (e.g., ClickUp MCP auto-assigning tasks to agents) — that's for managing a backlog across a team of agents; overkill solo.

**About the "subagents save tokens" claim:** the real benefit is **context isolation** — a subagent does noisy work (big file reads, searches) in its own window and returns only a summary, keeping your main thread lean over a long session. It is **not** a per-fix discount: a fresh subagent often has to re-read files your main session already had loaded, so for a small one-off fix the startup overhead usually costs *more*. Reach for a subagent when the isolated work is big or noisy — or when your main session is already hours deep and bloated — not to shave tokens off a two-line change.

---

## 11. MVP scope vs. later

**In the MVP**
- Signup/login, onboarding (interests + blocklist).
- Extension gate with 70-word + dual-rating enforcement, "fresh article every open," 30s grace.
- RSS/Guardian content with genre-from-section labeling and the 9:1 serendipity rule.
- Dashboard: 3-page layout (Overview / Library / Settings) + Impulse-history drill-in.
- Dashboard features: impulse counter (weekly, clickable), article-count combo chart (week/month/year), genre distribution, searchable reading library, serendipity tracker, doomscroll heatmap, streaks, source scorecard.
- AI/MCP exemption via profile separation.

**Deliberately deferred**
- Ratings-over-time chart (does personalization improve what you're served).
- LLM validation that the summary actually reflects the article.
- Mobile / phone-app blocking (much harder; needs native iOS/Android).
- Firefox/Safari builds.
- User-selectable **theme switcher** (e.g., liquid glass / fuzzy / minimal). Cheap to add later *if* MVP styling is token-based from the start — see the note in the ui-ux-designer definition (Appendix A).
- CSV/Notion export, weekly digest email, social features.

---

## 12. Suggested build order (for Claude Code)

Build in this sequence so each step is testable before the next. Run the **code-reviewer** subagent at the end of each step before committing. Before the UI steps (2, 4, 6), have the **ui-ux-designer** agent turn your reference images into `DESIGN.md`, then build each UI against it.

1. **Supabase (schema first — the contract):** create the project, enable Auth, create the tables in Section 7, turn on Row Level Security. Consider the **supabase-engineer** subagent for this pass.
2. **Dashboard shell:** login/signup working; can read and write test rows to `reading_log`.
3. **Content fetching:** a script/service that pulls from BBC + NPR RSS and the Guardian API, tags genre from the source section, and stores unread articles.
4. **Extension gate:** intercept blocked domains from the user's blocklist, render the gate UI, enforce 70 words + both ratings, log every trigger to `impulse_log`, save completed reads to `reading_log`, and apply the focus-based "unlock this visit only" rule with the 30s grace.
5. **Recommender:** wire in interest filtering, the learned per-genre weighting, and the 1-in-10 outside-interest rule.
6. **Dashboard pages & charts:** Overview (impulse counter + streak, combo chart, genre distribution, heatmap, serendipity, source scorecard), Library (searchable history), and the Impulse-history drill-in. Review with the **dashboard-reviewer** subagent.
7. **Settings:** blocklist + interests management.
8. **AI exemption:** document/set up the separate un-gated profile for MCP/automation use.

---

## 13. Open items to confirm with the product owner

1. Whether to add the optional 20-min max-session cap in Section 3 (grace period is set at 30s).
2. Accept Yahoo feeds as best-effort with the BBC/Guardian fallback (Section 5), or drop Yahoo if reliability isn't good enough.
3. Final onboarding interest list (Section 6) — must match what the chosen feeds can actually supply.

---

## Appendix A — Ready-to-use subagent definitions

Drop each of these into `.claude/agents/` in your project (one `.md` file each). The `description` field is the **trigger** Claude Code matches against — keep it specific. `tools` scopes what the agent can touch. These are starting templates; tune the prompts as you go, and always tell the agent to read this spec first. All four can implement (write code) in their own domain, so you don't have to drop back to the main session — but the two reviewers (code-reviewer, dashboard-reviewer) are set to **report first, then fix**, so you always see the review before anything changes.

### `.claude/agents/code-reviewer.md`
```markdown
---
name: code-reviewer
description: Use PROACTIVELY before any commit. Reviews changed code for correctness, security, performance, and consistency with the build spec, then applies the fixes it recommends.
tools: Read, Grep, Glob, Edit, Write, Bash
---
You are a senior code reviewer for a browser-extension + React/Supabase project.
First read the build spec (reading-gate-build-spec.md) so your review matches the
intended design, data model, and rules.

When invoked:
1. Look at the diff / recently changed files.
2. Check: correctness, security (auth, RLS, input handling, no secrets in client
   code), performance, and whether the change matches the spec's schema and rules.
3. FIRST return a concise, priority-ranked list of issues with the exact file/line
   and the fix — this review report must always come before any edit.
4. THEN apply the fixes. Because you both review and fix, hold yourself to a higher
   bar: don't wave through your own changes, and re-check after editing. Be direct
   and critical, not agreeable.
```

### `.claude/agents/supabase-engineer.md`
```markdown
---
name: supabase-engineer
description: Use for building or changing the Supabase schema, tables, and Row Level Security for this project. One focused pass, then hand back.
tools: Read, Write, Edit, Bash
---
You are a Supabase/Postgres engineer. Read the build spec
(reading-gate-build-spec.md) Section 7 and treat it as the contract.

Build exactly the tables described (profiles, blocklist, reading_log, impulse_log,
article_pool), with sensible types, primary/foreign keys, and Row Level Security so
each user can only read/write their own rows. Enable Supabase Auth. Produce the SQL
(or migrations), explain any choices that deviate from the spec, and stop. Do not
build frontend or extension code.
```

### `.claude/agents/dashboard-reviewer.md`
```markdown
---
name: dashboard-reviewer
description: Use to test the React dashboard in a browser — pages, charts, and flows. Takes screenshots, reports issues, then fixes the functional/rendering bugs it finds. Dashboard only (cannot test the extension).
tools: Read, Edit, Write, Bash
---
You are a UI/UX reviewer using browser automation (Playwright MCP). Read the build
spec (reading-gate-build-spec.md) Section 8 for the intended layout and charts.

Open the running dashboard, walk the three pages (Overview, Library, Settings) and
the Impulse-history drill-in, and verify: the combo chart's bars + cumulative line
render with the Week/Month/Year toggle; the genre bar chart; search/filter on the
Library; and clickable article links. Take screenshots and return concise,
prioritized feedback on visual design, usability, and accessibility. Report findings
FIRST, then fix the functional and rendering bugs you found. Leave visual-identity
decisions to the ui-ux-designer + DESIGN.md, and don't edit the same files it's
editing in the same pass.
```

> Note on Playwright: to use the dashboard-reviewer you'll add the Playwright MCP so the agent can drive a real browser. If you skip that for now, the code-reviewer alone still covers most of the value.

### `.claude/agents/ui-ux-designer.md`
```markdown
---
name: ui-ux-designer
description: Use to define and guard the visual design of the dashboard and extension. Reads reference images of "good" design from the design-references/ folder and produces/maintains DESIGN.md (colors, type, spacing, components, chart palette). Also reviews UI implementations against DESIGN.md. Use before building any UI, and whenever the look should change.
tools: Read, Write, Edit, Bash
---
You are a product designer setting the visual identity for a browser-extension +
React/Supabase project. Read the build spec (reading-gate-build-spec.md), especially
Section 8 (dashboard) and Sections 2–3 (the extension gate screen).

Inputs: reference images the owner drops in the design-references/ folder (screenshots
of apps or sites they like). Read those image files and extract the aesthetic — color
palette, typography, spacing/density, corner radius, component styling, overall mood.

Your durable output is DESIGN.md — a written design system that:
- Defines tokens: color palette (including the chart palette for Recharts), font
  choices, type scale, spacing scale, border radius, and light/dark handling.
- Specifies the key components for BOTH surfaces, one consistent identity across them:
  - Extension gate screen: article card (headline + blurb + "Read on source"),
    summary textarea with a live 70-word counter, quality + interest rating controls,
    submit button, and locked/disabled states.
  - Dashboard: stat cards, the combo + genre charts, the Library list/rows, search and
    filters, settings controls, and nav.

Keep all styling **token-based** — components reference the design tokens, never
hardcoded colors or sizes. The MVP ships a single theme, but building it token-based
means a future theme switcher (e.g., liquid glass / fuzzy / minimal) is just added
token sets plus a toggle, not a UI rewrite.

You both DEFINE and IMPLEMENT. When the owner asks for a visual change (e.g., from a
new reference image): update DESIGN.md first, then apply the matching CSS/component
changes in the code so the running UI reflects it, run the dev build to confirm it
renders, and finish with a short summary of what you changed. When asked only to
review, compare the implemented UI against DESIGN.md and return prioritized fixes.
```

**How to feed it examples (non-technical steps):** create a folder called `design-references/` in your project and drop screenshots into it — images of apps, sites, or dashboards whose look you like. Then tell the agent something like: "review the images in `design-references/` and write `DESIGN.md`." Claude Code can read image files directly, so it will look at your examples and distill them into the design system. From then on, every UI step reads `DESIGN.md`, not the images — that's what keeps the extension and dashboard consistent even in later sessions.

> Division of labor (all four can now edit code): the **ui-ux-designer** owns the visual identity (`DESIGN.md`) and implements styling; the **dashboard-reviewer** runs the live app and fixes functional/rendering bugs; the **code-reviewer** reviews-then-fixes correctness/security; the **supabase-engineer** owns schema. Keep them out of each other's files in the same pass — two agents editing one file at once is a recipe for conflict. That's 4 agents total — a sensible ceiling; more than this tends to reduce your own productivity, so stop here.

---

## Changelog (this rebuild)
- Grace period set to **30 seconds** (Section 3).
- Added **`impulse_log`** table + the "every gate trigger counts" rule (Section 7).
- Rewrote the **dashboard** with the 3-page layout, chosen features, and clickable weekly impulse counter (Section 8).
- Added **chart implementation detail**: dual-axis combo chart rationale + Recharts `ComposedChart`, and genre as a horizontal single-hue bar (Section 8).
- Merged the old "cumulative count" and "progress over time" into the single combo chart.
- Added **Section 10 — Build strategy** (schema-as-contract, mostly-sequential build, tactical subagents, the token/context-isolation nuance).
- Added **Appendix A** — ready-to-use `code-reviewer`, `supabase-engineer`, and `dashboard-reviewer` subagent definitions.
- Added a **ui-ux-designer** subagent + `DESIGN.md` visual contract: feed it reference images of "good" design (in `design-references/`) and it produces one design system the extension and dashboard both follow (Appendix A; Sections 10 & 12).
- Made all four subagents **implementers** so you never have to hop to the main session: ui-ux-designer and supabase-engineer write code in their domain; code-reviewer and dashboard-reviewer **report first, then fix** (preserving a visible review before any edit).
- Deferred a **theme switcher** to post-MVP, with a token-based-styling rule now (Appendix A + Section 10) so themes can drop in later without a rewrite.
