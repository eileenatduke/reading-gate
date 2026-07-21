import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function Login() {
  const [mode, setMode] = useState("in"); // "in" (log in) | "up" (sign up)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const clear = () => { setErr(""); setMsg(""); };

  async function submitEmail(e) {
    e.preventDefault();
    clear(); setBusy(true);
    try {
      const { data, error } =
        mode === "in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // If email confirmation is on, signUp returns no session until confirmed.
      if (mode === "up" && !data.session) {
        setMsg("Check your email to confirm your account, then log in.");
      }
      // On success with a session, the auth listener swaps in the dashboard.
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === "up";

  return (
    <div className="rg-auth">
      <Link className="rg-back" to="/">← Back</Link>
      <div className="rg-auth-scroll">
        <div className="rg-auth-card">
          <h1 className="rg-auth-title">{isSignup ? "Create account" : "Welcome back"}</h1>
          <p className="rg-auth-sub">
            {isSignup ? "Sign up for Reading Gate." : "Log in to your Reading Gate dashboard."}
          </p>

          {err && <p className="rg-msg err">{err}</p>}
          {msg && <p className="rg-msg ok">{msg}</p>}

          <form onSubmit={submitEmail}>
            <div className="rg-field">
              <input id="rg-email" className="rg-input" type="email" required
                placeholder="Email address" aria-label="Email address" value={email} autoComplete="username"
                onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="rg-field">
              <input id="rg-pass" className="rg-input" type="password" required minLength={6}
                placeholder="Password" aria-label="Password" value={password}
                autoComplete={isSignup ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="rg-submit" type="submit" disabled={busy}>
              {busy ? "…" : isSignup ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="rg-switch">
            {isSignup ? "Already have an account? " : "New to Reading Gate? "}
            <button type="button" onClick={() => { setMode(isSignup ? "in" : "up"); clear(); }}>
              {isSignup ? "Log in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
