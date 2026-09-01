import Link from "next/link"

/**
 * Root 404 — reached outside the authenticated shell. Standalone light
 * presentation consistent with the auth surface; never leaks internals.
 */
export default function RootNotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--shell)", color: "var(--txt)", fontFamily: "var(--font)", padding: 24, boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--card)", border: "1px solid var(--line)", display: "inline-grid", placeItems: "center", marginBottom: 20 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>
        </span>
        <h1 style={{ fontSize: 28, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.035em", margin: "0 0 10px" }}>This page does not exist</h1>
        <p style={{ fontSize: 14.5, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 24px" }}>
          The address may be mistyped, or the page may have been moved or turned off.
        </p>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 999, padding: "12px 22px", textDecoration: "none" }}>
          Open the app
        </Link>
      </div>
    </div>
  )
}
