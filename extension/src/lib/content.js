// Content pipeline (Spec §5): fetch from BBC + NPR RSS, Yahoo (best-effort) and the
// Guardian API, tag genre from the source section, de-dup by URL, and keep a small
// pool of unread articles per user in `article_pool` so the gate loads instantly.

import { db, currentUser } from "./sb.js";
import { getConfig } from "./config.js";
import { CATALOG, GENRES, MY_SOURCES_GENRE, fetchSource, customFeedSpec } from "./feeds.js";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Round-robin merge: take item 0 from every list, then item 1, ... so the result
// alternates between lists instead of exhausting one before the next.
function interleave(lists) {
  const out = [];
  const maxLen = lists.reduce((m, l) => Math.max(m, l.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) if (i < list.length) out.push(list[i]);
  }
  return out;
}

// Fetch the user's genres and return a DIVERSE, deduped article list: genres are
// shuffled and round-robined, and sources within each genre are shuffled and
// round-robined — so slicing the front of the list yields a spread of topics and
// publishers rather than "the first genre from the first source". Any custom feeds the
// user added in Settings are fetched too and interleaved as their own "My Sources"
// stream, so they always get a fair share of the pool regardless of chosen interests.
async function fetchAll(interests, customFeeds = []) {
  const wanted = shuffle(interests && interests.length ? interests : GENRES);

  const perGenre = await Promise.all(wanted.map(async (genre) => {
    const specs = CATALOG[genre];
    if (!specs) return [];
    const lists = await Promise.all(
      specs.map((spec) => fetchSource(spec, genre).catch((e) => { console.warn("[content]", e.message); return []; }))
    );
    return interleave(shuffle(lists)); // vary the source within the genre
  }));

  // User's own feeds: fetch each, tag as "My Sources", round-robin between them.
  // The URL may be a homepage or a feed — fetchSource(kind:"custom") resolves either.
  const feeds = (customFeeds || []).filter((f) => f && (f.url || "").trim());
  const customLists = await Promise.all(
    feeds.map((f) => fetchSource(customFeedSpec(f), MY_SOURCES_GENRE)
      .catch((e) => { console.warn("[content:custom]", e.message); return []; }))
  );
  const custom = interleave(shuffle(customLists));

  // Interleave custom articles alongside the genre streams so they land near the front
  // of the pool too, not just at the tail after slicing.
  const merged = interleave(custom.length ? [custom, ...perGenre] : perGenre);

  // De-dup by URL.
  const seen = new Set();
  return merged.filter((a) => {
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
    // select("*") (not an explicit column list) so an older DB without the
    // custom_feeds column still returns interests instead of erroring the whole refill.
    db("profiles").select("*").eq("user_id", uid).run(),
    db("reading_log").select("article_url").eq("user_id", uid).order("created_at", { ascending: false }).limit(500).run(),
  ]);

  const unread = (poolRows || []).filter((r) => !r.served).length;
  if (unread >= cfg.POOL_TARGET) return { added: 0, reason: "full" };

  const interests = profileRows?.[0]?.interests || [];
  const customFeeds = profileRows?.[0]?.custom_feeds || [];
  const known = new Set([
    ...(poolRows || []).map((r) => r.url),
    ...(readRows || []).map((r) => r.article_url),
  ]);

  const fresh = (await fetchAll(interests, customFeeds)).filter((a) => !known.has(a.url));
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

// Flush the user's unread queue and refill it with a fresh, diverse batch. Used by
// the popup's "Refresh articles" button so a skewed queue can be reset on demand.
export async function resetPool() {
  const user = await currentUser();
  if (!user) return { added: 0, reason: "not-authenticated" };
  try {
    await db("article_pool").eq("user_id", user.id).is("served", "false").remove();
  } catch (e) {
    console.warn("[content:reset]", e.message);
  }
  return refillPool();
}
