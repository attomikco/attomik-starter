"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * The one modal frame: dimmed overlay, a centred panel on the card ground,
 * focus moved in on open and restored on close, Escape and overlay click
 * close it. ConfirmDialog is built on it; the invite and resolve dialogs
 * use it directly. Modules never hand-roll an overlay.
 */
export function Dialog({ ariaLabel, role = "dialog", width = 480, onClose, children }: {
  ariaLabel: string
  role?: "dialog" | "alertdialog"
  width?: number
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose() } }
    window.addEventListener("keydown", onKey, true)
    return () => {
      window.removeEventListener("keydown", onKey, true)
      restoreRef.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(8,10,14,.38)", display: "grid", placeItems: "center" }} onClick={onClose}>
      <div ref={panelRef} role={role} aria-modal="true" aria-label={ariaLabel} tabIndex={-1} onClick={(e) => e.stopPropagation()}
        style={{ width, maxWidth: "calc(100% - 32px)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", background: "var(--card)", borderRadius: "var(--r)", padding: 30, boxSizing: "border-box", boxShadow: "0 30px 70px rgba(0,0,0,.3)", animation: "sh-rise .16s ease-out", outline: "none" }}>
        {children}
      </div>
    </div>
  )
}

/** The two-button footer every dialog ends with: secondary on the left, primary (or destructive) on the right. */
export function DialogActions({ cancelLabel, onCancel, confirmLabel, onConfirm, tone = "accent", disabled, busy }: {
  cancelLabel: string
  onCancel: () => void
  confirmLabel: string
  onConfirm: () => void
  tone?: "accent" | "bad"
  disabled?: boolean
  busy?: boolean
}) {
  const blocked = !!disabled || !!busy
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button type="button" className="ui-btn sh-pick" onClick={onCancel} disabled={busy}
        style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "12px 0" }}>
        {cancelLabel}
      </button>
      <button type="button" className="ui-btn" disabled={blocked} onClick={onConfirm}
        style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, borderRadius: 999, padding: "13px 0", opacity: blocked ? 0.5 : 1, cursor: blocked ? "default" : "pointer",
          ...(tone === "bad" ? { background: "var(--bad)", color: "var(--card)" } : { background: "var(--accent)", color: "var(--accent-ink)" }) }}>
        {confirmLabel}
      </button>
    </div>
  )
}
