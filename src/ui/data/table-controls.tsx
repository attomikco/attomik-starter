"use client"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@/core/data/types"
import { useCopy } from "@/core/i18n/client"

/** Status tabs on the shell pill, from the reference table toolbar. */
export function StatusTabs({
  tabs,
  active,
  onPick,
}: {
  tabs: { label: string; count?: number }[]
  active: string
  onPick: (label: string) => void
}) {
  return (
    <div role="tablist" style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--shell)", borderRadius: 999, padding: 4 }}>
      {tabs.map((t) => {
        const on = t.label === active
        return (
          <button key={t.label} className="ui-btn" role="tab" aria-selected={on} onClick={() => onPick(t.label)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 15px", borderRadius: 999, fontSize: 14,
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

/** Toolbar control pill (Filters / Group / Columns), on-state accent tint. */
export function ControlButton({
  icon,
  label,
  on,
  onClick,
  badge,
}: {
  icon: ReactNode
  label: string
  on?: boolean
  onClick: () => void
  badge?: string
}) {
  return (
    <button className="ui-btn" onClick={onClick} aria-pressed={on}
      style={{ height: 38, padding: "0 15px", borderRadius: "var(--r3)", display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: "var(--w-semi)" as never, whiteSpace: "nowrap", boxSizing: "border-box",
        ...(on ? { background: "var(--accent-tint)", color: "var(--accent-text)" } : { border: "1px solid var(--line-2)", color: "var(--txt-2)" }) }}>
      {icon}
      {label}
      {badge && <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 999, padding: "2px 7px" }}>{badge}</span>}
    </button>
  )
}

/** Column picker dropdown from the reference: checkboxes, pinned rows locked. */
export function ColumnPicker<T>({
  columns,
  hidden,
  onToggle,
  onReset,
}: {
  columns: ColumnDef<T>[]
  hidden: string[]
  onToggle: (key: string) => void
  onReset: () => void
}) {
  const copy = useCopy()
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: "relative" }}>
      <ControlButton
        icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></svg>}
        label={copy.data.columns}
        on={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div style={{ position: "absolute", top: 46, right: 0, zIndex: 40, width: 236, background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r2)", boxShadow: "0 18px 40px rgba(0,0,0,.14)", padding: 12, animation: "sh-rise .14s ease-out" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", padding: "2px 8px 10px" }}>{copy.data.shownColumns}</div>
          {columns.map((c) => {
            const shown = c.pinned || !hidden.includes(c.key)
            return (
              <button key={c.key} className="ui-btn" disabled={c.pinned} onClick={() => onToggle(c.key)}
                role="checkbox" aria-checked={shown}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, fontSize: 13.5, color: "var(--txt-2)", cursor: c.pinned ? "default" : "pointer" }}>
                <span aria-hidden style={{ width: 16, height: 16, borderRadius: 4, flex: "none", display: "grid", placeItems: "center", fontSize: 10, boxSizing: "border-box",
                  ...(shown ? { background: "var(--accent)", color: "var(--accent-ink)", border: "1.5px solid var(--accent)" } : { border: "1.5px solid var(--line-2)", color: "transparent" }),
                  ...(c.pinned ? { opacity: 0.55 } : {}) }}>
                  {shown ? "✓" : ""}
                </span>
                {c.label}
                {c.pinned && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt-4)", marginLeft: "auto" }}>{copy.data.pinned}</span>}
              </button>
            )
          })}
          <button className="ui-btn" onClick={onReset}
            style={{ width: "100%", marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 10, fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent-text)", textAlign: "left", paddingLeft: 10 }}>
            {copy.data.resetColumns}
          </button>
        </div>
      )}
    </div>
  )
}

/** Canonical search input on the shell ground, debounce owned by the caller. */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <span className="ui-field" style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--shell)", borderRadius: 13, padding: "9px 14px", minWidth: 200 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" style={{ flex: "none" }}><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>
      <input aria-label={placeholder} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1, minWidth: 0, fontSize: 14 }} />
    </span>
  )
}
