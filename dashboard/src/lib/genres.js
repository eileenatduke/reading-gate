// Must stay in sync with the extension's grouped catalog
// (extension/src/lib/feeds.js → GENRE_GROUPS).
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

export const GENRES = GENRE_GROUPS.flatMap((g) => g.genres);

// Pseudo-genre tagging articles from a user's own added feeds (Settings → "Your own
// sources"). Mirrors extension/src/lib/feeds.js → MY_SOURCES_GENRE (keep in sync).
export const MY_SOURCES_GENRE = "My Sources";

// Publishers the extension pulls from (mirrors the CATALOG sources in
// extension/src/lib/feeds.js). Shown on Settings for transparency.
export const SOURCES = [
  "BBC", "NPR", "Guardian", "AP News", "PBS News", "ProPublica",
  "The Marshall Project", "Yahoo Finance", "Yahoo Tech",
  "OpenAI", "Anthropic", "Stanford Digital Economy Lab",
  // University publications (free, public-facing .edu newsrooms + one student paper).
  "MIT News", "Harvard Gazette", "Johns Hopkins Hub", "Northwestern Now",
  "Princeton University", "Penn Today", "Vanderbilt University", "The Stanford Daily",
];
