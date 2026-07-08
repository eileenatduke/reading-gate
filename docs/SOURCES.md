# Sources & topics

The topic → source map for Foyer. Genre is derived from the feed/section/tag an
article comes from (Spec §5) — no AI classification. The authoritative definition
lives in `extension/src/lib/feeds.js` (`GENRE_GROUPS` + `CATALOG`); this doc mirrors it
for reference. If you change the catalog, update this file too.

You currently pull from **13 publishers**.

## Topic → source map

### Front of the feed
| Topic | Sources |
|---|---|
| Top Stories | BBC · NPR · Guardian · AP News · PBS News · ProPublica |
| Opinion | Guardian |

### News & Politics
| Topic | Sources |
|---|---|
| World | BBC · NPR · Guardian · AP News · PBS News |
| U.S. / National | Guardian · NPR · AP News · PBS News · ProPublica |
| Politics | BBC · NPR · Guardian · PBS News · ProPublica |
| Immigration | Guardian |
| Legal & Justice | Guardian · The Marshall Project |
| Military & Defense | Guardian |
| Crime & Safety | Guardian · The Marshall Project |

### Business & Money
| Topic | Sources |
|---|---|
| Business & Finance | BBC · NPR · Guardian · PBS News · Yahoo Finance |
| Personal Finance | Guardian |
| Real Estate & Housing | Guardian |
| Labor & Work | Guardian |

### Tech & Science
| Topic | Sources |
|---|---|
| Technology | BBC · NPR · Guardian · Yahoo Tech · Wired |
| AI | Guardian · Wired · OpenAI · Anthropic · Stanford Digital Economy Lab |
| Cybersecurity | Guardian · Wired |
| Science | BBC · NPR · Guardian · PBS News · Wired |
| Space | Guardian |

### Environment & Energy
| Topic | Sources |
|---|---|
| Climate & Environment | Guardian · BBC |
| Weather | Guardian |
| Energy | Guardian |

### Health & Wellbeing
| Topic | Sources |
|---|---|
| Health | BBC · NPR · Guardian · PBS News |
| Wellness & Mental Health | Guardian |

### Culture & Entertainment
| Topic | Sources |
|---|---|
| Entertainment | Guardian |
| Arts & Culture | Guardian |
| Gaming & Esports | Guardian |
| Internet Culture | Guardian |
| Fashion & Style | Guardian |
| Design & Architecture | Guardian |

### Life
| Topic | Sources |
|---|---|
| Lifestyle | Guardian |
| Food | Guardian |
| Travel | Guardian |
| Pets & Animals | Guardian |
| Religion & Faith | Guardian |

### Other
| Topic | Sources |
|---|---|
| Sports | BBC · Guardian |
| Education | Guardian · NPR |
| Media & Press | Guardian |

## The 13 sources

**Rock-solid official feeds:** BBC · NPR · The Guardian · PBS News · ProPublica ·
The Marshall Project · Wired · OpenAI · Yahoo Finance

**Best-effort (may occasionally run dry):**
- **AP News** — third-party mirror (AP shut down its public RSS).
- **Yahoo Tech** — Engadget, Yahoo's tech publication (Yahoo's own tech feed is defunct).
- **Anthropic** & **Stanford Digital Economy Lab** — Google News topic feeds (news
  *about* them from many outlets; neither publishes its own RSS).

## Notes
- **AI** is the richest category (5 sources, incl. OpenAI direct).
- Most of **Culture**, **Life**, and several niche topics are **Guardian-only** — its
  section/tag taxonomy is deep enough to cover them. Add a second source to any of them
  by extending `CATALOG` in `extension/src/lib/feeds.js`.
- Guardian queries use the free **Open Platform** API by section or tag; the built-in
  `test` key is rate-limited — a free key raises the limit (see README).
