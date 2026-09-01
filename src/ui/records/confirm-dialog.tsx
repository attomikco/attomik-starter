"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Canonical confirmation dialog, ported from part-data.dc.html `ask()`.
 * Destructive actions state their consequence in plain copy; tone "bad"
 * renders the trash icon and red confirm; `typedWord` requires typing the
 * word (a real input — the prototype showed static copy). Focus moves into
 * the dialog on open, Escape closes, and focus is restored on close.
 * Never use browser confirm(); never build module-specific delete dialogs.
 */
export interface ConfirmOptions {
  tone?: "bad" | "accent"
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  typedWord?: string
  onConfirm: () => void
}

export function ConfirmDialog({ options, onClose }: { options: ConfirmOptions | null; onClose: () => void }) {
  const [typed, setTyped] = useState("")
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!options) return
    setTyped("")
    restoreRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose() } }
    window.addEventListener("keydown", onKey, true)
    return () => {
      window.removeEventListener("keydown", onKey, true)
      restoreRef.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  if (!options) return null
  const bad = options.tone !== "accent"
  const blocked = !!options.typedWord && typed.trim() !== options.typedWord

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(8,10,14,.38)", display: "grid", placeItems: "center" }} onClick={onClose}>
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={options.title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 448, maxWidth: "calc(100% - 32px)", background: "var(--card)", borderRadius: "var(--r)", padding: 30, boxShadow: "0 30px 70px rgba(0,0,0,.3)", animation: "sh-rise .16s ease-out", outline: "none" }}
      >
        <span style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", ...(bad ? { background: "var(--bad-tint)", color: "var(--bad)" } : { background: "var(--accent-tint)", color: "var(--accent-text)" }) }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={bad ? "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" : "M12 8h.01M11 12h1v5"} />
          </svg>
        </span>
        <div style={{ fontSize: 22, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "20px 0 10px" }}>{options.title}</div>
        <p style={{ fontSize: 14.5, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 22px" }}>{options.body}</p>

        {options.typedWord && (
          <label style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--shell)", borderRadius: "var(--r3)", padding: "12px 16px", fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt-2)", marginBottom: 22 }}>
            Type <span style={{ color: "var(--txt)" }}>{options.typedWord}</span> to confirm
            <input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={`Type ${options.typedWord} to confirm`}
              style={{ flex: 1, minWidth: 60, fontFamily: "var(--mono)", fontSize: 12, textTransform: "uppercase" }} />
          </label>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="ui-btn sh-pick" onClick={onClose}
            style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "12px 0" }}>
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button className="ui-btn" disabled={blocked} onClick={() => { onClose(); options.onConfirm() }}
            style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, borderRadius: 999, padding: "13px 0",
              opacity: blocked ? 0.5 : 1, cursor: blocked ? "default" : "pointer",
              ...(bad ? { background: "var(--bad)", color: "var(--card)" } : { background: "var(--accent)", color: "var(--accent-ink)" }) }}>
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
