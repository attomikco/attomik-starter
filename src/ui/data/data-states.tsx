"use client"

import type { ReactNode } from "react"
import { useCopy } from "@/core/i18n/client"

/**
 * The four canonical data states, ported from part-data.dc.html. Every
 * module table wires these — a table without an empty state is unfinished.
 */

export function TableLoading({ rowCount = 7 }: { rowCount?: number }) {
  const copy = useCopy()
  return (
    <div aria-busy="true" aria-label={copy.data.loading}>
      {Array.from({ length: rowCount }, (_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", borderBottom: "1px solid var(--line)" }}>
          <span style={{ width: 18, height: 18, borderRadius: 5, background: "var(--shell)", display: "block", flex: "none" }} />
          <span style={{ width: 74 + (i % 3) * 16, height: 12, borderRadius: 4, background: "var(--shell)", display: "block" }} />
          <span style={{ width: 150 + (i % 4) * 28, height: 12, borderRadius: 4, background: "var(--shell)", display: "block" }} />
          <div style={{ flex: 1 }} />
          <span style={{ width: 84, height: 12, borderRadius: 4, background: "var(--shell)", display: "block" }} />
          <span style={{ width: 112, height: 22, borderRadius: 999, background: "var(--shell)", display: "block" }} />
        </div>
      ))}
    </div>
  )
}

const stateWrap = { padding: "64px 40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 } as const

export function TableEmpty({
  title,
  body,
  action,
}: {
  title: string
  body?: string
  action?: { label: string; onRun: () => void }
}) {
  return (
    <div style={stateWrap}>
      <span style={{ width: 48, height: 48, borderRadius: "var(--r3)", background: "var(--shell)", display: "grid", placeItems: "center", marginBottom: 8 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>
      </span>
      <div style={{ fontSize: 20, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.025em" }}>{title}</div>
      {body && <p style={{ fontSize: 14, color: "var(--txt-2)", lineHeight: 1.55, margin: 0, maxWidth: 420 }}>{body}</p>}
      {action && (
        <button className="ui-btn" onClick={action.onRun}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 999, padding: "11px 20px" }}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export function TableError({
  title,
  body,
  onRetry,
  retryLabel: retryLabelProp,
  secondary,
  traceId,
}: {
  title: string
  body?: string
  onRetry: () => void
  retryLabel?: string
  secondary?: ReactNode
  traceId?: string
}) {
  const copy = useCopy()
  const retryLabel = retryLabelProp ?? copy.data.retry
  return (
    <div style={stateWrap}>
      <span style={{ width: 48, height: 48, borderRadius: "var(--r3)", background: "var(--bad-tint)", display: "grid", placeItems: "center", marginBottom: 8 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
      </span>
      <div style={{ fontSize: 20, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.025em", color: "var(--bad)" }}>{title}</div>
      {body && <p style={{ fontSize: 14, color: "var(--txt-2)", lineHeight: 1.55, margin: 0, maxWidth: 420 }}>{body}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <button className="ui-btn" onClick={onRetry}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 999, padding: "11px 20px" }}>
          {retryLabel}
        </button>
        {secondary}
      </div>
      {traceId && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-4)", marginTop: 10 }}>{copy.data.trace(traceId)}</span>}
    </div>
  )
}
