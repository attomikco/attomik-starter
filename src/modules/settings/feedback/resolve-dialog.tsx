"use client"

import { useEffect, useRef, useState } from "react"
import type { FeedbackRow } from "@/core/feedback"
import { resolveFeedback, type ResolveFeedbackResult } from "@/core/feedback/actions"
import { RESOLUTION_NOTE_MAX, personLabel } from "@/core/feedback/resolution"
import { useT } from "@/core/i18n/client"
import { isAdminLike } from "@/core/permissions"
import { Checkbox, TextArea } from "@/ui/forms/fields"
import { settingsCopy } from "../copy"
import type { FeedbackMember } from "./feedback-screen"

/**
 * The resolve dialog: an optional note plus the members to notify by email,
 * administrators pre-checked. One confirm runs `resolveFeedback` — the
 * resolution row and the email are a single server action, and a failed
 * email comes back as a warning on an otherwise successful result.
 * Resolving is permanent (feedback_resolutions is append-only), and the
 * dialog says so up front. Same overlay/focus behaviour as ConfirmDialog.
 */
export function ResolveDialog({
  row,
  members,
  onClose,
  onResolved,
}: {
  row: FeedbackRow
  members: FeedbackMember[]
  onClose: () => void
  onResolved: (result: ResolveFeedbackResult) => void
}) {
  const t = useT(settingsCopy)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const [note, setNote] = useState("")
  const [selected, setSelected] = useState<Set<string>>(() => new Set(members.filter((m) => m.email && isAdminLike(m.role)).map((m) => m.userId)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const recipients = members.filter((m) => m.email)

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) { e.stopPropagation(); onClose() }
    }
    window.addEventListener("keydown", onKey, true)
    return () => {
      window.removeEventListener("keydown", onKey, true)
      restoreRef.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy])

  const toggle = (userId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })

  const submit = async () => {
    setBusy(true)
    setError("")
    const result = await resolveFeedback({ feedbackId: row.id, note, notifyUserIds: [...selected] })
    setBusy(false)
    if (!result.ok) return setError(result.message ?? "")
    onResolved(result)
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(8,10,14,.38)", display: "grid", placeItems: "center" }} onClick={busy ? undefined : onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.feedback.dialog.title")}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 520, maxWidth: "calc(100% - 32px)", maxHeight: "calc(100% - 32px)", overflowY: "auto", boxSizing: "border-box", background: "var(--card)", borderRadius: "var(--r)", padding: 30, boxShadow: "0 30px 70px rgba(0,0,0,.3)", animation: "sh-rise .16s ease-out", outline: "none" }}
      >
        <div style={{ fontSize: 22, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", marginBottom: 8 }}>{t("settings.feedback.dialog.title")}</div>
        <p style={{ fontSize: 14, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 18px" }}>{t("settings.feedback.dialog.body")}</p>

        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 8 }}>{t("settings.feedback.dialog.original")}</div>
        <div style={{ background: "var(--shell)", borderRadius: "var(--r3)", padding: "12px 14px", fontSize: 13.5, lineHeight: 1.55, color: "var(--txt)", whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 120, overflowY: "auto", marginBottom: 18 }}>
          {row.message}
        </div>

        <div style={{ marginBottom: 18 }}>
          <TextArea label={t("settings.feedback.dialog.note")} value={note} onChange={(v) => { setNote(v); setError("") }} rows={3} maxLength={RESOLUTION_NOTE_MAX} error={error || undefined} />
        </div>

        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 4 }}>{t("settings.feedback.dialog.notify")}</div>
        <div style={{ fontSize: 12, color: "var(--txt-3)", marginBottom: 10 }}>{t("settings.feedback.dialog.notifyHint")}</div>
        <div role="group" aria-label={t("settings.feedback.dialog.notify")} style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 200, overflowY: "auto", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: "var(--r3)", marginBottom: 10 }}>
          {recipients.map((m) => (
            <Checkbox key={m.userId} label={personLabel(m)} on={selected.has(m.userId)} onToggle={() => toggle(m.userId)} />
          ))}
        </div>
        <div style={{ minHeight: 18, fontSize: 12, color: "var(--txt-3)", marginBottom: 20 }}>{selected.size === 0 ? t("settings.feedback.dialog.noRecipients") : ""}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="ui-btn sh-pick" onClick={onClose} disabled={busy}
            style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "12px 0" }}>
            {t("settings.feedback.dialog.cancel")}
          </button>
          <button className="ui-btn" onClick={submit} disabled={busy}
            style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 999, padding: "13px 0", opacity: busy ? 0.6 : 1 }}>
            {busy ? t("settings.feedback.dialog.saving") : t("settings.feedback.dialog.confirm")}
          </button>
        </div>
      </div>
    </div>
  )
}
