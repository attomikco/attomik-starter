"use client"

/**
 * The one pill-shaped tab strip, shared by StatusTabs (table toolbars,
 * table-controls.tsx) and RecordLayout's own tabs prop
 * (src/ui/records/record-layout.tsx) — previously two separate,
 * near-identical implementations, which is exactly how a mobile overflow
 * fix can land on one and not the other. Scrolls horizontally
 * (overflow-x: auto, momentum scroll, hidden scrollbar via .sh-hscroll)
 * rather than wrapping or clipping when the tabs don't fit their row.
 */
export interface TabStripItem {
  label: string
  count?: number
}

export function TabStrip({
  tabs,
  active,
  onPick,
}: {
  tabs: TabStripItem[]
  active: string
  onPick: (label: string) => void
}) {
  return (
    <div role="tablist" className="sh-hscroll" style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--shell)", borderRadius: 999, padding: 4, overflowX: "auto", maxWidth: "100%", minWidth: 0 ,
      // A scroll container has min-height 0, so in a column flex screen it would be squashed to nothing.
      flexShrink: 0 }}>
      {tabs.map((t) => {
        const on = t.label === active
        return (
          <button key={t.label} className="ui-btn" role="tab" aria-selected={on} onClick={() => onPick(t.label)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 15px", borderRadius: 999, fontSize: 14, flex: "none", whiteSpace: "nowrap",
              ...(on ? { background: "var(--card)", color: "var(--txt)", fontWeight: "var(--w-semi)" as never } : { color: "var(--txt-2)", fontWeight: 500 }) }}>
            {t.label}
            {t.count !== undefined && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: on ? "var(--accent-text)" : "var(--txt-4)" }}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
