"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useCopy } from "@/core/i18n/client"
import { Field, TextArea } from "@/ui/forms/fields"
import { Listbox } from "@/ui/forms/select"
import { useToast } from "@/ui/shell/toast-provider"
import { submitFeedback } from "./actions"
import { FEEDBACK_TYPES, type FeedbackType } from "./types"

/**
 * Floating one-way feedback capture, visible on every authenticated screen
 * when `features.feedbackWidget` is on (src/core/config/features.ts). No
 * replies, no threads — submit inserts one row and closes.
 */
export function FeedbackWidget() {
  const copy = useCopy()
  const { say } = useToast()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>(FEEDBACK_TYPES[0])
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false) } }
    document.addEventListener("mousedown", onOutside)
    window.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("mousedown", onOutside)
      window.removeEventListener("keydown", onKey, true)
    }
  }, [open])

  const trimmed = message.trim()
  const canSubmit = trimmed.length > 0 && trimmed.length <= 2000 && !submitting

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    const result = await submitFeedback({
      type,
      message: trimmed,
      route: pathname,
      userAgent: navigator.userAgent,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
    })
    setSubmitting(false)
    if (!result.ok) return say(result.message ?? copy.feedback.error)

    say(copy.feedback.success)
    setOpen(false)
    setMessage("")
    setType(FEEDBACK_TYPES[0])
  }

  return (
    <div ref={wrapRef} style={{ position: "absolute", right: 24, bottom: 88, zIndex: 50 }}>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copy.feedback.title}
          style={{
            position: "absolute", right: 0, bottom: "calc(100% + 12px)", zIndex: 61,
            width: 340, maxWidth: "calc(100vw - 48px)",
            background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r2)",
            boxShadow: "0 22px 50px rgba(0,0,0,.18)", padding: 18, boxSizing: "border-box",
            display: "flex", flexDirection: "column", gap: 14, animation: "sh-rise .14s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.015em" }}>{copy.feedback.title}</span>
            <button type="button" className="ui-btn" aria-label={copy.feedback.closeLabel} onClick={() => setOpen(false)}
              style={{ width: 26, height: 26, borderRadius: 999, background: "var(--shell)", display: "grid", placeItems: "center", color: "var(--txt-2)", flex: "none" }}>
              ✕
            </button>
          </div>

          <Field label={copy.feedback.typeLabel}>
            <Listbox
              ariaLabel={copy.feedback.typeLabel}
              value={type}
              options={FEEDBACK_TYPES.map((t) => ({ value: t, label: copy.feedback.types[t] }))}
              onChange={(v) => setType(v as FeedbackType)}
              fullWidth
            />
          </Field>

          <TextArea
            label={copy.feedback.messageLabel}
            required
            rows={4}
            maxLength={2000}
            value={message}
            onChange={setMessage}
          />

          <button type="button" className="ui-btn" onClick={submit} disabled={!canSubmit} aria-disabled={!canSubmit}
            style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, borderRadius: 999, padding: "11px 0", textAlign: "center",
              ...(canSubmit ? { background: "var(--accent)", color: "var(--accent-ink)" } : { background: "var(--shell)", color: "var(--txt-4)", cursor: "default" }) }}>
            {submitting ? copy.feedback.submitting : copy.feedback.submit}
          </button>
        </div>
      )}

      <button
        type="button"
        className="ui-btn"
        aria-label={copy.feedback.openLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 52, height: 52, borderRadius: 999, background: "var(--accent)", color: "var(--accent-ink)",
          display: "grid", placeItems: "center", boxShadow: "0 18px 40px rgba(0,0,0,.22)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  )
}
