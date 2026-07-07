import { useMemo } from "react";
import { sourceScorecard } from "../lib/data.js";
import Stars from "./Stars.jsx";

// Which sources the user rates highest on quality + interest (Spec §8).
export default function SourceScorecard({ reading }) {
  const rows = useMemo(() => sourceScorecard(reading), [reading]);
  return (
    <section className="card">
      <h2>Source scorecard</h2>
      <p className="sub">Which sources you rate highest.</p>
      {rows.length === 0 ? (
        <p className="muted">No reads yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 320 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 13 }}>
              <th style={{ padding: "6px 0", fontWeight: 500 }}>Source</th>
              <th style={{ fontWeight: 500 }}>Quality</th>
              <th style={{ fontWeight: 500 }}>Interest</th>
              <th style={{ textAlign: "right", fontWeight: 500 }}>Read</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "9px 0", fontWeight: 600 }}>{r.source}</td>
                <td><Stars value={r.quality} label={`${r.source} quality`} /></td>
                <td><Stars value={r.interest} label={`${r.source} interest`} /></td>
                <td style={{ textAlign: "right", color: "var(--muted)" }}>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </section>
  );
}
