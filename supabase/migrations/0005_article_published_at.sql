-- Reading Gate — article publication date (freshness / recency)
-- Run this in the Supabase SQL editor after 0004, or via `supabase db push`.
--
-- The pool now records WHEN each article was published (from the feed's <pubDate> /
-- Atom <published> / Guardian webPublicationDate), separate from fetched_at (when WE
-- pulled it). This lets the refill prune articles that have gone stale while sitting
-- unread — a time-sensitive piece is only useful for about a week; see maxAgeDays() in
-- extension/src/lib/feeds.js. Nullable: some feeds carry no date, and those are kept.

alter table public.article_pool
  add column if not exists published_at timestamptz;
