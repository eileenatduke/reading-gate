import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { THEMES, DEFAULT_THEME, isValidTheme, computeVars } from "./themes.js";
import { supabase } from "./supabase.js";

const KEY = "rg_theme";
const ThemeCtx = createContext({ theme: DEFAULT_THEME, setTheme: () => {}, isGlass: true });

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
  const [theme, setThemeState] = useState(() => {
    try { const s = localStorage.getItem(KEY); if (s && isValidTheme(s)) return s; } catch {}
    return DEFAULT_THEME;
  });

  // Reconcile with the theme saved in the user's auth metadata (cross-surface
  // source of truth — the extension gate reads the same place). No DB migration.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const t = data?.user?.user_metadata?.theme;
      if (t && isValidTheme(t)) setThemeState(t);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { apply(theme); }, [theme]);

  const setTheme = useCallback((key) => {
    if (!isValidTheme(key)) return;
    setThemeState(key);
    try { localStorage.setItem(KEY, key); } catch {}
    // Persist to auth metadata so the extension gate picks up the same theme.
    supabase.auth.updateUser({ data: { theme: key } }).then(() => {}, () => {});
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, isGlass: THEMES[theme].group === "glass" }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
