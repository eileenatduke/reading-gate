import { useMemo } from "react";
import { serendipity } from "../lib/data.js";
import Stars from "./Stars.jsx";

// How the user rated the 1-in-10 "outside your interests" picks.
export default function SerendipityCard({ reading }) {
  const s = useMemo(() => serendipity(reading), [reading]);
  return (
    <section className="card">
      <h2>Serendipity tracker</h2>
      <p className="sub">The 1-in-10 wildcard picks from outside your interests.</p>
      {s.count === 0 ? (
        <p className="muted">No wildcard articles yet — you'll hit your first around your 10th read.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 32, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <div className="serif" style={{ fontSize: 40, lineHeight: 1 }}>{s.count}</div>
              <div className="muted" style={{ fontSize: 13 }}>wildcards read</div>
            </div>
            <div>
              <div style={{ fontSize: 22 }}><Stars value={s.avgInterest} label="Avg interest" /></div>
              <div className="muted" style={{ fontSize: 13 }}>avg interest</div>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 13.5 }}>
            {s.avgInterest >= 3.5
              ? "You tend to enjoy the wildcards — worth widening your interests."
              : "Wildcards land less often for you, but they keep the feed from narrowing."}
          </div>
        </>
      )}
    </section>
  );
}
