import { useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(mode) {
    setErr(""); setMsg(""); setBusy(true);
    try {
      const fn = mode === "in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
      const { data, error } = await fn;
      if (error) throw error;
      if (mode === "up" && !data.session) setMsg("Check your email to confirm your account.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card" style={{ width: 360 }}>
        <div className="brand" style={{ marginBottom: 24 }}>Reading Gate</div>
        {err && <p style={{ color: "var(--danger)", fontSize: "var(--fs-sm)" }}>{err}</p>}
        {msg && <p style={{ color: "var(--success)", fontSize: "var(--fs-sm)" }}>{msg}</p>}
        <input className="input" style={{ width: "100%", marginBottom: 12 }} type="email"
          placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <input className="input" style={{ width: "100%", marginBottom: 16 }} type="password"
          placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <button className="btn" style={{ width: "100%", marginBottom: 8 }} disabled={busy}
          onClick={() => submit("in")}>Log in</button>
        <button className="btn ghost" style={{ width: "100%" }} disabled={busy}
          onClick={() => submit("up")}>Create account</button>
      </div>
    </div>
  );
}
