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
