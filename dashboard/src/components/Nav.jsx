import { NavLink } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function Nav() {
  return (
    <aside className="nav">
      <div className="nav-inner">
        <div className="brand"><span className="dot" /> <span className="name">Foyer</span></div>
        <NavLink to="/" end><span>◐</span> Overview</NavLink>
        <NavLink to="/library"><span>▤</span> Library</NavLink>
        <NavLink to="/settings"><span>⚙</span> Settings</NavLink>
        <div className="nav-spacer" />
        <button className="navbtn" onClick={() => supabase.auth.signOut()}><span>→</span> Log out</button>
      </div>
    </aside>
  );
}
