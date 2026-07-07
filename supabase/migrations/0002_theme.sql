-- Add a per-user theme preference so the dashboard and the extension gate share
-- the same look. Run this in the Supabase SQL editor after 0001_init.sql.
alter table public.profiles
  add column if not exists theme text not null default 'glassPurple';
