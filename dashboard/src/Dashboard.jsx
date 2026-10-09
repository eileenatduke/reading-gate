import { Routes, Route, Navigate } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Overview from "./pages/Overview.jsx";
import Library from "./pages/Library.jsx";
import Settings from "./pages/Settings.jsx";
import ImpulseHistory from "./pages/ImpulseHistory.jsx";

// The authenticated app shell: folder-tab top bar + the card-catalog pages.
// Rendered only when a user is signed in.
export default function Dashboard() {
  return (
    <div className="app">
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
