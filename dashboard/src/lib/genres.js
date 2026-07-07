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

// Publishers the extension pulls from (mirrors the CATALOG sources in
// extension/src/lib/feeds.js). Shown on Settings for transparency.
export const SOURCES = [
  "BBC", "NPR", "Guardian", "AP News", "PBS News", "ProPublica",
  "The Marshall Project", "Yahoo Finance", "Yahoo Tech", "Wired",
  "OpenAI", "Anthropic", "Stanford Digital Economy Lab",
];
