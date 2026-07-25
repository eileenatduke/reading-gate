-- ---------------------------------------------------------------------------
-- impulse_log.outcome: what the user did AFTER meeting their reading goal.
--
-- The "kept reading vs. went to site" chart needs to separate the two impulse-
-- resisting outcomes from actually caving to the distracting site. `completed`
-- alone can't express this: it only records whether the minimum reading goal was
-- met, not what the user chose once the "keep reading / access site" screen showed.
--
--   NULL           -> gate not completed (failed / didn't finish), or a legacy row
--                     written before this column existed
--   'closed'       -> met the goal, then left without choosing         (resisted)
--   'kept_reading' -> met the goal, chose to read more articles        (resisted)
--   'went_to_site' -> met the goal, then clicked through to the site   (indulged)
--
-- `completed` keeps its meaning ("met the minimum reading goal") and is unchanged,
-- so the Impulse history page's completion-rate metrics are unaffected. The chart
-- counts only rows that reached a definite outcome; the denominator is "times you
-- met your reading goal", and failed gates drop out entirely.
-- ---------------------------------------------------------------------------
alter table public.impulse_log
  add column if not exists outcome text
    check (outcome is null or outcome in ('closed', 'kept_reading', 'went_to_site'));
