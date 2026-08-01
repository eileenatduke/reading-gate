# supabase/

The **shared contract** (Spec §7). Build and freeze this before anything else — every
other layer (extension, content pipeline, recommender, dashboard) reads or writes
these tables.

## Apply the schema

**Fastest:** open the Supabase **SQL editor** and run
[`migrations/0001_init.sql`](migrations/0001_init.sql).

**With the CLI:**
```bash
supabase link --project-ref <your-ref>
supabase db push
```

## What it creates
- `profiles`, `blocklist`, `reading_log`, `impulse_log`, `article_pool`
- A trigger that auto-creates a `profiles` row on signup.
- **Row Level Security** on every table so each user can only read/write their own rows.

The `article_pool` is scoped per-user so the recommender can pre-weight each user's
queue. `impulse_log` is deliberately **not** derived from `reading_log` — it records
every gate trigger, including bail-outs.

## Owner analytics (cross-user, service-role only)

Migration [`0004_owner_analytics.sql`](migrations/0004_owner_analytics.sql) adds an
`analytics` schema of read-only aggregate **views** so you (the app owner) can see how
all your users are doing at once — something the per-user dashboard can't, by design.

**Why it's separate.** Every `public` table is per-user via RLS, and the extension +
dashboard use the **public anon key**. An owner-wide roll-up has to see across users,
which means bypassing RLS. So the views live in a dedicated `analytics` schema that is
**not** in Supabase's exposed schema list (PostgREST/the anon key can't reach it) and is
granted to **`service_role` only**. Never put the `service_role` key in the extension or
dashboard.

**How to read them.** Run the migration once (SQL editor or `supabase db push`), then in
the **SQL editor** (it runs privileged):

```sql
select * from analytics.owner_overview;          -- one-row headline (the big numbers)
select * from analytics.user_metrics;            -- one row per user, most-read first
select * from analytics.daily_activity;          -- day-by-day time series for charts
select * from analytics.domain_impulse;          -- which blocked sites tempt users most
select * from analytics.genre_popularity;        -- what genres get read + avg interest
select * from analytics.source_popularity;       -- same, by source
select * from analytics.impulse_by_hour;          -- doomscroll heatmap (UTC dow × hour)
```

| View | Answers |
| --- | --- |
| `owner_overview` | Total articles read, active readers (7d/30d), gate completion rate, resist rate |
| `user_metrics` | Per user: articles read, active days, current streak, days-since-last-read, interest reactions (🔥/👍/👎), completion & resist rate, blocklist size, custom feeds |
| `daily_activity` | Reads, active readers, gate triggers/completions per UTC day |
| `domain_impulse` | Per blocked domain: triggers, completions, went-to-site vs resisted |
| `genre_popularity` / `source_popularity` | Reads, distinct readers, average interest |
| `impulse_by_hour` | Gate triggers and cave-ins bucketed by UTC day-of-week × hour |

Notes: `quality_rating` is retired (the gate always writes a neutral `3`), so it's
excluded — the live interest signal is `preference_rating` (👎 = 1, 👍 = 4, 🔥 = 5).
Streaks/day-buckets use **UTC**, so they can differ by one from the dashboard's
local-day figure. To attach emails, join `auth.users` in the SQL editor
(`join auth.users au on au.id = user_id`) — email is PII and intentionally left out of
the views.
