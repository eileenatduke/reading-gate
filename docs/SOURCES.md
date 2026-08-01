# Sources & topics

The topic → source map for Reading Gate. Genre is derived from the feed/section/tag an
article comes from (Spec §5) — no AI classification. The authoritative definition
lives in `extension/src/lib/feeds.js` (`GENRE_GROUPS` + `CATALOG`); this doc mirrors it
for reference. If you change the catalog, update this file too.

You currently pull from **20 publishers** — mainstream newsrooms plus the public,
free-to-read publications of eight top-US universities (their own `.edu` newsrooms and
one student paper — not academic-journal databases). Every source is free to read; none
sits behind a paywall.

## Topic → source map

### Front of the feed
| Topic | Sources |
|---|---|
| Top Stories | BBC · NPR · Guardian · AP News · PBS News · ProPublica · Harvard Gazette · The Stanford Daily |
| Opinion | Guardian |

### News & Politics
| Topic | Sources |
|---|---|
| World | BBC · NPR · Guardian · AP News · PBS News · Harvard Gazette |
| U.S. / National | Guardian · NPR · AP News · PBS News · ProPublica · Harvard Gazette |
| Politics | BBC · NPR · Guardian · PBS News · ProPublica |
| Immigration | Guardian |
| Legal & Justice | Guardian · The Marshall Project |
| Military & Defense | Guardian |
| Crime & Safety | Guardian · The Marshall Project |

### Business & Money
| Topic | Sources |
|---|---|
| Business & Finance | BBC · NPR · Guardian · PBS News · Yahoo Finance · Harvard Gazette · MIT News |
| Personal Finance | Guardian |
| Real Estate & Housing | Guardian |
| Labor & Work | Guardian |

### Tech & Science
| Topic | Sources |
|---|---|
| Technology | BBC · NPR · Guardian · Yahoo Tech · MIT News · Harvard Gazette |
| AI | Guardian · OpenAI · Anthropic · Stanford Digital Economy Lab · MIT News |
| Cybersecurity | Guardian · MIT News |
| Science | BBC · NPR · Guardian · PBS News · MIT News · Harvard Gazette · Princeton University |
| Space | Guardian · MIT News |

### Environment & Energy
| Topic | Sources |
|---|---|
| Climate & Environment | Guardian · BBC · MIT News |
| Weather | Guardian |
| Energy | Guardian · MIT News |

### Health & Wellbeing
| Topic | Sources |
|---|---|
| Health | BBC · NPR · Guardian · PBS News · MIT News · Harvard Gazette |
| Wellness & Mental Health | Guardian |

### Culture & Entertainment
| Topic | Sources |
|---|---|
| Entertainment | Guardian |
| Arts & Culture | Guardian · Harvard Gazette |
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
| Education | Guardian · NPR · Harvard Gazette · Northwestern Now · Princeton University · Penn Today · Vanderbilt University · Johns Hopkins Hub · The Stanford Daily |
| Media & Press | Guardian |

## The 20 sources

**Rock-solid official feeds:** BBC · NPR · The Guardian · PBS News · ProPublica ·
The Marshall Project · OpenAI · Yahoo Finance

**University publications (free, public-facing `.edu` newsrooms + one student paper):**
- **MIT News** — the newsroom's per-topic RSS (AI, cybersecurity, health, space,
  climate, energy, economics), so it slots into fine categories directly.
- **Harvard Gazette** — per-section feeds (science & tech, health, business & economy,
  arts & humanities, nation & world) plus the main feed.
- **Johns Hopkins Hub**, **Northwestern Now**, **Princeton University**,
  **Penn Today**, **Vanderbilt University** — each school's general campus newsroom.
- **The Stanford Daily** — Stanford's independent student newspaper (public-facing
  campus journalism, the student-paper counterpart to the research newsrooms).

  These are the universities' *own* public sites — research updates written for a general
  audience and campus news — deliberately **not** academic-journal databases, so the
  reading stays approachable.

**Best-effort (may occasionally run dry):**
- **AP News** — third-party mirror (AP shut down its public RSS).
- **Yahoo Tech** — Engadget, Yahoo's tech publication (Yahoo's own tech feed is defunct).
- **Anthropic** & **Stanford Digital Economy Lab** — Google News topic feeds (news
  *about* them from many outlets; neither publishes its own RSS).

## Notes
- **AI** is the richest category (5 sources, incl. OpenAI direct and MIT News).
- **Wired was removed** — it sits behind a metered paywall, and Reading Gate only serves
  free-to-read sources so a gated article never blocks an unlock. Its former slots
  (Technology, AI, Cybersecurity, Science) are now filled by MIT News and the others.
- Most of **Culture**, **Life**, and several niche topics are **Guardian-only** — its
  section/tag taxonomy is deep enough to cover them. Add a second source to any of them
  by extending `CATALOG` in `extension/src/lib/feeds.js`.
- Guardian queries use the free **Open Platform** API by section or tag; the built-in
  `test` key is rate-limited — a free key raises the limit (see README).
