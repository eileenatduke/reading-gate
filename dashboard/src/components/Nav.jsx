import { NavLink } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="brand"><span className="dot" /> Read First</div>
      <NavLink to="/" end>Overview</NavLink>
      <NavLink to="/library">Library</NavLink>
      <NavLink to="/settings">Settings</NavLink>
      <div className="spacer" />
      <button className="signout" onClick={() => supabase.auth.signOut()}>Log out</button>
    </nav>
  );
}
