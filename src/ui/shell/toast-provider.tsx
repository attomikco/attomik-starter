"use client"

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"

/**
 * The canonical app toast, ported from the reference host `say()`:
 * pill bottom-right, ok-fill check, 2600ms auto-dismiss. It sits on the
 * theme's own card surface (not the reference's inverted pill), so it
 * reads dark on the dark theme and light on the light one.
 * Modules trigger it via useToast().say(message) — never their own system.
 */

const ToastContext = createContext<{ say: (msg: string) => void }>({ say: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const say = useCallback((msg: string) => {
    setToast(msg)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(""), 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ say }}>
      {children}
      {toast && (
        <div
          style={{
            position: "absolute", right: 40, bottom: 24, zIndex: 96,
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--card)", color: "var(--txt)", border: "1px solid var(--line)", borderRadius: "var(--r3)", padding: "14px 18px",
            boxShadow: "0 18px 40px rgba(0,0,0,.24)", animation: "sh-rise .16s ease-out",
          }}
        >
          {/* Neutral near-black check: the green disc is mid-light in both themes, so a theme ink would fail contrast in one of them. */}
          <span style={{ width: 20, height: 20, borderRadius: 999, background: "var(--ok-fill)", display: "grid", placeItems: "center", flex: "none" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="oklch(0.14 0 0)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 5 5L20 7" /></svg>
          </span>
          <span style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--txt)" }}>{toast}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}
