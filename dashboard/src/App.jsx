import { Routes, Route, Navigate } from "react-router-dom";
import { isConfigured } from "./lib/supabase.js";
import { useAuth } from "./lib/auth.jsx";
import Nav from "./components/Nav.jsx";
import Login from "./pages/Login.jsx";
import Overview from "./pages/Overview.jsx";
import Library from "./pages/Library.jsx";
import Settings from "./pages/Settings.jsx";
import ImpulseHistory from "./pages/ImpulseHistory.jsx";

function NotConfigured() {
  return (
    <div className="center-screen">
      <div className="card" style={{ maxWidth: 520 }}>
        <h3>Almost there</h3>
        <p className="muted">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in a{" "}
          <code>.env.local</code> file (see <code>.env.example</code>), then restart the dev server.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (!isConfigured) return <NotConfigured />;
  if (loading) return <div className="center-screen"><div className="loading">Loading…</div></div>;
  if (!user) return <Login />;

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
