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
import { GENRES } from "./feeds.js";
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

// Pick the next article for this user, mark it served, and return it.
// Returns null if no article is available even after a refill attempt.
export async function pickArticle() {
  const user = await currentUser();
  if (!user) return null;
  const uid = user.id;

  const profile = (await db("profiles").select("interests").eq("user_id", uid).run())?.[0];
  const interests = profile?.interests?.length ? profile.interests : GENRES.slice();

  // Ensure the pool has something to serve.
  let pool = await db("article_pool").select("*").eq("user_id", uid).is("served", "false").run();
  if (!pool || pool.length === 0) {
    await refillPool();
    pool = await db("article_pool").select("*").eq("user_id", uid).is("served", "false").run();
  }
  if (!pool || pool.length === 0) return null;

  // How many the user has completed so far → decide if this is the 1-in-10 pick.
  const readCount = (await db("reading_log").select("id").eq("user_id", uid).run())?.length || 0;
  const isSerendipity = (readCount + 1) % 10 === 0;

  const inInterest = pool.filter((a) => interests.includes(a.genre));
  const outInterest = pool.filter((a) => !interests.includes(a.genre));

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
    // Fallbacks: whatever the pool has.
    chosen = (isSerendipity ? outInterest[0] : null) || pool[0];
  }
  if (!chosen) chosen = pool[0];

  // Mark served so it won't be handed out again.
  try {
    await db("article_pool").eq("id", chosen.id).update({ served: true });
  } catch (e) {
    console.warn("[recommender:serve]", e.message);
  }

  // Opportunistically top the pool back up for next time (fire and forget).
  refillPool().catch(() => {});

  return {
    title: chosen.title,
    url: chosen.url,
    source: chosen.source,
    genre: chosen.genre,
    blurb: chosen.blurb,
    is_serendipity: isSerendipity && !interests.includes(chosen.genre),
  };
}
