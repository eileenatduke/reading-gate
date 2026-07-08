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

  // Reconcile with the theme saved in the user's auth metadata (shared with the gate).
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
