import { useEffect, useState } from "react";
import { fetchReadingLog, fetchImpulseLog, impulsesThisWeek, currentStreak } from "../lib/data.js";
import PaperStatCard from "../components/paper/PaperStatCard.jsx";
import PaperArticlesChart from "../components/paper/PaperArticlesChart.jsx";
import PaperCrossoverChart from "../components/paper/PaperCrossoverChart.jsx";
import PaperGenreBars from "../components/paper/PaperGenreBars.jsx";
import PaperImpulseHistory from "../components/paper/PaperImpulseHistory.jsx";
import PaperHeatmap from "../components/paper/PaperHeatmap.jsx";

// Overview — warm-paper design ported from the Claude Design project
// "Reading Gate Dashboard.dc.html", wired to real Supabase data.
export default function Overview() {
  const [reading, setReading] = useState(null);
  const [impulses, setImpulses] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([fetchReadingLog(), fetchImpulseLog()])
      .then(([r, i]) => { setReading(r); setImpulses(i); })
      .catch((e) => setErr(e.message));
  }, []);

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (err) return <div className="loading">Couldn't load data: {err}</div>;
  if (reading === null) return <div className="loading">Loading…</div>;

  return (
    <div className="overview-paper">
      <div className="overview-shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 26 }}>
          <h1 style={{ margin: 0, fontFamily: "'Instrument Serif',Georgia,serif", fontWeight: 400, fontSize: 40, lineHeight: 1, color: "var(--text)" }}>Overview</h1>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>{today}</div>
        </div>

        <div className="ov-label">Your progress</div>
        <div className="ov-progress">
          <PaperArticlesChart reading={reading} />
          <div className="ov-statcol">
            <PaperStatCard value={reading.length} label="Articles read" />
            <PaperStatCard value={currentStreak(reading)} label="Day streak" />
            <PaperStatCard value={impulsesThisWeek(impulses)} label="Impulses this week" />
            <PaperStatCard value={impulses.length} label="Impulses all-time" />
          </div>
          <PaperCrossoverChart impulses={impulses} />
          <PaperGenreBars reading={reading} />
        </div>

        <div className="ov-label">Habits</div>
        <div className="ov-habits">
          <PaperImpulseHistory impulses={impulses} />
          <PaperHeatmap impulses={impulses} />
        </div>
      </div>
    </div>
  );
}
