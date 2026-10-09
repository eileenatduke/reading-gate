import { Link } from "react-router-dom";
import { resistThisWeek } from "../../lib/data.js";

// "Did you resist the site?" — of this week's completed gates, the share that ended
// anywhere but the site. Opens the impulse history, which has the full chart.
export default function ResistCard({ impulses }) {
  const { total, resisted, pct } = resistThisWeek(impulses);
  const copy =
    total === 0 ? "No completed gates this week yet. Finish a reading goal and it shows up here."
      : resisted === 0 ? "This week you finished your reading goal, then went to the site every time."
        : resisted === total ? "This week you finished your reading goal and skipped the site every time."
          : `This week you skipped the site ${resisted} of the ${total} times you finished your reading goal.`;

  return (
    <Link to="/impulses" className="cc-card manila cc-tilt-l">
      <div className="cc-head"><h2 className="cc-title">Did you resist the site?</h2></div>
      <p className="cc-resist-copy">{copy}</p>
      <span className="cc-more">See the full history →</span>
      <div className="cc-stamp double" aria-label={pct == null ? "No data" : `${pct}% resisted`}>
        {pct == null ? "—" : pct + "%"}<small>RESISTED</small>
      </div>
    </Link>
  );
}
