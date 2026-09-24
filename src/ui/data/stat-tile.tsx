"use client"

import Link from "next/link"
import type { CSSProperties, ReactNode } from "react"

/**
 * KPI tiles (the reference StatCard / KPI tile). StatRow is a divided strip:
 * tiles sit on a hairline ground so their gaps read as borders, inside one
 * bordered card. StatTile is a label, a value and one note line whose tone
 * follows docs/UI_STANDARDS.md: neutral by default, `up` green, `down` red
 * ONLY where a recorded exception allows it (the Panel KPI row), `warn`
 * amber for an actionable exception on the value.
 */

export function StatRow({ min = 150, children }: { min?: number; children: ReactNode }) {
  return (
    <div data-stat-row style={{ border: "1px solid var(--line)", borderRadius: "var(--r2)", overflow: "hidden", display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: 1, background: "var(--line)", minWidth: 0 }}>
      {children}
    </div>
  )
}

const NOTE_TONE: Record<"neutral" | "up" | "down" | "warn", string> = { neutral: "var(--txt-3)", up: "var(--ok)", down: "var(--bad)", warn: "var(--warn)" }

export function StatTile({ label, value, muted, note, tone = "neutral", href, size = "lg", action }: {
  label: string
  value: string
  /** A zero or empty value reads as "nothing yet", not as data. */
  muted?: boolean
  note?: string
  tone?: keyof typeof NOTE_TONE
  /** The whole tile links here. */
  href?: string
  size?: "lg" | "md"
  /** A text link under the value (Operación strip). Not combined with `href`. */
  action?: { label: string; href: string }
}) {
  const body = (
    <>
      <span style={{ fontSize: 13, color: "var(--txt-3)" }}>{label}</span>
      <span style={{ fontSize: size === "lg" ? 26 : 20, fontWeight: "var(--w-semi)" as never, letterSpacing: size === "lg" ? "-0.03em" : "-0.02em", lineHeight: 1.15, color: muted ? "var(--txt-4)" : "var(--txt)", overflowWrap: "anywhere" }}>{value}</span>
      {note && <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: NOTE_TONE[tone] }}>{note}</span>}
      {action && <Link href={action.href} style={{ fontSize: 13, fontWeight: "var(--w-semi)" as never, color: "var(--accent-text)", textDecoration: "none", whiteSpace: "nowrap", marginTop: 4 }}>{action.label}</Link>}
    </>
  )
  const style: CSSProperties = { background: "var(--shell)", padding: size === "lg" ? "16px 18px" : "14px 18px", display: "flex", flexDirection: "column", gap: size === "lg" ? 6 : 4, minWidth: 0, textDecoration: "none", color: "inherit" }
  return href
    ? <Link href={href} className="sh-row-hover" data-stat-tile style={style}>{body}</Link>
    : <div data-stat-tile style={style}>{body}</div>
}
