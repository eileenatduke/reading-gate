// Content pipeline (Spec §5): fetch from BBC + NPR RSS, Yahoo (best-effort) and the
// Guardian API, tag genre from the source section, de-dup by URL, and keep a small
// pool of unread articles per user in `article_pool` so the gate loads instantly.

import { db, currentUser } from "./sb.js";
import { getConfig } from "./config.js";
import { CATALOG, GENRES, fetchSource } from "./feeds.js";

// Fetch every source for the user's selected genres, tolerating individual failures.
async function fetchAll(interests) {
  const wanted = interests && interests.length ? interests : GENRES;
  const jobs = [];

  for (const genre of wanted) {
    const specs = CATALOG[genre];
    if (!specs) continue;
    for (const spec of specs) {
      jobs.push(fetchSource(spec, genre).catch((e) => { console.warn("[content]", e.message); return []; }));
    }
  }

  const articles = (await Promise.all(jobs)).flat();

  // De-dup by URL.
  const seen = new Set();
  return articles.filter((a) => {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

// Refill the current user's article_pool up to POOL_TARGET unread rows.
// Skips URLs the user has already read or already has pooled.
export async function refillPool() {
  const user = await currentUser();
  if (!user) return { added: 0, reason: "not-authenticated" };

  const cfg = await getConfig();
  const uid = user.id;

  const [poolRows, profileRows, readRows] = await Promise.all([
    db("article_pool").select("url,served").eq("user_id", uid).run(),
    db("profiles").select("interests").eq("user_id", uid).run(),
    db("reading_log").select("article_url").eq("user_id", uid).order("created_at", { ascending: false }).limit(500).run(),
  ]);

  const unread = (poolRows || []).filter((r) => !r.served).length;
  if (unread >= cfg.POOL_TARGET) return { added: 0, reason: "full" };

  const interests = profileRows?.[0]?.interests || [];
  const known = new Set([
    ...(poolRows || []).map((r) => r.url),
    ...(readRows || []).map((r) => r.article_url),
  ]);

  const fresh = (await fetchAll(interests)).filter((a) => !known.has(a.url));
  if (!fresh.length) return { added: 0, reason: "no-fresh" };

  // Insert up to (target - unread) fresh rows. upsert on (user_id,url) to be safe.
  const need = cfg.POOL_TARGET - unread;
  const rows = fresh.slice(0, Math.max(need, cfg.POOL_TARGET)).map((a) => ({
    user_id: uid,
    title: a.title,
    url: a.url,
    source: a.source,
    genre: a.genre,
    blurb: a.blurb || null,
    served: false,
  }));

  try {
    await db("article_pool").upsert(rows, "user_id,url");
  } catch (e) {
    console.warn("[content:insert]", e.message);
    return { added: 0, reason: "insert-failed" };
  }
  return { added: rows.length };
}
