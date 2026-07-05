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

  if (err) return <div className="loading">Couldn't load data: {err}</div>;
  if (reading === null) return <div className="loading">Loading…</div>;

  return (
    <>
      <h1 className="page-title">Overview</h1>

      <div className="grid cols-4" style={{ marginBottom: 24 }}>
        <StatCard value={impulsesThisWeek(impulses)} label="Impulses this week" onClick={() => nav("/impulses")} />
        <StatCard value={currentStreak(reading)} label="Day streak" />
        <StatCard value={reading.length} label="Articles read" />
        <StatCard value={impulses.length} label="Impulses all time" />
      </div>

      <div style={{ marginBottom: 24 }}>
        <ArticleCountChart reading={reading} />
      </div>

      <div className="grid cols-2" style={{ marginBottom: 24 }}>
        <GenreChart reading={reading} />
        <SerendipityCard reading={reading} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Heatmap impulses={impulses} />
      </div>

      <SourceScorecard reading={reading} />
    </>
  );
}
