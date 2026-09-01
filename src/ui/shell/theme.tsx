"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { resolveTheme, effectivePreference, type ThemePreference } from "./theme-resolve"

/**
 * App-wide theme control. Three-state preference chain (see theme-resolve):
 * the sidebar toggle is the user's LOCAL preference (light / dark / Auto,
 * where Auto follows the workspace's default appearance — which may itself
 * be "system" = the OS). The RESOLVED theme (light|dark) is always applied
 * to <html data-theme>; while the effective preference is "system", a
 * matchMedia listener re-resolves live when the OS appearance changes —
 * without touching the persisted preference. A pre-paint script in the app
 * layout runs the same chain so first paint is already correct.
 */

export type ThemeChoice = ThemePreference

export const THEME_STORAGE_KEY = "attomik-theme"

const ThemeContext = createContext<{ mode: ThemeChoice; setMode: (m: ThemeChoice) => void }>({
  mode: "system",
  setMode: () => {},
})

export function ThemeProvider({
  workspaceDefault,
  children,
}: {
  workspaceDefault: ThemePreference
  children: ReactNode
}) {
  const [mode, setModeState] = useState<ThemeChoice>("system")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === "light" || stored === "dark") setModeState(stored)
    } catch {}
  }, [])

  // Resolution: apply the resolved theme, and follow the OS live while the
  // effective preference is "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(mode, workspaceDefault, mq.matches)
    }
    apply()
    if (effectivePreference(mode, workspaceDefault) === "system") {
      mq.addEventListener("change", apply)
      return () => mq.removeEventListener("change", apply)
    }
  }, [mode, workspaceDefault])

  const setMode = useCallback((m: ThemeChoice) => {
    setModeState(m)
    try {
      if (m === "system") localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, m)
    } catch {}
  }, [])

  return <ThemeContext.Provider value={{ mode, setMode }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

/** Live OS color-scheme state, for previews that must track "system". */
export function useSystemPrefersDark(): boolean {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    setDark(mq.matches)
    const onChange = () => setDark(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return dark
}

/** Reference theme-mode order + icon paths; labels come from the locale (copy.nav.themeModes). */
export const THEME_MODES: [ThemeChoice, string][] = [
  ["light", "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9"],
  ["system", "M3 5h18v11H3zM8 20h8M12 16v4"],
  ["dark", "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5"],
]
