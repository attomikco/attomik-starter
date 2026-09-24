"use client"

import { useEffect, useState } from "react"
import { useCopy } from "@/core/i18n/client"
import { Dialog, DialogActions } from "./dialog"

/**
 * Canonical confirmation dialog, ported from part-data.dc.html `ask()`, on
 * the shared Dialog frame. Destructive actions state their consequence in
 * plain copy; tone "bad" renders the trash icon and red confirm;
 * `typedWord` requires typing the word (a real input). Never use browser
 * confirm(); never build module-specific delete dialogs.
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
  const copy = useCopy()
  const [typed, setTyped] = useState("")
  useEffect(() => { setTyped("") }, [options])

  if (!options) return null
  const bad = options.tone !== "accent"
  const blocked = !!options.typedWord && typed.trim() !== options.typedWord

  return (
    <Dialog ariaLabel={options.title} role="alertdialog" width={448} onClose={onClose}>
      <span style={{ width: 44, height: 44, borderRadius: "var(--r3)", display: "grid", placeItems: "center", ...(bad ? { background: "var(--bad-tint)", color: "var(--bad)" } : { background: "var(--accent-tint)", color: "var(--accent-text)" }) }}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={bad ? "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" : "M12 8h.01M11 12h1v5"} />
        </svg>
      </span>
      <div style={{ fontSize: 22, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "20px 0 10px" }}>{options.title}</div>
      <p style={{ fontSize: 14.5, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 22px" }}>{options.body}</p>

      {options.typedWord && (
        <label className="ui-field" style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--shell)", borderRadius: "var(--r3)", padding: "12px 16px", fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt-2)", marginBottom: 22 }}>
          {copy.forms.typeToConfirm(options.typedWord)}
          <input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={copy.forms.typeToConfirm(options.typedWord)}
            style={{ flex: 1, minWidth: 60, fontFamily: "var(--mono)", fontSize: 12, textTransform: "uppercase" }} />
        </label>
      )}

      <DialogActions cancelLabel={options.cancelLabel ?? copy.forms.cancel} onCancel={onClose} confirmLabel={options.confirmLabel} tone={bad ? "bad" : "accent"} disabled={blocked} onConfirm={() => { onClose(); options.onConfirm() }} />
    </Dialog>
  )
}
