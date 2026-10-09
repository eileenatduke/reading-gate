import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

// Overview's drill-in pages keep the Overview tab open.
const OVERVIEW_PATHS = ["/", "/impulses"];

// Top bar: a brass name plaque on the desk, and folder tabs for each page.
export default function Nav() {
  const { pathname } = useLocation();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-plaque">READING GATE</span>
        <span className="brand-sub">{today}</span>
      </div>
      <nav className="tabs" aria-label="Main">
        <NavLink to="/" className={() => (OVERVIEW_PATHS.includes(pathname) ? "active" : "")}
          aria-current={OVERVIEW_PATHS.includes(pathname) ? "page" : undefined}>Overview</NavLink>
        <NavLink to="/library">Library</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <button type="button" className="logout" onClick={() => supabase.auth.signOut()}>Log out</button>
      </nav>
    </header>
  );
}
