import { genreDistribution } from "../../lib/data.js";

// Book-spine colors, one per genre on the shelf (the last is for "Other").
const COLORS = ["#1B2A6B", "#B3261E", "#2F5D46", "#8A5A1E", "#5B3A8C", "#4A4A4A"];
const HEIGHTS = [92, 78, 100, 84, 72, 96, 80];
const MAX_GENRES = 5;     // more than this and the rest fold into "Other"
const MAX_BOOKS = 18;     // what fits on one shelf; past this, each spine stands for several articles

// "Your shelf" — one book spine per article read, grouped and colored by genre.
export default function Shelf({ reading }) {
  const dist = genreDistribution(reading);
  const top = dist.slice(0, MAX_GENRES);
  const rest = dist.slice(MAX_GENRES).reduce((s, g) => s + g.count, 0);
  const groups = rest ? [...top, { genre: "Other", count: rest }] : top;
  const per = Math.max(1, Math.ceil(reading.length / MAX_BOOKS));

  const books = [];
  groups.forEach((g, gi) => {
    const n = Math.max(1, Math.round(g.count / per));
    for (let i = 0; i < n; i++) {
      books.push({
        key: g.genre + i, title: i === 0 ? g.genre : "", color: COLORS[gi] || COLORS[COLORS.length - 1],
        h: HEIGHTS[books.length % HEIGHTS.length], w: i === 0 ? 22 : 16,
      });
    }
  });

  return (
    <section className="cc-card cc-tilt-s">
      <div className="cc-head"><h2 className="cc-title">Subject headings · your shelf</h2></div>
      {reading.length === 0 ? (
        <p className="cc-note">Your shelf is empty. Every article you read adds a book.</p>
      ) : (
        <>
          <div className="cc-shelf" role="img" aria-label={groups.map((g) => `${g.genre}: ${g.count}`).join(", ")}>
            {books.map((b) => (
              <div key={b.key} className="cc-book" style={{ width: b.w, height: b.h, background: b.color }}>
                {b.title && <span>{b.title}</span>}
              </div>
            ))}
          </div>
          <div className="cc-key">
            {groups.map((g, gi) => (
              <span key={g.genre}><i style={{ color: COLORS[gi] || COLORS[COLORS.length - 1] }}>■</i> {g.genre} {g.count}</span>
            ))}
            {per > 1 && <span className="muted">· each book = {per} articles</span>}
          </div>
        </>
      )}
    </section>
  );
}
