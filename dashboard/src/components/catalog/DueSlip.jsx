import { articleCountSeries, startOfWeek } from "../../lib/data.js";

// "Date due slip" — this week's reads, one stamped box per day (Mon–Sun), with the
// running total underneath.
export default function DueSlip({ reading }) {
  const days = articleCountSeries(reading, "week");
  const todayIdx = (new Date().getDay() + 6) % 7;
  const weekOf = startOfWeek().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <section className="cc-card cc-ruled cc-tilt-l">
      <div className="cc-head red">
        <h2 className="cc-title lg">Articles read</h2>
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
      </div>
    </section>
  );
}
