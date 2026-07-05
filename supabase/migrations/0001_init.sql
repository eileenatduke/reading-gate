-- Read First / Reading Gate — initial schema (the shared contract, Spec §7)
-- Run this in the Supabase SQL editor, or via `supabase db push`.
--
-- Every table is scoped per-user via Row Level Security so a user can only
-- read/write their own rows. Auth is Supabase Auth (auth.users).

-- ---------------------------------------------------------------------------
-- profiles: one row per user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  interests   text[] not null default '{}',   -- chosen genres, e.g. {Technology,Science}
  grace_secs  integer not null default 30,     -- re-gate grace period (Spec §3)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- blocklist: the domains each user wants gated
-- ---------------------------------------------------------------------------
create table if not exists public.blocklist (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  domain      text not null,                    -- e.g. instagram.com (bare host)
  created_at  timestamptz not null default now(),
  unique (user_id, domain)
);
create index if not exists blocklist_user_idx on public.blocklist (user_id);

-- ---------------------------------------------------------------------------
-- reading_log: one row per COMPLETED article (summary + both ratings)
-- ---------------------------------------------------------------------------
create table if not exists public.reading_log (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  article_title     text not null,
  article_url       text not null,
  source            text not null,              -- BBC, NPR, Guardian, Yahoo...
  genre             text not null,
  summary_text      text not null,
  quality_rating    smallint not null check (quality_rating between 1 and 5),
  preference_rating smallint not null check (preference_rating between 1 and 5),
  is_serendipity    boolean not null default false, -- the 1-in-10 outside-interest pick
  created_at        timestamptz not null default now()
);
create index if not exists reading_log_user_idx on public.reading_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- impulse_log: one row EVERY time the gate is triggered (completed or bailed)
-- Not derived from reading_log — the bail-outs are the point (Spec §7 note).
-- ---------------------------------------------------------------------------
create table if not exists public.impulse_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  domain      text not null,                    -- which blocked site they tried
  completed   boolean not null default false,   -- did they finish, or bail out?
  created_at  timestamptz not null default now()
);
create index if not exists impulse_log_user_idx on public.impulse_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- article_pool: cache of fetched-but-unread articles for instant gate loads
-- Scoped per-user so the recommender can pre-weight each user's pool.
-- ---------------------------------------------------------------------------
create table if not exists public.article_pool (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  url         text not null,
  source      text not null,
  genre       text not null,
  blurb       text,
  fetched_at  timestamptz not null default now(),
  served      boolean not null default false,
  unique (user_id, url)                          -- de-dup by URL per user
);
create index if not exists article_pool_user_idx
  on public.article_pool (user_id, served, genre);

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh on profiles
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security: each user only sees their own rows
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.blocklist    enable row level security;
alter table public.reading_log  enable row level security;
alter table public.impulse_log  enable row level security;
alter table public.article_pool enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = user_id);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = user_id);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- blocklist
drop policy if exists blocklist_all on public.blocklist;
create policy blocklist_all on public.blocklist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reading_log
drop policy if exists reading_log_all on public.reading_log;
create policy reading_log_all on public.reading_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- impulse_log
drop policy if exists impulse_log_all on public.impulse_log;
create policy impulse_log_all on public.impulse_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- article_pool
drop policy if exists article_pool_all on public.article_pool;
create policy article_pool_all on public.article_pool
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
