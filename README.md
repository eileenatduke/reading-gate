# Reading Gate

Make yourself read and summarize a news article before a distracting site
(Instagram, TikTok, YouTube…) unlocks — then track everything you've read in a web
dashboard.

Two pieces of software share **one Supabase backend**:

- **`extension/`** — a Manifest V3 browser extension (the "gate"). It intercepts
  blocked sites, shows a fresh article, and refuses to unlock until you've written a
  ≥70-word summary and given two ratings. It *writes* reading records.
- **`dashboard/`** — a React + Recharts web app that *reads* your history and shows
  progress charts.

They never talk to each other directly — only to Supabase. See
[`reading-gate-build-spec.md`](reading-gate-build-spec.md) for the full spec, and
[`DESIGN.md`](DESIGN.md) for the shared visual system.

```
reading-gate/
├── supabase/migrations/   # the schema + RLS — the shared contract (build first)
├── extension/             # MV3 gate: content pipeline, recommender, gate UI
├── dashboard/             # React dashboard (Overview / Library / Settings + drill-in)
├── docs/AI-EXEMPTION.md   # how AI/MCP stays un-gated (profile separation)
└── DESIGN.md              # token-based visual contract both surfaces follow
```

## Setup

### 1. Supabase (the contract — do this first)
1. Create a free project at [supabase.com](https://supabase.com).
2. **Auth** is on by default. For the quickest local testing, you can disable email
   confirmation (Authentication → Providers → Email → *Confirm email* off) so signup
   returns a session immediately.
3. Open the **SQL editor** and run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This
   creates all five tables (`profiles`, `blocklist`, `reading_log`, `impulse_log`,
   `article_pool`), the auto-profile trigger, and Row Level Security.
4. From **Project Settings → API**, copy your **Project URL** and **anon public key**.

> The anon key is a *public* key — safe to ship in client code. RLS is what actually
> isolates each user's data. Never put the `service_role` key in the extension or
> dashboard.

### 2. Dashboard
```bash
cd dashboard
cp .env.example .env.local        # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev                        # http://localhost:5173
```
Deploy to Vercel or Netlify (free tier). Set the same two env vars in the host's
project settings. SPA routing rewrites are already configured
(`vercel.json` / `public/_redirects`).

**Public pages & auth.** The site opens on a marketing **landing hero** (`/`) with
one fixed dark theme. **Download Now** links to the extension (set
`VITE_EXTENSION_URL` to your Chrome Web Store listing), **About** (`/about`) is a
live placeholder awaiting copy, and **Log in / Sign up** (`/login`) uses
**email + password**. Once signed in, the dashboard loads — new users default to
the **Mono (black & white)** theme and can pick any theme in **Settings**.

> Auth is email/password only (both the dashboard and the extension). Social
> sign-in (Google/Outlook) can be added later by enabling the matching provider
> in Supabase and wiring the button back in — it's config plus a small UI change.

### 3. Extension
1. Chrome/Edge/Brave → `chrome://extensions` → enable **Developer mode** → **Load
   unpacked** → select the `extension/` folder.
2. Click the extension → **Settings**, and paste your Supabase URL + anon key.
   (Optional: a free [Guardian Open Platform](https://open-platform.theguardian.com/)
   key — `test` works for light use.)
3. Back in the popup, **create an account / log in**.
4. In **Settings**, pick your **interests** and add sites to your **blocklist**
   (e.g. `instagram.com`). Optionally add **your own sources** — just paste the site
   address of any publication you follow (even a paywalled one you subscribe to, like
   `nytimes.com`); the extension finds its feed automatically, mixes its articles in,
   and you read them on the publisher's own site, so your subscription keeps working.
5. Open a blocked site → the gate appears with a fresh article. Read it, summarize
   (≥70 words), rate quality + interest, and submit to unlock **this visit only**.

### 4. AI / MCP exemption
Keep the extension only in your personal browser profile. Run automation in a
separate, extension-free profile — see [`docs/AI-EXEMPTION.md`](docs/AI-EXEMPTION.md).

## How the enforcement works (Spec §3)

- The gate fires when a blocked-domain tab becomes the **active foreground tab**
  without a valid unlock.
- Completing an article grants an unlock **valid only while you stay on that tab**.
- It's revoked on close, navigate-away, or losing focus for **> 30 seconds** (grace,
  configurable in Settings). Returning re-gates with a **fresh article** — closing the
  "open it once and leave it open all day" exploit.
- **Every** gate trigger is logged to `impulse_log` (completed or bailed) — the
  bail-outs are the point.

## The content system (Spec §5)
BBC + NPR RSS, the Guardian Open Platform API, and Yahoo (best-effort, with a
BBC/Guardian fallback so Tech/Finance never go empty). Genre is derived for free from
the feed/section. Only headline + blurb + a "Read on source" link-out — no full-text
scraping. Users can also add **their own sources** in Settings (stored on
`profiles.custom_feeds`) by pasting a homepage — the extension autodiscovers the RSS
feed (`<link rel="alternate">`, then common feed paths). Those are fetched alongside
the built-in catalog, tagged `My Sources`, and kept in normal rotation.

## Cost
Everything runs on free tiers. Expected MVP running cost: **$0**.
