"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

/**
 * Theme mode control, matching the reference host: light / system / dark.
 * An explicit choice sets `data-theme` on <html> (the Task 003 stylesheet
 * gives it precedence); "system" removes it so `prefers-color-scheme`
 * decides. Choice persists to localStorage; a tiny inline script in the
 * root layout replays it before first paint so there is no flash.
 */

export type ThemeChoice = "light" | "system" | "dark"

export const THEME_STORAGE_KEY = "attomik-theme"

const ThemeContext = createContext<{ mode: ThemeChoice; setMode: (m: ThemeChoice) => void }>({
  mode: "system",
  setMode: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeChoice>("system")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === "light" || stored === "dark") setModeState(stored)
    } catch {}
  }, [])

  const setMode = useCallback((m: ThemeChoice) => {
    setModeState(m)
    const root = document.documentElement
    if (m === "system") delete root.dataset.theme
    else root.dataset.theme = m
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

/** Reference theme-mode metadata: [choice, title, short label, icon path]. */
export const THEME_MODES: [ThemeChoice, string, string, string][] = [
  ["light", "Light", "Light", "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9"],
  ["system", "System", "Auto", "M3 5h18v11H3zM8 20h8M12 16v4"],
  ["dark", "Dark", "Dark", "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5"],
]
