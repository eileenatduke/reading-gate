import { useMemo } from "react";
import { sourceScorecard } from "../lib/data.js";
import Stars from "./Stars.jsx";

// Which sources the user rates highest on quality + interest (Spec §8).
export default function SourceScorecard({ reading }) {
  const rows = useMemo(() => sourceScorecard(reading), [reading]);
  return (
    <div className="card">
      <h3>Source scorecard</h3>
      {rows.length === 0 ? (
        <p className="muted">No reads yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
              <th style={{ padding: "6px 0" }}>Source</th>
              <th>Quality</th>
              <th>Interest</th>
              <th style={{ textAlign: "right" }}>Read</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 0", fontWeight: 600 }}>{r.source}</td>
                <td><Stars value={r.quality} label={`${r.source} quality`} /></td>
                <td><Stars value={r.interest} label={`${r.source} interest`} /></td>
                <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
