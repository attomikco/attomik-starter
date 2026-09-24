"use client"

import type { CSSProperties, ReactNode } from "react"

/**
 * Page primitives (docs/UI_STANDARDS.md, Page and Header).
 *
 * PageContainer is the ONE scroll region of a screen: the shell's page root
 * (absolute, inset 0, padding 26) with the canonical column gap. Never a
 * page-level max-width. `data-page-root` lets the audit find it.
 *
 * PageHeader is the list-screen header: eyebrow (breadcrumb-style), title
 * (text, or a control such as the Panel's month picker), optional status
 * chip, one summary/subtitle line, actions on the right (one primary at
 * most). `data-page-header` for the audit.
 *
 * FilterBar is the row of pickers above a table: inline mono captions
 * (FilterLabel), wrapping, with a trailing slot.
 */

export function PageContainer({ gap = 16, scroll = true, children }: { gap?: number; scroll?: boolean; children: ReactNode }) {
  return (
    <div className={scroll ? "sh-scroll" : undefined} data-page-root style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap }}>
      {children}
    </div>
  )
}

const eyebrowStyle: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }

export function PageHeader({ eyebrow, title, status, summary, subtitle, actions }: {
  eyebrow?: string
  title: ReactNode
  /** A chip beside the title (a record's state). */
  status?: ReactNode
  /** One mono line under the title (counts, period). */
  summary?: ReactNode
  /** One sans line under the title (a sentence). Use one of summary/subtitle. */
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div data-page-header style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", flex: "none" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        {eyebrow && <div style={eyebrowStyle}>{eyebrow}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "6px 0 6px" }}>
          {typeof title === "string"
            ? <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: 0, minWidth: 0 }}>{title}</h1>
            : title}
          {status}
        </div>
        {summary && <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)" }}>{summary}</div>}
        {subtitle && <p style={{ fontSize: 14, color: "var(--txt-2)", lineHeight: 1.5, margin: 0 }}>{subtitle}</p>}
      </div>
      {actions && <div className="sh-actions">{actions}</div>}
    </div>
  )
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div data-filter-bar style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: "none" }}>{children}</div>
}

/** The mono caption before a picker in a FilterBar. */
export function FilterLabel({ children }: { children: ReactNode }) {
  return <span style={{ ...eyebrowStyle, flex: "none" }}>{children}</span>
}

/** Pushes what follows it to the right end of a FilterBar. */
export function FilterSpacer() {
  return <div style={{ flex: 1 }} />
}
