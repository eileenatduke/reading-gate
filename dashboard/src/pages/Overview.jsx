import { useEffect, useState } from "react";
import { fetchReadingLog, fetchImpulseLog } from "../lib/data.js";
import DueSlip from "../components/catalog/DueSlip.jsx";
import RecentReads from "../components/catalog/RecentReads.jsx";
import BorrowerRecord from "../components/catalog/BorrowerRecord.jsx";
import ResistCard from "../components/catalog/ResistCard.jsx";
import Shelf from "../components/catalog/Shelf.jsx";
import DoomscrollCard from "../components/catalog/DoomscrollCard.jsx";

// Overview — "Card Catalog" design: index cards on the desk, all from live Supabase data.
// Impulse cards open /impulses.
export default function Overview() {
  const [reading, setReading] = useState(null);
  const [impulses, setImpulses] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([fetchReadingLog(), fetchImpulseLog()])
      .then(([r, i]) => { setReading(r); setImpulses(i); })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="loading">Couldn't load data: {err}</div>;
  if (reading === null) return <div className="loading">Loading…</div>;

  return (
    <>
      <h1 className="sr-only">Overview</h1>
      <div className="cc-grid">
        <div className="cc-col">
          <DueSlip reading={reading} />
          <RecentReads reading={reading} limit={10} />
        </div>
        <div className="cc-col">
          <BorrowerRecord reading={reading} impulses={impulses} />
          <ResistCard impulses={impulses} />
          <Shelf reading={reading} />
        </div>
      </div>
      <div className="cc-wide">
        <DoomscrollCard impulses={impulses} />
      </div>
    </>
  );
}
