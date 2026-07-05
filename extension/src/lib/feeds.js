// Content sources (Spec §5) + a dependency-free RSS/Atom parser.
//
// Genre is derived for free from the feed/section an article came from — no AI
// classification (Spec §5 "Genre labeling is free").
//
// The parser is regex-based on purpose: MV3 service workers have no DOMParser, so we
// avoid it entirely and this same code runs in the worker or a page. It handles the
// well-formed feeds we use (BBC, NPR, Yahoo RSS + Atom). Not a general XML parser.

import { getConfig } from "./config.js";

// Fixed genre vocabulary the chosen feeds can reliably supply (Spec §6).
export const GENRES = ["Technology", "Science", "Politics", "World", "Business", "Health"];

// RSS/Atom feed sources, each tagged with its genre + source label.
export const RSS_FEEDS = [
  // BBC (reliable)
  { source: "BBC", genre: "Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { source: "BBC", genre: "Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
  { source: "BBC", genre: "Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { source: "BBC", genre: "Politics", url: "https://feeds.bbci.co.uk/news/politics/rss.xml" },
  { source: "BBC", genre: "World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { source: "BBC", genre: "Health", url: "https://feeds.bbci.co.uk/news/health/rss.xml" },
  // NPR (reliable) — topic feed ids
  { source: "NPR", genre: "Science", url: "https://feeds.npr.org/1007/rss.xml" },
  { source: "NPR", genre: "Technology", url: "https://feeds.npr.org/1019/rss.xml" },
  { source: "NPR", genre: "Business", url: "https://feeds.npr.org/1006/rss.xml" },
  { source: "NPR", genre: "Health", url: "https://feeds.npr.org/1128/rss.xml" },
  { source: "NPR", genre: "World", url: "https://feeds.npr.org/1004/rss.xml" },
  { source: "NPR", genre: "Politics", url: "https://feeds.npr.org/1014/rss.xml" },
  // Yahoo (best-effort — see FALLBACK below)
  { source: "Yahoo", genre: "Technology", url: "https://www.yahoo.com/news/rss/technology", bestEffort: true },
  { source: "Yahoo", genre: "Business", url: "https://finance.yahoo.com/news/rssindex", bestEffort: true },
];

// If a best-effort (Yahoo) genre comes up empty, fill it from these reliable feeds
// so Tech/Finance never go dark (Spec §5 Fallback).
export const FALLBACK = {
  Technology: RSS_FEEDS.filter((f) => f.genre === "Technology" && !f.bestEffort),
  Business: RSS_FEEDS.filter((f) => f.genre === "Business" && !f.bestEffort),
};

// Guardian Open Platform sections → our genre labels.
export const GUARDIAN_SECTIONS = [
  { section: "technology", genre: "Technology" },
  { section: "science", genre: "Science" },
  { section: "politics", genre: "Politics" },
  { section: "world", genre: "World" },
  { section: "business", genre: "Business" },
  { section: "society", genre: "Health" },
];

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
  // RSS <link>...</link> or Atom <link href="..."/>
  const rss = pick(block, "link");
  if (rss && /^https?:/i.test(rss.trim())) return rss.trim();
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

// Fetch + parse one RSS feed → tagged articles.
export async function fetchRss(feed) {
  const res = await fetch(feed.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${feed.source} ${feed.genre} HTTP ${res.status}`);
  const xml = await res.text();
  return parseFeed(xml).map((a) => ({ ...a, source: feed.source, genre: feed.genre }));
}

// Fetch one Guardian section via the Open Platform API (JSON).
export async function fetchGuardian(sectionDef) {
  const cfg = await getConfig();
  const key = cfg.GUARDIAN_API_KEY || "test";
  const url = `https://content.guardianapis.com/${sectionDef.section}?` +
    `api-key=${encodeURIComponent(key)}&show-fields=trailText&page-size=20&order-by=newest`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Guardian ${sectionDef.section} HTTP ${res.status}`);
  const data = await res.json();
  const results = data?.response?.results || [];
  return results.map((r) => ({
    title: decode(r.webTitle),
    url: r.webUrl,
    blurb: decode(r.fields?.trailText || "").slice(0, 400),
    source: "Guardian",
    genre: sectionDef.genre,
  }));
}
