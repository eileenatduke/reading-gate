import { Routes, Route, Navigate } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Overview from "./pages/Overview.jsx";
import Library from "./pages/Library.jsx";
import Settings from "./pages/Settings.jsx";
import ImpulseHistory from "./pages/ImpulseHistory.jsx";

// The authenticated app shell: sidebar + the themed dashboard pages. Rendered
// only when a user is signed in. New users default to the Mono (black & white)
// theme; they can switch themes any time in Settings.
export default function Dashboard() {
  return (
    <div className="app">
      <GlassFilter />
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/library" element={<Library />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/impulses" element={<ImpulseHistory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// SVG displacement filter that gives the glass panels their subtle warp.
function GlassFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden="true">
      <filter id="glassWarp" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.009 0.013" numOctaves="2" seed="11" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="1" result="sn" />
        <feDisplacementMap in="SourceGraphic" in2="sn" scale="18" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
