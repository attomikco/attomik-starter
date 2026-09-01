import type { CSSProperties, ReactNode } from "react"
import { defaultSkin, resolveSkin } from "@/core/branding"
import "@/ui/shell/shell.css"

// Auth renders light by default regardless of OS preference or the app's
// saved theme: the canonical light tokens are re-declared on this subtree
// (server-rendered, so first paint is already light). The app's own theme
// behavior on <html> is untouched, and dark support stays in the engine.
// The future Appearance settings may revisit this rule.
const lightTokens = resolveSkin(defaultSkin, "light") as CSSProperties

/**
 * Auth frame: edge-to-edge light background, the reference's white sign-in
 * card centered in the viewport, security facts below it. Only the design
 * artifact's outer rounded panel was removed (Task 005.6) — the card keeps
 * its reference width, radius, padding, and spacing.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="sh-scroll"
      style={{ ...lightTokens, colorScheme: "light", color: "var(--txt)", width: "100%", minHeight: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--shell)", padding: "26px 16px", gap: 4 }}
    >
      <div style={{ background: "var(--card)", borderRadius: "var(--r)", padding: 40, boxSizing: "border-box", width: "100%", maxWidth: 520, minHeight: 640, flex: "none", display: "flex", flexDirection: "column", gap: 4 }}>
        {children}
      </div>

      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap", padding: "14px 0 4px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-4)" }}>
        <span>Single-use link</span>
        <span style={{ color: "var(--line-2)" }}>·</span>
        <span>Expires in 15 min</span>
        <span style={{ color: "var(--line-2)" }}>·</span>
        <span>Session 30 days</span>
        <span style={{ color: "var(--line-2)" }}>·</span>
        <span>Every sign-in logged</span>
      </div>
    </div>
  )
}
