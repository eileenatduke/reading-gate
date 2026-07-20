import { Routes, Route, Navigate } from "react-router-dom";
import { isConfigured } from "./lib/supabase.js";
import { useAuth } from "./lib/auth.jsx";
import Landing from "./pages/Landing.jsx";
import About from "./pages/About.jsx";
import Privacy from "./pages/Privacy.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./Dashboard.jsx";

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

// Top-level routing:
//   /            → Landing (marketing hero) when logged out; Dashboard when logged in
//   /about       → About (public placeholder)
//   /login       → Auth (Google / email + password); redirects home if logged in
//   everything else while logged in → Dashboard (its own nested routes)
export default function App() {
  const { user, loading } = useAuth();

  if (!isConfigured) return <NotConfigured />;
  if (loading) return <div className="center-screen"><div className="loading">Loading…</div></div>;

  return (
    <Routes>
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      {user ? (
        <Route path="/*" element={<Dashboard />} />
      ) : (
        <>
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}
