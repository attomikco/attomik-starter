import Link from "next/link"
import { getCopy } from "@/core/i18n/server"
import { AuthCardHeader } from "../card-header"

/**
 * Expired/invalid-link state, ported from the reference. The reference's
 * "Requested 24 minutes ago" banner used authored data; the production
 * banner keeps the pattern with honest copy. Both actions return to entry —
 * the address is never carried in the URL.
 */
const pill = {
  display: "inline-flex", alignItems: "center", fontSize: 14.5,
  fontWeight: "var(--w-semi)" as never, borderRadius: 999, textDecoration: "none", cursor: "pointer",
} as const

export default async function ExpiredPage() {
  const copy = await getCopy()
  return (
    <>
      <AuthCardHeader stepLabel={copy.auth.expired.step} />
      <div style={{ flex: "none", padding: "26px 0 4px" }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--warn-tint)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5l3 2" /></svg>
          </span>
          <h1 style={{ fontSize: 34, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.04em", lineHeight: 1.08, margin: "0 0 12px", textAlign: "center" }}>{copy.auth.expired.title}</h1>
          <p style={{ fontSize: 15, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 24px", textAlign: "center" }}>
            {copy.auth.expired.intro}
          </p>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "var(--warn-tint)", borderRadius: "var(--r2)", padding: "18px 20px", marginBottom: 26 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--warn)" }}>{copy.auth.expired.bannerTitle}</div>
              <div style={{ fontSize: 13.5, color: "var(--txt-2)", lineHeight: 1.55, marginTop: 3 }}>
                {copy.auth.expired.bannerBody}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <Link href="/login" style={{ ...pill, gap: 9, color: "var(--accent-ink)", background: "var(--accent)", padding: "12px 22px" }}>
              {copy.auth.expired.newLink}
            </Link>
            <Link href="/login" className="sh-pick" style={{ ...pill, gap: 8, color: "var(--txt-2)", border: "1px solid var(--line-2)", padding: "11px 20px" }}>
              {copy.auth.expired.changeAddress}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
