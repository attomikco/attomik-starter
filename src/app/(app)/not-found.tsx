import Link from "next/link"

/**
 * In-app 404 — rendered inside the shell (disabled modules and unknown
 * app routes land here via requireModule/notFound).
 */
export default function AppNotFound() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 40 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, background: "var(--shell)", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>
        </span>
        <div style={{ fontSize: 20, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.025em", marginBottom: 8 }}>Not available</div>
        <p style={{ fontSize: 14, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 20px" }}>
          This page does not exist in this workspace, or the module it belongs to is not enabled.
        </p>
        <Link href="/" style={{ display: "inline-flex", fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "10px 18px", textDecoration: "none" }}>
          Back to Overview
        </Link>
      </div>
    </div>
  )
}
