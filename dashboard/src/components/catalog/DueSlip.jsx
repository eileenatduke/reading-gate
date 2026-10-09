import { Link } from "react-router-dom";
import { articleCountSeries, startOfWeek } from "../../lib/data.js";

// "Date due slip" — this week's reads, one stamped box per day (Mon–Sun), with the
// running total underneath. The whole card opens the reading-stats drill-in.
export default function DueSlip({ reading }) {
  const days = articleCountSeries(reading, "week");
  const todayIdx = (new Date().getDay() + 6) % 7;
  const weekOf = startOfWeek().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <Link to="/reading" className="cc-card cc-ruled cc-tilt-l">
      <div className="cc-head red">
        <h2 className="cc-title lg">Articles read — date due slip</h2>
        <span className="cc-head-note">Week of {weekOf}</span>
      </div>
      <div className="cc-slip">
        {days.map((d, i) => (
          <div key={d.label} className={"cc-day" + (i === todayIdx ? " today" : "")}>
            <span className="cc-day-label">{d.label.toUpperCase()}</span>
            <span className={"cc-day-count" + (d.count > 0 ? " stamped" : "")}>
              {d.future ? "" : d.count > 0 ? d.count : "–"}
            </span>
            <span className="cc-day-cum">{d.future ? "" : "Σ " + d.cumulative}</span>
          </div>
        ))}
      </div>
      <div className="cc-foot">
        <span>{total} this week · Σ = running total</span>
        <span className="cc-more">All reading stats →</span>
      </div>
    </Link>
  );
}
