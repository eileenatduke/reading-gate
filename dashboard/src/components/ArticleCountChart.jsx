import { useMemo, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { articleCountSeries } from "../lib/data.js";

const c = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Dual-axis on purpose (Spec §8): bars = articles per period (left), line = cumulative
// running total (right). Same underlying data, so the dual axis isn't misleading.
export default function ArticleCountChart({ reading }) {
  const [period, setPeriod] = useState("week");
  const data = useMemo(() => articleCountSeries(reading, period), [reading, period]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Articles read</h3>
        <div className="row">
          {["week", "month", "year"].map((p) => (
            <button
              key={p}
              className={"toggle" + (period === p ? " on" : "")}
              onClick={() => setPeriod(p)}
            >
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <p className="panel-sub">Bars: read each {period}. Line: cumulative total.</p>
      {data.length === 0 ? (
        <p className="muted">No reads yet — the chart fills in as you use the gate.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={c("--chart-grid") || c("--border")} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" tick={{ fill: c("--text-muted"), fontSize: 12 }} />
            <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: c("--text-muted"), fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fill: c("--text-muted"), fontSize: 12 }} />
            <Tooltip contentStyle={{ background: c("--surface"), border: `1px solid ${c("--border")}`, borderRadius: 10, color: c("--text") }} />
            <Legend />
            <Bar yAxisId="left" dataKey="count" name="Per period" fill={c("--chart-1")} radius={[4, 4, 0, 0]} maxBarSize={48} />
            <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative" stroke={c("--chart-2")} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
