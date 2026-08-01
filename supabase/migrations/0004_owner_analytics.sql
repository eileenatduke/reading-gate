-- ---------------------------------------------------------------------------
-- Owner analytics — cross-user aggregate views for the app owner (not end users)
-- Run in the Supabase SQL editor after 0001–0003, or via `supabase db push`.
--
-- WHY A SEPARATE SCHEMA, NOT public:
--   Every public table is per-user via RLS (Spec §7), and the extension + dashboard
--   talk to Supabase with the PUBLIC ANON KEY. Any owner-wide roll-up therefore has
--   to see across users, which means bypassing RLS — and the service_role key that
--   does so must NEVER ship in client code (README warns on this). So these views
--   live in a dedicated `analytics` schema that is:
--     * NOT in Supabase's exposed schema list -> PostgREST (anon/authenticated, i.e.
--       the extension + dashboard) cannot reach it at all; and
--     * granted to `service_role` only (defense in depth).
--   Read them from the SQL editor (runs as superuser) or a trusted server holding the
--   service_role key. Nothing here is reachable by an ordinary logged-in user.
--
-- The views own-privilege (default security_invoker = off), so they aggregate ALL
-- rows regardless of RLS. Definitions mirror the dashboard's own metric semantics
-- (dashboard/src/lib/data.js) so an owner number lines up with what a user sees.
--
-- NOTE on quality_rating: it was retired from the gate UI and is now always written
-- as a neutral 3 (extension/src/gate/gate.js), so it carries no signal and is
-- deliberately excluded everywhere below. The live interest signal is
-- preference_rating from the 👎/👍/🔥 "teach your feed" reaction (1 / 4 / 5).
-- ---------------------------------------------------------------------------

create schema if not exists analytics;

-- Lock the schema itself down before anything is created inside it.
revoke all on schema analytics from anon, authenticated, public;
grant usage on schema analytics to service_role;

-- ---------------------------------------------------------------------------
-- owner_overview — the single-row headline. `select * from analytics.owner_overview;`
-- answers "how many articles have my active users read", plus the gate's core
-- impulse-resistance story, in one row.
-- ---------------------------------------------------------------------------
create or replace view analytics.owner_overview as
with r as (
  select
    count(*)                                                    as total_articles_read,
    count(distinct user_id)                                     as readers,
    count(distinct user_id) filter
      (where created_at >= now() - interval '7 days')           as active_readers_7d,
    count(distinct user_id) filter
      (where created_at >= now() - interval '30 days')          as active_readers_30d,
    -- whitespace-split word count of the ≥70-word summaries (approximate).
    coalesce(sum(array_length(
      regexp_split_to_array(btrim(summary_text), '\s+'), 1)), 0) as total_summary_words,
    count(*) filter (where is_serendipity)                      as serendipity_reads,
    min(created_at)                                             as first_read_at,
    max(created_at)                                             as last_read_at
  from public.reading_log
),
i as (
  select
    count(*)                                                    as gate_triggers,
    count(*) filter (where completed)                           as gates_completed,
    count(*) filter (where outcome = 'went_to_site')            as went_to_site,
    count(*) filter (where outcome in ('kept_reading','closed')) as resisted
  from public.impulse_log
),
u as (select count(*) as total_users from public.profiles)
select
  u.total_users,                                          -- everyone who ever signed up
  r.readers,                                              -- distinct users with >=1 read
  r.active_readers_7d,
  r.active_readers_30d,
  r.total_articles_read,                                  -- the headline number
  round(r.total_articles_read::numeric
        / nullif(r.readers, 0), 1)                        as avg_articles_per_reader,
  r.total_summary_words,
  r.serendipity_reads,
  i.gate_triggers,                                        -- every gate that fired
  i.gates_completed,
  round(100.0 * i.gates_completed
        / nullif(i.gate_triggers, 0), 1)                  as completion_rate_pct,
  i.went_to_site,                                         -- caved to the distracting site
  i.resisted,                                             -- met the goal, didn't go to site
  round(100.0 * i.resisted
        / nullif(i.went_to_site + i.resisted, 0), 1)      as resist_rate_pct,
  r.first_read_at,
  r.last_read_at
from u cross join r cross join i;

-- ---------------------------------------------------------------------------
-- user_metrics — one row per user, most-read first. The itemized breakdown of
-- who your active users are and how they engage. Users who signed up but never
-- read still appear (zeros), so you can see activation too.
-- ---------------------------------------------------------------------------
create or replace view analytics.user_metrics as
with reads as (
  select
    user_id,
    count(*)                                             as articles_read,
    min(created_at)                                      as first_read_at,
    max(created_at)                                      as last_read_at,
    count(distinct (created_at at time zone 'utc')::date) as active_days,
    count(*) filter (where is_serendipity)               as serendipity_reads,
    round(avg(preference_rating)::numeric, 2)            as avg_interest,
    count(*) filter (where preference_rating = 5)        as fire_reads,   -- 🔥 more like this
    count(*) filter (where preference_rating = 4)        as up_reads,     -- 👍 good
    count(*) filter (where preference_rating = 1)        as down_reads,   -- 👎 not for me
    round(avg(array_length(
      regexp_split_to_array(btrim(summary_text), '\s+'), 1))::numeric, 0) as avg_summary_words
  from public.reading_log
  group by user_id
),
imp as (
  select
    user_id,
    count(*)                                             as gate_triggers,
    count(*) filter (where completed)                    as gates_completed,
    count(*) filter (where outcome = 'went_to_site')     as went_to_site,
    count(*) filter (where outcome in ('kept_reading','closed')) as resisted
  from public.impulse_log
  group by user_id
),
-- Current streak: consecutive UTC days (ending today or yesterday) with >=1 read,
-- via gaps-and-islands. Mirrors the dashboard's currentStreak(); the app measures
-- the VIEWER'S LOCAL day, so a user reading near midnight can differ by one here.
day_set as (
  select distinct user_id, (created_at at time zone 'utc')::date as d
  from public.reading_log
),
islands as (
  select
    user_id, d,
    d - (row_number() over (partition by user_id order by d))::int as grp
  from day_set
),
island_agg as (
  select user_id, count(*) as len, max(d) as last_d
  from islands
  group by user_id, grp
),
streaks as (
  select user_id, len as current_streak
  from island_agg
  where last_d >= (now() at time zone 'utc')::date - 1
),
bl as (
  select user_id, count(*) as blocklist_size
  from public.blocklist
  group by user_id
),
prof as (
  select
    user_id,
    created_at                                as signed_up_at,
    coalesce(array_length(interests, 1), 0)   as interests_count,
    coalesce(jsonb_array_length(custom_feeds), 0) as custom_feeds_count,
    grace_secs
  from public.profiles
)
select
  prof.user_id,
  prof.signed_up_at,
  coalesce(reads.articles_read, 0)            as articles_read,
  reads.first_read_at,
  reads.last_read_at,
  case when reads.last_read_at is not null
       then (extract(epoch from (now() - reads.last_read_at)) / 86400)::int
  end                                         as days_since_last_read,
  coalesce(reads.active_days, 0)              as active_days,
  coalesce(streaks.current_streak, 0)         as current_streak,
  reads.avg_interest,
  coalesce(reads.fire_reads, 0)               as fire_reads,
  coalesce(reads.up_reads, 0)                 as up_reads,
  coalesce(reads.down_reads, 0)               as down_reads,
  coalesce(reads.serendipity_reads, 0)        as serendipity_reads,
  coalesce(reads.avg_summary_words, 0)        as avg_summary_words,
  coalesce(imp.gate_triggers, 0)              as gate_triggers,
  coalesce(imp.gates_completed, 0)            as gates_completed,
  round(100.0 * imp.gates_completed
        / nullif(imp.gate_triggers, 0), 1)    as completion_rate_pct,
  coalesce(imp.went_to_site, 0)               as went_to_site,
  coalesce(imp.resisted, 0)                   as resisted,
  round(100.0 * imp.resisted
        / nullif(imp.went_to_site + imp.resisted, 0), 1) as resist_rate_pct,
  coalesce(bl.blocklist_size, 0)              as blocklist_size,
  prof.interests_count,
  prof.custom_feeds_count,
  prof.grace_secs
from prof
left join reads   on reads.user_id   = prof.user_id
left join imp     on imp.user_id     = prof.user_id
left join streaks on streaks.user_id = prof.user_id
left join bl      on bl.user_id      = prof.user_id
order by articles_read desc, prof.signed_up_at;

-- ---------------------------------------------------------------------------
-- daily_activity — a day-by-day time series (UTC) for growth / engagement charts.
-- Full-joins reads and gate triggers so a day with only one of them still shows.
-- ---------------------------------------------------------------------------
create or replace view analytics.daily_activity as
with d as (
  select
    (created_at at time zone 'utc')::date as day,
    count(*)                              as articles_read,
    count(distinct user_id)               as active_readers,
    count(*) filter (where is_serendipity) as serendipity_reads
  from public.reading_log
  group by 1
),
g as (
  select
    (created_at at time zone 'utc')::date as day,
    count(*)                              as gate_triggers,
    count(*) filter (where completed)     as gates_completed,
    count(*) filter (where outcome = 'went_to_site') as went_to_site
  from public.impulse_log
  group by 1
)
select
  coalesce(d.day, g.day)               as day,
  coalesce(d.active_readers, 0)        as active_readers,
  coalesce(d.articles_read, 0)         as articles_read,
  coalesce(d.serendipity_reads, 0)     as serendipity_reads,
  coalesce(g.gate_triggers, 0)         as gate_triggers,
  coalesce(g.gates_completed, 0)       as gates_completed,
  coalesce(g.went_to_site, 0)          as went_to_site
from d
full join g on d.day = g.day
order by day;

-- ---------------------------------------------------------------------------
-- domain_impulse — which blocked sites tempt your users most, and how often the
-- gate turns that impulse into a read instead of a site visit.
-- ---------------------------------------------------------------------------
create or replace view analytics.domain_impulse as
select
  domain,
  count(*)                                            as gate_triggers,
  count(distinct user_id)                             as users,
  count(*) filter (where completed)                   as gates_completed,
  count(*) filter (where outcome = 'went_to_site')    as went_to_site,
  count(*) filter (where outcome in ('kept_reading','closed')) as resisted,
  round(100.0 * count(*) filter (where completed)
        / nullif(count(*), 0), 1)                     as completion_rate_pct
from public.impulse_log
group by domain
order by gate_triggers desc;

-- ---------------------------------------------------------------------------
-- genre_popularity / source_popularity — what your users actually read, and how
-- much they liked it (avg interest = mean preference_rating on the 1/4/5 scale).
-- ---------------------------------------------------------------------------
create or replace view analytics.genre_popularity as
select
  genre,
  count(*)                                 as reads,
  count(distinct user_id)                  as readers,
  round(avg(preference_rating)::numeric, 2) as avg_interest,
  count(*) filter (where is_serendipity)   as serendipity_reads
from public.reading_log
group by genre
order by reads desc;

create or replace view analytics.source_popularity as
select
  source,
  count(*)                                 as reads,
  count(distinct user_id)                  as readers,
  round(avg(preference_rating)::numeric, 2) as avg_interest
from public.reading_log
group by source
order by reads desc;

-- ---------------------------------------------------------------------------
-- impulse_by_hour — the "doomscroll" heatmap aggregated across all users:
-- when (UTC day-of-week × hour) do gate triggers cluster, and how often they cave.
-- dow: 0 = Sunday … 6 = Saturday.
-- ---------------------------------------------------------------------------
create or replace view analytics.impulse_by_hour as
select
  extract(dow  from (created_at at time zone 'utc'))::int as dow,
  extract(hour from (created_at at time zone 'utc'))::int as hour_utc,
  count(*)                                          as gate_triggers,
  count(*) filter (where outcome = 'went_to_site')  as went_to_site
from public.impulse_log
group by 1, 2
order by 1, 2;

-- ---------------------------------------------------------------------------
-- Grants: service_role only, for every current and future object in the schema.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema analytics from anon, authenticated, public;
grant select on all tables in schema analytics to service_role;

alter default privileges in schema analytics
  grant select on tables to service_role;
alter default privileges in schema analytics
  revoke all on tables from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Optional: to identify a user_id by email, join auth.users in the SQL editor.
-- Email is PII, so it is intentionally NOT baked into the views above:
--   select um.*, au.email
--   from analytics.user_metrics um
--   join auth.users au on au.id = um.user_id
--   order by um.articles_read desc;
-- ---------------------------------------------------------------------------
