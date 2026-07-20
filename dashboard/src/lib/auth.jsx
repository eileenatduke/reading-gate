import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const AuthCtx = createContext({ user: null, loading: true });

// If the extension handed us a session in the URL hash (#access_token=…&refresh_token=…),
// adopt it so the user arrives already signed in with the same account they created in the
// extension popup — no second login. We use the hash (never the query string) so the tokens
// are never sent to the server, matching Supabase's own OAuth-redirect convention, then strip
// them from the address bar immediately so they can't be bookmarked, shared, or left behind.
async function consumeSessionFromHash() {
  if (!window.location.hash) return;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return;
  try {
    await supabase.auth.setSession({ access_token, refresh_token });
  } catch {
    // Invalid/expired handoff — fall through to normal logged-out handling.
  } finally {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // Adopt an extension handoff (if any) before reading the session, so the very first
      // render already reflects the signed-in user and we never flash the logged-out landing.
      await consumeSessionFromHash();
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setUser(data.session?.user || null);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return <AuthCtx.Provider value={{ user, loading }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
