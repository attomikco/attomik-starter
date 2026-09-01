"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Canonical record/detail shell, ported from part-records.dc.html: header
 * (eyebrow, title, status, subtitle, actions), status tabs, and a
 * main + aside split that collapses to one column when the record's own
 * panel is narrower than ~960px. Purely compositional — nothing in here
 * knows what an Order is; modules fill the slots.
 */

export function RecordLayout({
  eyebrow,
  title,
  status,
  subtitle,
  actions,
  tabs,
  activeTab,
  onTab,
  children,
  aside,
}: {
  eyebrow?: string
  title: ReactNode
  status?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  tabs?: { label: string; count?: number }[]
  activeTab?: string
  onTab?: (label: string) => void
  children: ReactNode
  aside?: ReactNode
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => setNarrow(el.getBoundingClientRect().width < 960))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, padding: 26, display: "flex", flexDirection: "column", gap: 20, overflow: "hidden", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", flex: "none" }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 8 }}>{eyebrow}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 32, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.04em", lineHeight: 1.05, margin: 0 }}>{title}</h1>
            {status}
          </div>
          {subtitle && <p style={{ fontSize: 14.5, color: "var(--txt-2)", lineHeight: 1.5, margin: 0 }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: "flex", alignItems: "center", gap: 9, flex: "none" }}>{actions}</div>}
      </div>

      {tabs && onTab && (
        <div role="tablist" style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--shell)", borderRadius: 999, padding: 4, flex: "none", alignSelf: "flex-start" }}>
          {tabs.map((t) => {
            const on = t.label === activeTab
            return (
              <button key={t.label} className="ui-btn" role="tab" aria-selected={on} onClick={() => onTab(t.label)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 15px", borderRadius: 999, fontSize: 14,
                  ...(on ? { background: "var(--card)", color: "var(--txt)", fontWeight: "var(--w-semi)" as never } : { color: "var(--txt-2)", fontWeight: 500 }) }}>
                {t.label}
                {t.count !== undefined && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: on ? "var(--accent-text)" : "var(--txt-4)" }}>{t.count}</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className="sh-scroll" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: narrow || !aside ? "minmax(0, 1fr)" : "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>{children}</div>
        {aside && <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>{aside}</div>}
      </div>
    </div>
  )
}

/** Standard record section card on the shell ground. */
export function RecordSection({ title, meta, children }: { title?: string; meta?: string; children: ReactNode }) {
  return (
    <div style={{ background: "var(--shell)", borderRadius: "var(--r2)", padding: 22, minWidth: 0 }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em" }}>{title}</span>
          {meta && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)" }}>{meta}</span>}
        </div>
      )}
      {children}
    </div>
  )
}

/** Reference header/footer action buttons. */
export function ActionButton({ label, tone = "secondary", onClick }: { label: string; tone?: "primary" | "secondary" | "bad"; onClick: () => void }) {
  const styles =
    tone === "primary"
      ? { background: "var(--accent)", color: "var(--accent-ink)", padding: "0 20px" }
      : tone === "bad"
        ? { border: "1px solid var(--bad)", color: "var(--bad)", padding: "0 18px" }
        : { border: "1px solid var(--line-2)", color: "var(--txt-2)", padding: "0 18px" }
  return (
    <button className={`ui-btn${tone === "secondary" ? " sh-pick" : ""}`} onClick={onClick}
      style={{ height: 42, borderRadius: 999, display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: "var(--w-semi)" as never, whiteSpace: "nowrap", boxSizing: "border-box", ...styles }}>
      {label}
    </button>
  )
}
