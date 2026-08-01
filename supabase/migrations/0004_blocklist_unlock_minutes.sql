-- Reading Gate — per-site unlock duration
-- Run this in the Supabase SQL editor after 0003_impulse_outcome.sql, or via `supabase db push`.
--
-- Each completed read now grants a TIMED, site-wide unlock instead of a tab-scoped one that
-- was revoked after ~30s of leaving the tab. This column stores how many minutes one unlock
-- keeps a given blocked site open before the gate returns, customizable per site — e.g. a
-- quick 5 minutes for Instagram, a longer 30 for YouTube. Users set it in the dashboard
-- (Settings → Blocked sites → Unlock time per site); the extension reads it when it fetches
-- the blocklist and enforces the countdown.

alter table public.blocklist
  add column if not exists unlock_minutes integer not null default 15;

-- Keep it sane: at least 1 minute, at most 8 hours.
alter table public.blocklist
  drop constraint if exists blocklist_unlock_minutes_range;
alter table public.blocklist
  add constraint blocklist_unlock_minutes_range
  check (unlock_minutes between 1 and 480);
