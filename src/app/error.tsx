"use client"

import { useEffect } from "react"
import { useCopy } from "@/core/i18n/client"

/**
 * App-level recoverable boundary. Sits ABOVE the route-group layouts, so a
 * failure thrown while building the authenticated app frame itself (e.g.
 * (app)/layout.tsx resolving the workspace) renders this polished state
 * inside the root document — tokens, fonts, and theme intact — instead of
 * falling through to global-error.tsx, which replaces the root layout and
 * is reserved for true fatal startup failures.
 *
 * Same rules as the in-app boundary: concise copy, retry via reset(), a
 * safe way home, and only the digest as a reference — raw Supabase or
 * database details never reach the browser.
 */
export default function AppFrameError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const copy = useCopy()
  useEffect(() => {
    console.error("[app] frame error:", error.digest ?? error.message)
  }, [error])

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 40, background: "var(--shell)", color: "var(--txt)" }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <span style={{ width: 48, height: 48, borderRadius: "var(--r3)", background: "var(--bad-tint)", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
        </span>
        <div style={{ fontSize: 20, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.025em", color: "var(--bad)", marginBottom: 8 }}>{copy.errors.title}</div>
        <p style={{ fontSize: 14, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 20px" }}>
          {copy.errors.body}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <button className="ui-btn" onClick={reset}
            style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 999, padding: "11px 20px" }}>
            {copy.errors.tryAgain}
          </button>
          {/* Full navigation on purpose: reset() re-renders this segment, but
              a frame-level failure deserves a clean request on the way out. */}
          <a href="/" style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "10px 19px", textDecoration: "none" }}>
            {copy.errors.backHome}
          </a>
        </div>
        {error.digest && (
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-4)", marginTop: 14 }}>{copy.errors.reference(error.digest)}</div>
        )}
      </div>
    </div>
  )
}
