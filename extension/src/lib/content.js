// Content pipeline (Spec §5): fetch from BBC + NPR RSS, Yahoo (best-effort) and the
// Guardian API, tag genre from the source section, de-dup by URL, and keep a small
// pool of unread articles per user in `article_pool` so the gate loads instantly.

import { db, currentUser } from "./sb.js";
import { getConfig } from "./config.js";
import {
  RSS_FEEDS, FALLBACK, GUARDIAN_SECTIONS, GENRES,
  fetchRss, fetchGuardian,
} from "./feeds.js";

// Fetch everything we can, tolerating individual feed failures.
async function fetchAll(interests) {
  const wanted = new Set(interests && interests.length ? interests : GENRES);
  const jobs = [];

  for (const feed of RSS_FEEDS) {
    if (!wanted.has(feed.genre)) continue;
    jobs.push(fetchRss(feed).catch((e) => { console.warn("[content]", e.message); return []; }));
  }
  for (const sec of GUARDIAN_SECTIONS) {
    if (!wanted.has(sec.genre)) continue;
    jobs.push(fetchGuardian(sec).catch((e) => { console.warn("[content]", e.message); return []; }));
  }

  let articles = (await Promise.all(jobs)).flat();

  // Yahoo fallback: if a best-effort genre came up empty, backfill from reliable feeds.
  for (const genre of ["Technology", "Business"]) {
    if (!wanted.has(genre)) continue;
    const have = articles.some((a) => a.genre === genre);
    if (!have) {
      for (const feed of FALLBACK[genre] || []) {
        try {
          articles = articles.concat(await fetchRss(feed));
          if (articles.some((a) => a.genre === genre)) break;
        } catch (e) { console.warn("[content:fallback]", e.message); }
      }
    }
  }

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
