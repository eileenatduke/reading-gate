import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { THEMES, DEFAULT_THEME, isValidTheme, computeVars } from "./themes.js";
import { supabase } from "./supabase.js";

const KEY = "rg_theme";
const ThemeCtx = createContext({
  theme: DEFAULT_THEME, preview: () => {}, commit: () => {}, resetPreview: () => {}, isGlass: true,
});

function apply(key) {
  const vars = computeVars(key);
  const root = document.documentElement;
  for (const k in vars) root.style.setProperty(k, vars[k]);
  root.setAttribute("data-theme", key);
  root.setAttribute("data-theme-group", THEMES[key].group);
}

// Apply as early as possible (before React paints) to avoid a flash.
export function bootstrapTheme() {
  let k = DEFAULT_THEME;
  try { const s = localStorage.getItem(KEY); if (s && isValidTheme(s)) k = s; } catch {}
  apply(k);
  return k;
}

export function ThemeProvider({ children }) {
  // `theme` is the SAVED theme. Previews change the on-screen look without touching it.
  const [theme, setThemeState] = useState(() => {
    try { const s = localStorage.getItem(KEY); if (s && isValidTheme(s)) return s; } catch {}
    return DEFAULT_THEME;
  });
  const themeRef = useRef(theme);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  // Keep the theme tied to the CURRENTLY signed-in account, reacting to auth changes rather
  // than only reading once on mount. When a different account is handed off from the extension
  // (consumeSessionFromHash → setSession fires onAuthStateChange), reset to that account's saved
  // theme — or the Mono default if it never picked one. Reconciling once on mount was racy: it
  // could read the previous account's session (which may itself have a saved theme) before the
  // new session landed, leaking that account's theme — and a saved theme in this browser's
  // localStorage — into the freshly onboarded account.
  useEffect(() => {
    let lastUserId = null;
    const reconcile = (session) => {
      const u = session?.user;
      if (!u) { lastUserId = null; return; }
      if (u.id === lastUserId) return; // same account — don't clobber an in-progress preview
      lastUserId = u.id;
      const saved = u.user_metadata?.theme;
      const next = saved && isValidTheme(saved) ? saved : DEFAULT_THEME;
      setThemeState(next);
      // Sync this browser's cache to the active account so a reload doesn't repaint the
      // previous account's theme before we reconcile.
      try { localStorage.setItem(KEY, next); } catch {}
    };
    supabase.auth.getSession().then(({ data }) => reconcile(data.session)).catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => reconcile(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { apply(theme); }, [theme]);

  // Live preview — visual only, not persisted.
  const preview = useCallback((key) => { if (isValidTheme(key)) apply(key); }, []);
  // Revert the on-screen look to the last saved theme.
  const resetPreview = useCallback(() => { apply(themeRef.current); }, []);
  // Commit a theme locally (state + localStorage). The Settings page writes it to
  // auth metadata (together with other prefs) in a single call on Save.
  const commit = useCallback((key) => {
    if (!isValidTheme(key)) return;
    setThemeState(key);
    try { localStorage.setItem(KEY, key); } catch {}
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, preview, commit, resetPreview, isGlass: THEMES[theme].group === "glass" }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
