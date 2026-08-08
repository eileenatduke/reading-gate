// Recommender (Spec §6).
//
// - Cold start: user's chosen interest genres (from `profiles.interests`).
// - Steady state: running average of the Interest/Preference rating per genre;
//   bias selection toward highly-rated genres, but only within the interest set.
// - Serendipity rule: for every 10 served, exactly 1 comes from a genre OUTSIDE the
//   user's interests (still from trusted sources). The other 9 are weighted by the
//   learned preference scores.
//
// "Served" count is tracked via reading_log; the 10th, 20th, ... pick is serendipitous.

import { db, currentUser } from "./sb.js";
import { GENRES, MY_SOURCES_GENRE } from "./feeds.js";
import { refillPool } from "./content.js";

// Per-genre average of preference_rating from the user's reading history.
async function genreWeights(uid, interests) {
  const rows = await db("reading_log")
    .select("genre,preference_rating")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(500)
    .run();

  const sum = {}, n = {};
  for (const r of rows || []) {
    sum[r.genre] = (sum[r.genre] || 0) + r.preference_rating;
    n[r.genre] = (n[r.genre] || 0) + 1;
  }
  // Weight = avg preference (1..5), default 3 (neutral) for unrated interest genres.
  const weights = {};
  for (const g of interests) {
    weights[g] = n[g] ? sum[g] / n[g] : 3;
  }
  return weights;
}

function weightedPick(candidates, weights, rngSeed) {
  // Deterministic-ish weighted pick without Math.random (unavailable in SW-safe code
  // paths is fine here, but we keep it simple and reproducible per call via seed).
  const scored = candidates.map((c) => ({ c, w: Math.max(0.1, weights[c.genre] || 3) }));
  const total = scored.reduce((s, x) => s + x.w, 0);
  let r = ((rngSeed % 10000) / 10000) * total;
  for (const x of scored) {
    r -= x.w;
    if (r <= 0) return x.c;
  }
  return scored[scored.length - 1]?.c || null;
}

// Pick the next article for this user and return it — WITHOUT consuming it.
//
// Offering an article is not the same as reading it. Merely showing an article (initial
// load or a "Refresh article" skip) must NOT mark it `served`, or every refresh would
// permanently burn a pool row: the finite RSS/Guardian feeds run dry, refillPool can't
// find anything new, and the gate dead-ends on "No articles are ready yet" even though
// the reader read nothing. Consumption happens exactly once, when the reader completes a
// read — the gate calls markArticleServed() on submit. See gate.js.
//
// `excludeIds` are pool-row ids already offered during this gate session; we skip them so a
// refresh shows something different. If excluding them would leave no candidates (the reader
// has cycled through every unread article), we wrap around to the full unread pool rather
// than returning null — refresh can never dead-end while any unread article exists.
//
// Returns null only when the pool is genuinely empty even after a refill attempt.
export async function pickArticle(excludeIds = []) {
  const user = await currentUser();
  if (!user) return null;
  const uid = user.id;

  const profile = (await db("profiles").select("interests").eq("user_id", uid).run())?.[0];
  const chosen0 = profile?.interests?.length ? profile.interests : GENRES.slice();
  // The user's own added feeds are always in rotation — the user explicitly wanted
  // them, so treat "My Sources" as an interest rather than an outside-interest pick.
  const interests = [...chosen0, MY_SOURCES_GENRE];

  // Ensure the pool has something to serve.
  let pool = await db("article_pool").select("*").eq("user_id", uid).is("served", "false").run();
  if (!pool || pool.length === 0) {
    await refillPool();
    pool = await db("article_pool").select("*").eq("user_id", uid).is("served", "false").run();
  }
  if (!pool || pool.length === 0) return null;

  // Don't re-offer an article already shown this session; wrap around if that empties the set.
  const exclude = new Set(excludeIds || []);
  const candidates = pool.some((a) => !exclude.has(a.id))
    ? pool.filter((a) => !exclude.has(a.id))
    : pool;

  // How many the user has completed so far → decide if this is the 1-in-10 pick.
  const readCount = (await db("reading_log").select("id").eq("user_id", uid).run())?.length || 0;
  const isSerendipity = (readCount + 1) % 10 === 0;

  const inInterest = candidates.filter((a) => interests.includes(a.genre));
  const outInterest = candidates.filter((a) => !interests.includes(a.genre));

  // Avoid repeating recently-served topics/sources so the feed visibly varies.
  const recent = (await db("reading_log").select("genre,source").eq("user_id", uid)
    .order("created_at", { ascending: false }).limit(4).run()) || [];
  const recentGenres = new Set(recent.map((r) => r.genre));
  const recentSources = new Set(recent.slice(0, 2).map((r) => r.source));
  const freshen = (list) => {
    let c = list.filter((a) => !recentGenres.has(a.genre));
    if (!c.length) c = list;                              // ran out of new genres
    const s = c.filter((a) => !recentSources.has(a.source));
    return s.length ? s : c;                              // then vary the source
  };

  let chosen = null;
  const seed = Math.floor(Math.random() * 100000);

  if (isSerendipity && outInterest.length) {
    // Uniform across outside-interest genres (all trusted sources).
    chosen = freshen(outInterest)[seed % freshen(outInterest).length];
  } else if (inInterest.length) {
    const weights = await genreWeights(uid, interests);
    chosen = weightedPick(freshen(inInterest), weights, seed);
  } else {
    // Fallbacks: whatever the candidate set has.
    chosen = (isSerendipity ? outInterest[0] : null) || candidates[0];
  }
  if (!chosen) chosen = candidates[0];

  // NOTE: we deliberately do NOT mark `chosen` served here. Offering isn't consuming —
  // the row is marked served only when the reader completes it (markArticleServed, called
  // from the gate's submit). This is what makes refresh safe: skipped articles return to
  // rotation instead of being permanently burned.

  // Opportunistically top the pool back up for next time (fire and forget).
  refillPool().catch(() => {});

  return {
    id: chosen.id,
    title: chosen.title,
    url: chosen.url,
    source: chosen.source,
    genre: chosen.genre,
    blurb: chosen.blurb,
    is_serendipity: isSerendipity && !interests.includes(chosen.genre),
  };
}

// Consume a pool article: mark it served so it's never offered again. Called once, when
// the reader completes a read (gate submit) — NOT when an article is merely shown. Keeping
// consumption here (rather than at pick time) is what lets the reader refresh past
// articles without draining the pool. Best-effort: a failed mark never blocks the read
// that already succeeded (worst case the article can reappear later, which is harmless).
export async function markArticleServed(id) {
  if (!id) return;
  try {
    await db("article_pool").eq("id", id).update({ served: true });
  } catch (e) {
    console.warn("[recommender:serve]", e.message);
  }
}
