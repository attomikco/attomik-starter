import type { CSSProperties, ReactNode } from "react"

/**
 * The one section card (docs/UI_STANDARDS.md): shell ground, the workspace
 * radius token, 22px padding, an optional header row (title, mono meta or a
 * trailing control) and an optional one-line description. Settings cards,
 * record sections and the Panel's cards are all this component; nothing
 * hard-codes a radius or a second card style.
 */
export function Section({ title, description, meta, trailing, padding = 22, bordered = false, style, children }: {
  title?: ReactNode
  description?: ReactNode
  /** Mono caption at the right of the title (a count, a period). */
  meta?: ReactNode
  /** A control or link at the right of the title. */
  trailing?: ReactNode
  padding?: number | string
  /** A hairline border instead of only the ground colour (list cards with divided rows). */
  bordered?: boolean
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div data-section style={{ background: "var(--shell)", borderRadius: "var(--r2)", padding, minWidth: 0, boxSizing: "border-box", ...(bordered ? { border: "1px solid var(--line)" } : {}), ...style }}>
      {(title || meta || trailing) && (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: description ? 4 : 14 }}>
          {title && <span style={{ fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", minWidth: 0 }}>{title}</span>}
          {meta && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)", marginLeft: "auto" }}>{meta}</span>}
          {trailing && <span style={{ marginLeft: meta ? undefined : "auto" }}>{trailing}</span>}
        </div>
      )}
      {description && <p style={{ fontSize: 13.5, color: "var(--txt-2)", lineHeight: 1.5, margin: "0 0 14px" }}>{description}</p>}
      {children}
    </div>
  )
}
