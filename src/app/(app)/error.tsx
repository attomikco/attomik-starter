"use client"

import { useEffect } from "react"
import Link from "next/link"

/**
 * In-app recoverable error boundary. Users see a concise explanation,
 * a retry, a safe way home, and the error digest as a reference id —
 * never raw errors, stack traces, or database details (those stay in
 * server logs).
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] route error:", error.digest ?? error.message)
  }, [error])

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 40 }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, background: "var(--bad-tint)", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
        </span>
        <div style={{ fontSize: 20, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.025em", color: "var(--bad)", marginBottom: 8 }}>Something went wrong</div>
        <p style={{ fontSize: 14, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 20px" }}>
          The page could not be loaded. Nothing was changed — retrying usually fixes it.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <button className="ui-btn" onClick={reset}
            style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 999, padding: "11px 20px" }}>
            Try again
          </button>
          <Link href="/" style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "10px 19px", textDecoration: "none" }}>
            Back to Overview
          </Link>
        </div>
        {error.digest && (
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-4)", marginTop: 14 }}>reference {error.digest}</div>
        )}
      </div>
    </div>
  )
}
