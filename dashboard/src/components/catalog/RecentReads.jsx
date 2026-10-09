import { Link } from "react-router-dom";

// "Recently checked out" — the newest reads, linking out to each article.
export default function RecentReads({ reading, limit = 5 }) {
  const recent = reading.slice(-limit).reverse();
  return (
    <section className="cc-card cc-ruled cc-tilt-s cc-fill">
      <div className="cc-head red"><h2 className="cc-title lg">Recently checked out</h2></div>
      {recent.length === 0 ? (
        <p className="cc-note">Nothing yet — articles you read at the gate land here.</p>
      ) : (
        <ul className="cc-reads">
          {recent.map((r) => {
            const d = new Date(r.created_at);
            return (
              <li key={r.id} className="cc-read">
                <span className="cc-read-date">{String(d.getMonth() + 1).padStart(2, "0")}/{String(d.getDate()).padStart(2, "0")}</span>
                <a className="cc-read-title" href={r.article_url} target="_blank" rel="noopener noreferrer" title={r.article_title}>{r.article_title}</a>
                <span className="cc-read-genre">{r.genre}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="cc-foot"><span /><Link to="/library" className="cc-more">Open the library →</Link></div>
    </section>
  );
}
