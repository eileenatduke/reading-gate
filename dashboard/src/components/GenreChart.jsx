import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { genreDistribution } from "../lib/data.js";

const c = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Horizontal, single-hue, sorted descending (Spec §8) — a "who's biggest" comparison.
export default function GenreChart({ reading }) {
  const data = useMemo(() => genreDistribution(reading), [reading]);
  return (
    <div className="card">
      <h3>Genre distribution</h3>
      {data.length === 0 ? (
        <p className="muted">No reads yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 42)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid stroke={c("--border")} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: c("--text-muted"), fontSize: 12 }} />
            <YAxis type="category" dataKey="genre" width={90} tick={{ fill: c("--text"), fontSize: 12 }} />
            <Tooltip cursor={{ fill: c("--surface-2") }}
              contentStyle={{ background: c("--surface"), border: `1px solid ${c("--border")}`, borderRadius: 10, color: c("--text") }} />
            <Bar dataKey="count" name="Articles" fill={c("--chart-1")} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
