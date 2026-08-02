import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchReadingLog, fetchImpulseLog, impulsesThisWeek, currentStreak,
  streakMood, growthStage, articlesToNextFlower, flowerCount,
} from "../lib/data.js";
import { Seedling } from "../components/garden/flowers.jsx";
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
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([fetchReadingLog(), fetchImpulseLog()])
      .then(([r, i]) => { setReading(r); setImpulses(i); })
      .catch((e) => setErr(e.message));
  }, []);

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (err) return <div className="loading">Couldn't load data: {err}</div>;
  if (reading === null) return <div className="loading">Loading…</div>;

  const mood = streakMood(reading);
  const flowers = flowerCount(reading);
  const toNext = articlesToNextFlower(reading);
  const gardenCaption =
    reading.length === 0 ? "Read 5 articles to grow your first flower 🌱"
      : flowers === 0 ? `${toNext} more to grow your first flower 🌱`
        : `${flowers} flower${flowers === 1 ? "" : "s"} grown, ${toNext} to your next 🌸`;

  return (
    <div className="overview-paper">
      <div className="overview-shell">
        <div className="page-head">
          <div>
            <h1 className="page-title">Overview</h1>
            <p className="page-sub">A snapshot of your reading habits.</p>
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>{today}</div>
        </div>

        <div className="ov-label">Your progress</div>
        <div className="ov-progress">
          <PaperArticlesChart reading={reading} />
          <div className="ov-statcol">
            <PaperStatCard
              value={reading.length}
              label="Articles read"
              adornment={<Seedling stage={growthStage(reading)} size={44} className="stat-seedling" />}
              caption={gardenCaption}
              cta="See your garden"
              onClick={() => nav("/garden")}
            />
            <PaperStatCard
              value={currentStreak(reading)}
              label="Day streak"
              adornment={<span className="mood-emoji" role="img" aria-label={mood.key}>{mood.emoji}</span>}
              caption={mood.caption}
            />
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
