import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchReadingLog, flowerCount, growthStage, articlesToNextFlower } from "../lib/data.js";
import { Flower, Seedling, flowerDesign } from "../components/garden/flowers.jsx";

// The reading garden — reached by clicking the Articles-read card on Overview.
// Every five completed reads grows one flower; here they're laid out as a meadow that
// fills in as you read. Designs are stable per flower (flowerDesign(index)).
export default function Garden() {
  const [reading, setReading] = useState(null);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    fetchReadingLog().then(setReading).catch((e) => setErr(e.message));
  }, []);

  const flowers = useMemo(() => {
    const n = reading ? flowerCount(reading) : 0;
    return Array.from({ length: n }, (_, i) => ({ i, design: flowerDesign(i) }));
  }, [reading]);

  if (err) return <div className="loading">Couldn't load your garden: {err}</div>;
  if (reading === null) return <div className="loading">Loading…</div>;

  const stage = growthStage(reading);
  const toNext = articlesToNextFlower(reading);

  return (
    <>
      <button className="btn ghost" style={{ marginBottom: 20 }} onClick={() => nav("/")}>← Overview</button>
      <div className="page-head">
        <div>
          <h1 className="page-title">Your garden</h1>
          <p className="page-sub">
            {flowers.length === 0
              ? "Read five articles to grow your first flower. Every five reads adds one to the garden."
              : `${flowers.length} flower${flowers.length === 1 ? "" : "s"} grown from ${reading.length} articles read — one for every five.`}
          </p>
        </div>
      </div>

      <div className="card garden-card">
        {flowers.length === 0 ? (
          <div className="garden-empty">
            <Seedling stage={stage} size={92} />
            <p className="muted" style={{ marginTop: 12 }}>
              Your first seed is planted — {toNext} more {toNext === 1 ? "read" : "reads"} to your first bloom.
            </p>
          </div>
        ) : (
          <>
            <div className="meadow">
              {flowers.map((f) => (
                <div className="plot" key={f.i} style={{ "--e": `${(f.i % 24) * 0.05}s` }}>
                  <Flower design={f.design} size={84} />
                </div>
              ))}
            </div>
            {/* The in-progress seedling for the flower currently growing. */}
            {stage > 0 && (
              <div className="garden-growing">
                <Seedling stage={stage} size={54} />
                <span className="muted">
                  Growing now — {toNext} more {toNext === 1 ? "read" : "reads"} to your next flower.
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
