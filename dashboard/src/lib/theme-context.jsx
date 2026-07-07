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

  // Reconcile with the user's saved profile theme (cross-surface source of truth).
  useEffect(() => {
    let cancelled = false;
    supabase.from("profiles").select("theme").maybeSingle().then(({ data }) => {
      if (cancelled) return;
      const t = data?.theme;
      if (t && isValidTheme(t) && t !== theme) setThemeState(t);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { apply(theme); }, [theme]);

  const setTheme = useCallback((key) => {
    if (!isValidTheme(key)) return;
    setThemeState(key);
    try { localStorage.setItem(KEY, key); } catch {}
    // Save to the profile so the extension gate matches. Ignore if the column
    // hasn't been added yet (migration 0002) — the app still works locally.
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (uid) supabase.from("profiles").update({ theme: key }).eq("user_id", uid).then(() => {}, () => {});
    });
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, isGlass: THEMES[theme].group === "glass" }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
