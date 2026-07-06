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

// Wired (native RSS) + OpenAI (official news feed).
const WIRED = rss("Wired", "https://www.wired.com/feed/rss");
const WIRED_AI = rss("Wired", "https://www.wired.com/feed/tag/ai/latest/rss");
const WIRED_SECURITY = rss("Wired", "https://www.wired.com/feed/category/security/latest/rss");
const WIRED_SCIENCE = rss("Wired", "https://www.wired.com/feed/category/science/latest/rss");
const OPENAI = rss("OpenAI", "https://openai.com/news/rss.xml");

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
  "Top Stories": [rss("BBC", bbc("news")), rss("NPR", npr(1001)), gSection("news"), AP, rss("PBS News", pbs("headlines")), PROPUBLICA],
  "Opinion": [gSection("commentisfree")],
  // News & Politics
  "World": [rss("BBC", bbc("news/world")), gSection("world"), rss("NPR", npr(1004)), AP, rss("PBS News", pbs("world"))],
  "U.S. / National": [gSection("us-news"), rss("NPR", npr(1003)), AP, rss("PBS News", pbs("nation")), PROPUBLICA],
  "Politics": [rss("BBC", bbc("news/politics")), gSection("politics"), rss("NPR", npr(1014)), rss("PBS News", pbs("politics")), PROPUBLICA],
  "Immigration": [gTag("world/migration")],
  "Legal & Justice": [gSection("law"), MARSHALL],
  "Military & Defense": [gTag("us-news/us-military")],
  "Crime & Safety": [gTag("us-news/us-crime"), MARSHALL],
  // Business & Money
  "Business & Finance": [rss("BBC", bbc("news/business")), gSection("business"), rss("NPR", npr(1006)), rss("PBS News", pbs("economy")), YAHOO_FINANCE],
  "Personal Finance": [gSection("money")],
  "Real Estate & Housing": [gTag("money/property")],
  "Labor & Work": [gTag("money/work-and-careers")],
  // Tech & Science
  "Technology": [rss("BBC", bbc("news/technology")), gSection("technology"), rss("NPR", npr(1019)), YAHOO_TECH, WIRED],
  "AI": [gTag("technology/artificialintelligenceai"), WIRED_AI, OPENAI, ANTHROPIC, STANFORD_DEL],
  "Cybersecurity": [gTag("technology/data-computer-security"), WIRED_SECURITY],
  "Science": [rss("BBC", bbc("news/science_and_environment")), gSection("science"), rss("NPR", npr(1007)), rss("PBS News", pbs("science")), WIRED_SCIENCE],
  "Space": [gTag("science/space")],
  // Environment & Energy
  "Climate & Environment": [gSection("environment"), rss("BBC", bbc("news/science_and_environment"))],
  "Weather": [gTag("world/extreme-weather")],
  "Energy": [gTag("environment/energy")],
  // Health & Wellbeing
  "Health": [rss("BBC", bbc("news/health")), gTag("society/health"), rss("NPR", npr(1128)), rss("PBS News", pbs("health"))],
  "Wellness & Mental Health": [gTag("lifeandstyle/health-and-wellbeing")],
  // Culture & Entertainment
  "Entertainment": [gSection("film"), gSection("culture")],
  "Arts & Culture": [gSection("artanddesign"), gSection("culture")],
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
  "Education": [gSection("education"), rss("NPR", npr(1013))],
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
  return atom ? atom[1] : "";
}

// Parse an RSS/Atom string into [{title,url,blurb}]
export function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = decode(pick(b, "title"));
    const url = decode(pickLink(b));
    const blurb = decode(pick(b, "description") || pick(b, "summary") || pick(b, "content"));
    if (title && /^https?:/i.test(url)) {
      items.push({ title, url, blurb: blurb.slice(0, 400) });
    }
  }
  return items;
}

// Fetch one source spec and tag every article with the given genre.
export async function fetchSource(spec, genre) {
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
