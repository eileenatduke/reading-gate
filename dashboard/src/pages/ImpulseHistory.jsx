import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchImpulseLog, impulseWeekly } from "../lib/data.js";

const c = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Drill-in reached by clicking the Impulse counter on Overview (Spec §8):
// all weekly impulse counts since day one.
export default function ImpulseHistory() {
  const [impulses, setImpulses] = useState(null);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    fetchImpulseLog().then(setImpulses).catch((e) => setErr(e.message));
  }, []);

  const data = useMemo(() => impulseWeekly(impulses || []), [impulses]);

  if (err) return <div className="loading">Error: {err}</div>;
  if (impulses === null) return <div className="loading">Loading…</div>;

  return (
    <>
      <button className="btn ghost" style={{ marginBottom: 16 }} onClick={() => nav("/")}>← Overview</button>
      <h1 className="page-title">Impulse history</h1>
      <p className="muted" style={{ marginTop: -12, marginBottom: 24 }}>
        Every gate trigger, bucketed by week — including the times you bailed without reading.
      </p>

      <div className="card">
        {data.length === 0 ? (
          <p className="muted">No gate triggers yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid stroke={c("--border")} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: c("--muted"), fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: c("--muted"), fontSize: 12 }} />
              <Tooltip contentStyle={{ background: c("--surface"), border: `1px solid ${c("--border")}`, borderRadius: 10, color: c("--text") }} />
              <Legend />
              <Bar dataKey="total" name="Impulses" fill={c("--accent")} radius={[4, 4, 0, 0]} maxBarSize={48} />
              <Bar dataKey="completed" name="Completed" fill={c("--accent2")} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
