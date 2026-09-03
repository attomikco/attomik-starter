"use client"

import { useEffect, useState } from "react"
import { useCopy } from "@/core/i18n/client"
import { AuthCardHeader } from "../card-header"

/**
 * Verifying state, ported from the reference. The real exchange happens
 * server-side in /auth/callback (instant), so this walk is presentational —
 * exactly as the reference documents ("keep it only if verification
 * genuinely takes a moment"). It remains routable for review and for any
 * future flow where verification is slow enough to show.
 */
export default function VerifyPage() {
  const copy = useCopy()
  const LINES = copy.auth.verify.lines
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, 3)), 900)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <AuthCardHeader stepLabel={copy.auth.verify.step} />
      <div style={{ flex: "none", padding: "26px 0 4px" }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ width: 52, height: 52, borderRadius: "var(--r3)", background: "var(--lead)", border: "1px solid var(--lead-line)", boxSizing: "border-box", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, border: "2.5px solid var(--lead-line)", borderTopColor: "var(--accent)", display: "block", animation: "sh-spin .8s linear infinite" }} />
          </span>
          <h1 style={{ fontSize: 34, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.04em", lineHeight: 1.08, margin: "0 0 12px", textAlign: "center" }}>{copy.auth.verify.title}</h1>
          <p style={{ fontSize: 15, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 26px", textAlign: "center" }}>
            {copy.auth.verify.intro}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 340, margin: "0 auto" }}>
            {LINES.map((label, i) => {
              const done = stage > i
              const active = stage === i
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, flex: "none", display: "block", background: done ? "var(--ok-fill)" : active ? "var(--accent)" : "var(--line-2)" }} />
                  <span style={{ fontSize: 14.5, color: done || active ? "var(--txt)" : "var(--txt-3)", fontWeight: (active ? "var(--w-semi)" : 400) as never }}>{label}</span>
                  {done && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginLeft: "auto" }}><path d="m5 13 5 5L20 7" /></svg>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
