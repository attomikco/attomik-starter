"use client"

import { useToast } from "@/ui/shell/toast-provider"
import { useTheme } from "@/ui/shell/theme"

/**
 * Development-only shell validation page. Not a product screen.
 * Everything else (palette, shortcuts, collapse, drawer) is exercised
 * directly in the live shell around this page.
 */
export function ShellDemo() {
  const { say } = useToast()
  const { mode, setMode } = useTheme()

  return (
    <div style={{ padding: 26 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em" }}>Shell validation</h1>
      <p style={{ color: "var(--txt-2)", fontSize: 14 }}>
        Try: ⌘K palette · ⌘/ shortcuts · ⌘B collapse · G then a letter · resize under 900px for the drawer.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button
          onClick={() => say("Toast from a module via useToast()")}
          style={{ background: "var(--accent)", color: "var(--accent-ink)", border: "none", borderRadius: "var(--r3)", padding: "10px 16px", fontSize: 14, fontWeight: "var(--w-semi)" as never, cursor: "pointer", fontFamily: "var(--font)" }}
        >
          Trigger toast
        </button>
        <button
          onClick={() => setMode(mode === "dark" ? "light" : "dark")}
          style={{ background: "var(--shell)", color: "var(--txt)", border: "1px solid var(--line)", borderRadius: "var(--r3)", padding: "10px 16px", fontSize: 14, cursor: "pointer", fontFamily: "var(--font)" }}
        >
          Toggle theme (now: {mode})
        </button>
      </div>
      <p style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)", marginTop: 16 }}>
        2026-09-01 · #A18C · 12:45
      </p>
    </div>
  )
}
