import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

// Brand glyphs for the OAuth buttons (inline so there's no asset/CSP dependency).
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
function OutlookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0A2767" d="M23 6.5v11c0 .55-.45 1-1 1h-8.5V5.5H22c.55 0 1 .45 1 1z" />
      <path fill="#0364B8" d="M23 7l-9 5.5L9 9.5 23 7z" opacity=".9" />
      <rect x="1" y="4" width="13" height="16" rx="1.2" fill="#0078D4" />
      <path fill="#fff" d="M7.5 8.4c-1.9 0-3.2 1.5-3.2 3.6s1.3 3.6 3.2 3.6 3.2-1.5 3.2-3.6S9.4 8.4 7.5 8.4zm0 5.7c-1 0-1.7-.9-1.7-2.1s.7-2.1 1.7-2.1 1.7.9 1.7 2.1-.7 2.1-1.7 2.1z" />
    </svg>
  );
}

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

  async function oauth(provider) {
    clear(); setBusy(true);
    try {
      const opts = { redirectTo: window.location.origin };
      if (provider === "azure") opts.scopes = "email openid profile";
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: opts });
      if (error) throw error;
      // Redirects away to the provider; nothing more to do here.
    } catch (e2) {
      setErr(e2.message);
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

          <div className="rg-oauth">
            <button type="button" className="rg-oauth-btn" disabled={busy} onClick={() => oauth("google")}>
              <GoogleIcon /> Continue with Google
            </button>
            <button type="button" className="rg-oauth-btn" disabled={busy} onClick={() => oauth("azure")}>
              <OutlookIcon /> Continue with Outlook
            </button>
          </div>

          <div className="rg-divider">or</div>

          <form onSubmit={submitEmail}>
            <div className="rg-field">
              <label className="rg-label" htmlFor="rg-email">Email</label>
              <input id="rg-email" className="rg-input" type="email" required
                placeholder="you@example.com" value={email} autoComplete="username"
                onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="rg-field">
              <label className="rg-label" htmlFor="rg-pass">Password</label>
              <input id="rg-pass" className="rg-input" type="password" required minLength={6}
                placeholder="••••••••" value={password}
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
