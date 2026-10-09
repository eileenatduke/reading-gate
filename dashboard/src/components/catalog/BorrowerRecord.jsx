import { Link } from "react-router-dom";
import { currentStreak, streakMood, impulsesThisWeek } from "../../lib/data.js";

// The four headline numbers. Reading numbers open the reading-stats drill-in;
// impulse numbers open the impulse history.
export default function BorrowerRecord({ reading, impulses }) {
  const streak = currentStreak(reading);
  const mood = streakMood(reading).caption;
  const caption = mood.charAt(0).toLowerCase() + mood.slice(1);
  const stats = [
    { to: "/reading", value: reading.length, label: reading.length === 1 ? "article on file" : "articles on file" },
    { to: "/reading", value: streak, label: `day streak · ${caption}` },
    { to: "/impulses", value: impulsesThisWeek(impulses), label: "impulses this week" },
    { to: "/impulses", value: impulses.length, label: "impulses all-time" },
  ];

  return (
    <section className="cc-card cc-tilt-r">
      <div className="cc-head"><h2 className="cc-title">Borrower record</h2></div>
      <div className="cc-stats">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="cc-stat">
            <div className="cc-num">{s.value}</div>
            <div className="cc-stat-label">{s.label}</div>
          </Link>
        ))}
      </div>
      <div className="cc-stamp active" aria-hidden="true">{streak > 0 ? "ACTIVE" : "LAPSED"}</div>
    </section>
  );
}
