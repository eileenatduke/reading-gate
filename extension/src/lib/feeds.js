// Content sources (Spec §5) + a dependency-free RSS/Atom parser.
//
// Genre is derived for free from the feed/section/tag an article came from — no AI
// classification. Each category below maps to one or more real free sources (BBC/NPR
// RSS, or the Guardian Open Platform by section or tag). All refs were verified to
// return live articles. A few fine categories piggyback on the closest solid source
// ("best-effort") — e.g. Internet Culture ← Guardian technology/internet.

import { getConfig } from "./config.js";

// ---------------------------------------------------------------------------
// Grouped category list — drives the grouped interest pickers on both surfaces.
// The dashboard mirrors this in dashboard/src/lib/genres.js (keep in sync).
// ---------------------------------------------------------------------------
export const GENRE_GROUPS = [
  { group: "Front of the feed", genres: ["Top Stories", "Opinion"] },
  { group: "News & Politics", genres: ["World", "U.S. / National", "Politics", "Immigration", "Legal & Justice", "Military & Defense", "Crime & Safety"] },
  { group: "Business & Money", genres: ["Business & Finance", "Personal Finance", "Real Estate & Housing", "Labor & Work"] },
  { group: "Tech & Science", genres: ["Technology", "AI", "Cybersecurity", "Science", "Space"] },
  { group: "Environment & Energy", genres: ["Climate & Environment", "Weather", "Energy"] },
  { group: "Health & Wellbeing", genres: ["Health", "Wellness & Mental Health"] },
  { group: "Culture & Entertainment", genres: ["Entertainment", "Arts & Culture", "Gaming & Esports", "Internet Culture", "Fashion & Style", "Design & Architecture"] },
  { group: "Life", genres: ["Lifestyle", "Food", "Travel", "Pets & Animals", "Religion & Faith"] },
  { group: "Other", genres: ["Sports", "Education", "Media & Press"] },
];

// Flat list (default interest set when a user hasn't chosen any).
export const GENRES = GENRE_GROUPS.flatMap((g) => g.genres);

// Pseudo-genre for a user's own added feeds (Settings → "Your own sources"). It's not
// a topic in the taxonomy — it just tags custom-feed articles so the recommender can
// always keep them in rotation (see recommender.js) and the dashboard can label them.
// The dashboard mirrors this in dashboard/src/lib/genres.js (keep in sync).
export const MY_SOURCES_GENRE = "My Sources";

// Turn a stored custom feed ({ name, url }) into a fetchable source spec. The URL may
// be an actual feed OR just a homepage the user pasted — kind "custom" resolves either
// (see fetchCustomSource). Falls back to the URL's hostname when the user didn't name it.
export function customFeedSpec(feed) {
  let name = (feed?.name || "").trim();
  if (!name) {
    try { name = new URL(withProtocol(feed.url)).hostname.replace(/^www\./, ""); } catch { name = "My source"; }
  }
  return { source: name, kind: "custom", url: feed?.url };
}

// Feed-URL helpers.
const bbc = (path) => `https://feeds.bbci.co.uk/${path}/rss.xml`;
const npr = (id) => `https://feeds.npr.org/${id}/rss.xml`;
const pbs = (path) => `https://www.pbs.org/newshour/feeds/rss/${path}`;
const rss = (source, url) => ({ source, kind: "rss", url });
const gSection = (ref) => ({ source: "Guardian", kind: "section", ref });
const gTag = (ref) => ({ source: "Guardian", kind: "tag", ref });

// Extra publisher feeds (owner-requested). AP has no official RSS — using a
// third-party mirror (best-effort). Yahoo Tech's own feed is defunct — using
// Engadget, Yahoo's tech publication. Yahoo Finance uses its markets headline feed.
const AP = rss("AP News", "https://feedx.net/rss/ap.xml");
const PROPUBLICA = rss("ProPublica", "https://www.propublica.org/feeds/propublica/main");
const MARSHALL = rss("The Marshall Project", "https://www.themarshallproject.org/rss/recent.rss");
const YAHOO_FINANCE = rss("Yahoo Finance", "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US");
const YAHOO_TECH = rss("Yahoo Tech", "https://www.engadget.com/rss.xml");

// OpenAI (official news feed).
const OPENAI = rss("OpenAI", "https://openai.com/news/rss.xml");

// University publications (owner-requested). Free, public-facing reading from top-US-
// university .edu newsrooms and one student paper — NOT academic-journal databases, so
// they stay readable rather than paper-dense. All verified to return live articles.
// MIT News and the Harvard Gazette expose per-topic/section feeds we map to fine
// categories; the rest publish one general campus feed we file under Education.
const MIT = rss("MIT News", "https://news.mit.edu/rss/feed");
const MIT_AI = rss("MIT News", "https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml");
const MIT_CYBER = rss("MIT News", "https://news.mit.edu/topic/mitcyber-security-rss.xml");
const MIT_HEALTH = rss("MIT News", "https://news.mit.edu/topic/mithealth-rss.xml");
const MIT_SPACE = rss("MIT News", "https://news.mit.edu/topic/mitspace-rss.xml");
const MIT_CLIMATE = rss("MIT News", "https://news.mit.edu/topic/mitclimate-change-rss.xml");
const MIT_ENERGY = rss("MIT News", "https://news.mit.edu/topic/mitenergy-rss.xml");
const MIT_ECON = rss("MIT News", "https://news.mit.edu/topic/miteconomics-rss.xml");

const HARVARD = rss("Harvard Gazette", "https://news.harvard.edu/gazette/feed/");
const HARVARD_SCITECH = rss("Harvard Gazette", "https://news.harvard.edu/gazette/section/science-technology/feed/");
const HARVARD_HEALTH = rss("Harvard Gazette", "https://news.harvard.edu/gazette/section/health/feed/");
const HARVARD_BUSINESS = rss("Harvard Gazette", "https://news.harvard.edu/gazette/section/business-economy/feed/");
const HARVARD_ARTS = rss("Harvard Gazette", "https://news.harvard.edu/gazette/section/arts-humanities/feed/");
const HARVARD_WORLD = rss("Harvard Gazette", "https://news.harvard.edu/gazette/section/nation-world/feed/");

const JHU = rss("Johns Hopkins Hub", "https://hub.jhu.edu/feed/");
const NORTHWESTERN = rss("Northwestern Now", "https://news.northwestern.edu/feeds/allStories");
const PRINCETON = rss("Princeton University", "https://www.princeton.edu/feed/");
const PRINCETON_RESEARCH = rss("Princeton University", "https://www.princeton.edu/feed/research/");
const PENN = rss("Penn Today", "https://penntoday.upenn.edu/rss.xml");
const VANDERBILT = rss("Vanderbilt University", "https://news.vanderbilt.edu/feed/");
const STANFORD_DAILY = rss("The Stanford Daily", "https://stanforddaily.com/feed/");

// Anthropic and the Stanford Digital Economy Lab publish no RSS — cover them via
// Google News topic feeds (best-effort; these are news *about* them from many outlets).
const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
const ANTHROPIC = rss("Anthropic", gnews("Anthropic Claude AI"));
const STANFORD_DEL = rss("Stanford Digital Economy Lab", gnews('"Stanford Digital Economy Lab"'));

// ---------------------------------------------------------------------------
// Catalog: category → the sources that fill it. First entries are the strongest.
// ---------------------------------------------------------------------------
export const CATALOG = {
  // Front of the feed
  "Top Stories": [rss("BBC", bbc("news")), rss("NPR", npr(1001)), gSection("news"), AP, rss("PBS News", pbs("headlines")), PROPUBLICA, HARVARD_WORLD, STANFORD_DAILY],
  "Opinion": [gSection("commentisfree")],
  // News & Politics
  "World": [rss("BBC", bbc("news/world")), gSection("world"), rss("NPR", npr(1004)), AP, rss("PBS News", pbs("world")), HARVARD_WORLD],
  "U.S. / National": [gSection("us-news"), rss("NPR", npr(1003)), AP, rss("PBS News", pbs("nation")), PROPUBLICA, HARVARD_WORLD],
  "Politics": [rss("BBC", bbc("news/politics")), gSection("politics"), rss("NPR", npr(1014)), rss("PBS News", pbs("politics")), PROPUBLICA],
  "Immigration": [gTag("world/migration")],
  "Legal & Justice": [gSection("law"), MARSHALL],
  "Military & Defense": [gTag("us-news/us-military")],
  "Crime & Safety": [gTag("us-news/us-crime"), MARSHALL],
  // Business & Money
  "Business & Finance": [rss("BBC", bbc("news/business")), gSection("business"), rss("NPR", npr(1006)), rss("PBS News", pbs("economy")), YAHOO_FINANCE, HARVARD_BUSINESS, MIT_ECON],
  "Personal Finance": [gSection("money")],
  "Real Estate & Housing": [gTag("money/property")],
  "Labor & Work": [gTag("money/work-and-careers")],
  // Tech & Science
  "Technology": [rss("BBC", bbc("news/technology")), gSection("technology"), rss("NPR", npr(1019)), YAHOO_TECH, MIT, HARVARD_SCITECH],
  "AI": [gTag("technology/artificialintelligenceai"), OPENAI, ANTHROPIC, STANFORD_DEL, MIT_AI],
  "Cybersecurity": [gTag("technology/data-computer-security"), MIT_CYBER],
  "Science": [rss("BBC", bbc("news/science_and_environment")), gSection("science"), rss("NPR", npr(1007)), rss("PBS News", pbs("science")), MIT, HARVARD_SCITECH, PRINCETON_RESEARCH],
  "Space": [gTag("science/space"), MIT_SPACE],
  // Environment & Energy
  "Climate & Environment": [gSection("environment"), rss("BBC", bbc("news/science_and_environment")), MIT_CLIMATE],
  "Weather": [gTag("world/extreme-weather")],
  "Energy": [gTag("environment/energy"), MIT_ENERGY],
  // Health & Wellbeing
  "Health": [rss("BBC", bbc("news/health")), gTag("society/health"), rss("NPR", npr(1128)), rss("PBS News", pbs("health")), MIT_HEALTH, HARVARD_HEALTH],
  "Wellness & Mental Health": [gTag("lifeandstyle/health-and-wellbeing")],
  // Culture & Entertainment
  "Entertainment": [gSection("film"), gSection("culture")],
  "Arts & Culture": [gSection("artanddesign"), gSection("culture"), HARVARD_ARTS],
  "Gaming & Esports": [gSection("games")],
  "Internet Culture": [gTag("technology/internet")],
  "Fashion & Style": [gSection("fashion")],
  "Design & Architecture": [gTag("artanddesign/architecture")],
  // Life
  "Lifestyle": [gSection("lifeandstyle")],
  "Food": [gSection("food")],
  "Travel": [gSection("travel")],
  "Pets & Animals": [gTag("world/animals")],
  "Religion & Faith": [gTag("world/religion")],
  // Other
  "Sports": [rss("BBC", bbc("sport")), gSection("sport")],
  "Education": [gSection("education"), rss("NPR", npr(1013)), HARVARD, NORTHWESTERN, PRINCETON, PENN, VANDERBILT, JHU, STANFORD_DAILY],
  "Media & Press": [gSection("media")],
};

// ---- tiny helpers ----------------------------------------------------------
function decode(s) {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/<[^>]+>/g, "") // strip any tags revealed by entity decoding
    .replace(/\s+/g, " ")
    .trim();
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1] : "";
}

function pickLink(block) {
  const rssLink = pick(block, "link");
  if (rssLink && /^https?:/i.test(rssLink.trim())) return rssLink.trim();
  const atom = block.match(/<link[^>]*rel=["']?alternate["']?[^>]*href=["']([^"']+)["']/i)
    || block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (atom) return atom[1];
  // Some feeds (e.g. Northwestern Now) carry no <link> and put the canonical article URL
  // only in <guid isPermaLink="true">. Fall back to guid when it's an http(s) URL.
  const guid = pick(block, "guid").trim();
  return /^https?:/i.test(guid) ? guid : "";
}

// Normalize a BBC link so non-UK readers can actually open it.
//
// BBC RSS feeds link to the UK edition on `www.bbc.co.uk`, and mix in UK-only media:
//   • /iplayer  (TV)   — geo-locked to the UK, no international version
//   • /sounds   (radio) — geo-locked to the UK, no international version
// Opening either of those outside the UK shows "BBC iPlayer isn't available in your
// region." Text articles fare better but still resolve to the UK edition, which can
// region-gate. The fix: drop the UK-only media, and route everything else to the
// international edition on `www.bbc.com` (same paths — verified they resolve there).
//
// Returns the rewritten URL, or null if the item should be dropped from the pool.
export function normalizeArticleUrl(url) {
  if (!/^https?:\/\/([a-z0-9.-]+\.)?bbc\.co\.uk\//i.test(url)) return url;
  // UK-only media — no international equivalent, so exclude entirely.
  if (/\/(iplayer|sounds)(\/|$|\?|#)/i.test(url)) return null;
  return url.replace(/(https?:\/\/(?:www\.)?)bbc\.co\.uk/i, "$1bbc.com");
}

// ---------------------------------------------------------------------------
// Feed autodiscovery — let a user paste a homepage instead of the raw feed URL.
// The extension can fetch cross-origin pages (the dashboard can't, CORS), so all of
// this runs here, at fetch time in the background service worker.
// ---------------------------------------------------------------------------

// Prepend https:// when the user typed a bare domain like "nytimes.com".
export function withProtocol(u) {
  const s = (u || "").trim();
  return /^https?:\/\//i.test(s) ? s : "https://" + s.replace(/^\/+/, "");
}

function looksLikeFeed(text) {
  return /<(rss|feed|rdf:RDF)[\s>]/i.test((text || "").slice(0, 1000));
}

// Pull the first RSS/Atom autodiscovery <link> out of a homepage's HTML, resolved to
// an absolute URL. This is the standard <link rel="alternate" type="application/rss+xml">
// tag most publishers put in their <head>. Returns null if none is present.
export function discoverFeedUrl(html, baseUrl) {
  const found = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (!/rel=["']?[^"'>]*\balternate\b/i.test(tag)) continue;
    if (!/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    try { found.push({ url: new URL(href, baseUrl).href, isRss: /rss\+xml/i.test(tag) }); } catch { /* skip */ }
  }
  if (!found.length) return null;
  return (found.find((f) => f.isRss) || found[0]).url; // prefer RSS over Atom
}

// Feed paths to try when a homepage has no autodiscovery link (WordPress, Substack,
// Ghost, blogs). Ordered most-common first; we stop at the first that parses as a feed.
const COMMON_FEED_PATHS = ["/feed", "/rss", "/feed.xml", "/rss.xml", "/index.xml", "/atom.xml", "/feeds/posts/default"];

async function probeCommonFeedPaths(baseUrl) {
  for (const p of COMMON_FEED_PATHS) {
    let url;
    try { url = new URL(p, baseUrl).href; } catch { continue; }
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const text = await res.text();
      if (looksLikeFeed(text)) return text;
    } catch { /* try next path */ }
  }
  return null;
}

// Fetch a user-supplied source that may be EITHER a feed URL or a homepage. If the URL
// already returns a feed, parse it; otherwise treat the response as HTML and resolve
// the feed via <link> autodiscovery, then by probing conventional feed paths.
async function fetchCustomSource(inputUrl) {
  const url = withProtocol(inputUrl);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`custom ${url} HTTP ${res.status}`);
  const text = await res.text();

  if (looksLikeFeed(text)) {
    const items = parseFeed(text);
    if (items.length) return items;
  }

  const feedUrl = discoverFeedUrl(text, url);
  if (feedUrl) {
    const fres = await fetch(feedUrl, { cache: "no-store" });
    if (fres.ok) {
      const items = parseFeed(await fres.text());
      if (items.length) return items;
    }
  }

  const probed = await probeCommonFeedPaths(url);
  if (probed) return parseFeed(probed);

  throw new Error(`no feed found at ${url}`);
}

// Parse an RSS/Atom string into [{title,url,blurb}]
export function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = decode(pick(b, "title"));
    const url = normalizeArticleUrl(decode(pickLink(b)));
    const blurb = decode(pick(b, "description") || pick(b, "summary") || pick(b, "content"));
    if (title && url && /^https?:/i.test(url)) {
      items.push({ title, url, blurb: blurb.slice(0, 400) });
    }
  }
  return items;
}

// Fetch one source spec and tag every article with the given genre.
export async function fetchSource(spec, genre) {
  if (spec.kind === "custom") {
    // User-supplied: URL may be a feed or a homepage — fetchCustomSource resolves both.
    const items = await fetchCustomSource(spec.url);
    return items.slice(0, 25).map((a) => ({ ...a, source: spec.source, genre }));
  }
  if (spec.kind === "rss") {
    const res = await fetch(spec.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${spec.source} ${genre} HTTP ${res.status}`);
    const xml = await res.text();
    // Cap per feed — some feeds (e.g. OpenAI) publish 1000+ items in one file.
    return parseFeed(xml).slice(0, 25).map((a) => ({ ...a, source: spec.source, genre }));
  }
  // Guardian section or tag
  const cfg = await getConfig();
  const key = cfg.GUARDIAN_API_KEY || "test";
  const base = spec.kind === "tag"
    ? `https://content.guardianapis.com/search?tag=${encodeURIComponent(spec.ref)}`
    : `https://content.guardianapis.com/${spec.ref}?`;
  const url = `${base}${spec.kind === "tag" ? "&" : ""}api-key=${encodeURIComponent(key)}` +
    `&show-fields=trailText&page-size=15&order-by=newest`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Guardian ${spec.ref} HTTP ${res.status}`);
  const data = await res.json();
  const results = data?.response?.results || [];
  return results.map((r) => ({
    title: decode(r.webTitle),
    url: r.webUrl,
    blurb: decode(r.fields?.trailText || "").slice(0, 400),
    source: "Guardian",
    genre,
  }));
}
