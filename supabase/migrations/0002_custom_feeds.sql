-- Reading Gate — user-supplied RSS sources (custom feeds)
-- Run this in the Supabase SQL editor after 0001_init.sql, or via `supabase db push`.
--
-- Lets a user add their own news sources beyond the built-in catalog — e.g. a
-- publication they subscribe to (New York Times, WSJ, a niche blog). We only ever
-- store the feed URL and a display name; the gate fetches the RSS just like any
-- built-in source and links out to the article on the publisher's site, so a
-- subscriber stays logged in and reads the full piece there.
--
-- Shape: jsonb array of { "name": text, "url": text }, e.g.
--   [{"name":"New York Times","url":"https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"}]

alter table public.profiles
  add column if not exists custom_feeds jsonb not null default '[]'::jsonb;
