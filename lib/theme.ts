// Theme preference stored in localStorage under "theme": "light" | "dark" | "system".
// No stored value means dark (the app's original default).

export type ThemePreference = "light" | "dark" | "system";

export const THEME_EVENT = "tm-theme-change";

export function getThemePreference(): ThemePreference {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "system" ? t : "dark";
  } catch {
    return "dark";
  }
}

export function resolveDark(pref: ThemePreference) {
  if (pref === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches;
  return pref === "dark";
}

export function applyTheme(pref: ThemePreference) {
  try { localStorage.setItem("theme", pref); } catch { /* storage blocked */ }
  document.documentElement.classList.toggle("dark", resolveDark(pref));
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: pref }));
}
