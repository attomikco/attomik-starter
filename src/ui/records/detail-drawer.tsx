"use client"

import { useEffect, type ReactNode } from "react"

/**
 * Right-side detail drawer, ported from the reference audit drawer: a dimmed
 * overlay, a 480px panel with an eyebrow/title/close header, and one
 * scrolling body. Compositional only: modules pass the header text and fill
 * the body. Body content wraps normally, so long text belongs here and never
 * in a table cell. Escape and overlay click close it.
 */
export function DetailDrawer({
  ariaLabel,
  closeLabel,
  eyebrow,
  title,
  chips,
  onClose,
  children,
}: {
  ariaLabel: string
  closeLabel: string
  eyebrow?: ReactNode
  title: ReactNode
  chips?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose() } }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [onClose])

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(8,10,14,.32)" }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={ariaLabel}
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, maxWidth: "calc(100% - 40px)", zIndex: 71, background: "var(--card)", borderLeft: "1px solid var(--line)", boxShadow: "-20px 0 60px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "sh-rise .18s ease-out" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--line)", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              {eyebrow && (
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 8 }}>
                  {eyebrow}
                </div>
              )}
              <div style={{ fontSize: 20, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", lineHeight: 1.15, overflowWrap: "anywhere" }}>
                {title}
              </div>
            </div>
            <button className="ui-btn" aria-label={closeLabel} onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 999, background: "var(--shell)", display: "grid", placeItems: "center", color: "var(--txt-2)", flex: "none" }}>
              ✕
            </button>
          </div>
          {chips && <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>{chips}</div>}
        </div>

        <div className="sh-scroll" style={{ flex: 1, minHeight: 0, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {children}
        </div>
      </div>
    </>
  )
}
