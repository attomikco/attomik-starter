"use client"

/**
 * Floating bulk action bar, ported from the reference: inverted pill
 * centered near the bottom. The table doesn't know what actions mean —
 * modules supply labels and callbacks; `tone: "bad"` renders destructive.
 */
export interface BulkAction {
  label: string
  onRun: () => void
  tone?: "default" | "bad"
}

export function BulkBar({
  count,
  noun = "record",
  actions,
  onClear,
}: {
  count: number
  noun?: string
  actions: BulkAction[]
  onClear: () => void
}) {
  if (count === 0) return null
  return (
    <div role="toolbar" aria-label="Bulk actions"
      style={{ position: "absolute", left: "50%", bottom: 44, transform: "translateX(-50%)", zIndex: 60, display: "flex", alignItems: "center", gap: 6, background: "var(--txt)", borderRadius: 999, padding: "12px 14px 12px 22px", boxShadow: "0 20px 44px rgba(0,0,0,.24)", animation: "sh-rise .16s ease-out" }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--card)", marginRight: 8 }}>
        {count} {noun}{count === 1 ? "" : "s"} selected
      </span>
      <span aria-hidden style={{ width: 1, height: 20, background: "rgba(255,255,255,.18)", display: "block", marginRight: 8 }} />
      {actions.map((a) => (
        <button key={a.label} className="ui-btn sh-bulk-action" onClick={a.onRun}
          style={{ fontSize: 13.5, fontWeight: "var(--w-semi)" as never, color: a.tone === "bad" ? "var(--bad-fill)" : "var(--card)", padding: "7px 12px", borderRadius: 999 }}>
          {a.label}
        </button>
      ))}
      <button className="ui-btn sh-bulk-action" aria-label="Clear selection" onClick={onClear}
        style={{ width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", color: "var(--card)", flex: "none" }}>
        ✕
      </button>
    </div>
  )
}
