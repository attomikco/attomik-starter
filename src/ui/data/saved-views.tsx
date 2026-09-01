"use client"

import { useEffect, useState } from "react"
import { copy } from "@/core/i18n"
import { deserializeView, serializeView } from "@/core/data/query"
import type { SavedView } from "@/core/data/types"

/**
 * Saved views, ported from the reference rail pattern (rendered as a chip
 * row where no rail is available). Persistence is localStorage for now —
 * the serializable SavedView shape is ready for server persistence later.
 */

export function useSavedViews(storageKey: string) {
  const [views, setViews] = useState<SavedView[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as string[]
      setViews(parsed.map(deserializeView).filter((v): v is SavedView => v !== null))
    } catch {}
  }, [storageKey])

  const persist = (next: SavedView[]) => {
    setViews(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next.map(serializeView)))
    } catch {}
  }

  return {
    views,
    saveView: (view: SavedView) => persist(views.filter((v) => v.id !== view.id).concat([view])),
    removeView: (id: string) => persist(views.filter((v) => v.id !== id)),
  }
}

export function SavedViewsBar({
  views,
  activeId,
  onPick,
  onSaveCurrent,
  onRemove,
}: {
  views: SavedView[]
  activeId: string | null
  onPick: (view: SavedView | null) => void
  onSaveCurrent?: () => void
  onRemove?: (id: string) => void
}) {
  const chip = (on: boolean) => ({
    display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: "var(--r3)", fontSize: 13.5,
    ...(on ? { background: "var(--card)", color: "var(--txt)", fontWeight: "var(--w-semi)" as never, border: "1px solid var(--line)" } : { color: "var(--txt-2)" }),
  })

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginRight: 4 }}>{copy.data.savedViews}</span>
      <button className="ui-btn" style={chip(activeId === null)} onClick={() => onPick(null)}>{copy.data.allRecords}</button>
      {views.map((v, i) => (
        <span key={v.id} style={{ display: "inline-flex", alignItems: "center" }}>
          <button className="ui-btn" style={chip(activeId === v.id)} onClick={() => onPick(v)}>
            <span aria-hidden style={{ width: 4, height: 14, borderRadius: 2, flex: "none", display: "block", background: `var(--s${(i % 5) + 1})` }} />
            {v.label}
          </button>
          {onRemove && activeId === v.id && (
            <button className="ui-btn" aria-label={`Delete view ${v.label}`} onClick={() => onRemove(v.id)}
              style={{ color: "var(--txt-4)", fontSize: 11, padding: "0 6px" }}>✕</button>
          )}
        </span>
      ))}
      {onSaveCurrent && (
        <button className="ui-btn" onClick={onSaveCurrent}
          style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "6px 12px", marginLeft: 4 }}>
          Save current view
        </button>
      )}
    </div>
  )
}
