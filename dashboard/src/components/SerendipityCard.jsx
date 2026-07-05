import { useMemo } from "react";
import { serendipity } from "../lib/data.js";
import Stars from "./Stars.jsx";

// How the user rated the 1-in-10 "outside your interests" picks (Spec §8).
export default function SerendipityCard({ reading }) {
  const s = useMemo(() => serendipity(reading), [reading]);
  return (
    <div className="card">
      <h3>Serendipity tracker</h3>
      <p className="panel-sub">The 1-in-10 wildcard picks from outside your interests.</p>
      {s.count === 0 ? (
        <p className="muted">No wildcard articles yet — you'll hit your first around your 10th read.</p>
      ) : (
        <>
          <div className="row" style={{ gap: 32, marginBottom: 16 }}>
            <div className="stat"><span className="value">{s.count}</span><span className="label">wildcards read</span></div>
            <div className="stat"><span className="value" style={{ fontSize: "var(--fs-xl)" }}><Stars value={s.avgQuality} label="Avg quality" /></span><span className="label">avg quality</span></div>
            <div className="stat"><span className="value" style={{ fontSize: "var(--fs-xl)" }}><Stars value={s.avgInterest} label="Avg interest" /></span><span className="label">avg interest</span></div>
          </div>
          <div className="muted" style={{ fontSize: "var(--fs-sm)" }}>
            {s.avgInterest >= 3.5
              ? "You tend to enjoy the wildcards — worth widening your interests."
              : "Wildcards land less often for you, but they keep the feed from narrowing."}
          </div>
        </>
      )}
    </div>
  );
}
