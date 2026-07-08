import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchReadingLog, fetchImpulseLog, impulsesThisWeek, currentStreak } from "../lib/data.js";
import StatCard from "../components/StatCard.jsx";
import ArticleCountChart from "../components/ArticleCountChart.jsx";
import GenreChart from "../components/GenreChart.jsx";
import Heatmap from "../components/Heatmap.jsx";
import SerendipityCard from "../components/SerendipityCard.jsx";
import SourceScorecard from "../components/SourceScorecard.jsx";

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

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-sub">Your reading, at a glance.</p>
        </div>
        <div style={{ textAlign: "right", color: "var(--faint)", fontSize: 13 }}>
          <div style={{ fontWeight: 600, color: "var(--muted)", fontSize: 14 }}>{today}</div>
        </div>
      </div>

      <div className="grid stats">
        <StatCard value={impulsesThisWeek(impulses)} label="Impulses this week" delta="history →" deltaAccent onClick={() => nav("/impulses")} />
        <StatCard value={currentStreak(reading)} label="Day streak" />
        <StatCard value={reading.length} label="Articles read" />
        <StatCard value={impulses.length} label="Impulses all-time" />
      </div>

      <ArticleCountChart reading={reading} />

      <div className="grid bottom" style={{ marginBottom: 20 }}>
        <GenreChart reading={reading} />
        <Heatmap impulses={impulses} />
      </div>

      <div className="grid bottom" style={{ marginBottom: 20 }}>
        <SerendipityCard reading={reading} />
        <SourceScorecard reading={reading} />
      </div>
    </>
  );
}
