"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { copy } from "@/core/i18n"
import type { ColumnDef, DataState, SortState } from "@/core/data/types"
import { TableEmpty, TableError, TableLoading } from "./data-states"
import { Pagination, type PaginationProps } from "./pagination"

/**
 * The canonical DataTable, ported from part-data.dc.html. Generic and
 * domain-agnostic: modules supply columns, rows, and callbacks. Sorting,
 * filtering, and paging are CONTROLLED — the table renders what it is
 * given, so a module can process client-side (core/data helpers) today and
 * server-side later without replacing the component.
 *
 * Responsive: measured against the table's own container (the rail changes
 * available width). Under 720px the header hides and rows wrap into the
 * reference's card representation.
 */

const NARROW = 720

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  rows: T[]
  rowKey: (row: T) => string
  sort?: SortState | null
  onSort?: (key: string) => void
  hiddenColumns?: string[]
  selected?: Record<string, boolean>
  onToggleRow?: (key: string) => void
  onToggleAll?: () => void
  onRowClick?: (row: T) => void
  state?: DataState
  loadingRows?: number
  empty?: { title: string; body?: string; action?: { label: string; onRun: () => void } }
  error?: { title: string; body?: string; onRetry: () => void; traceId?: string }
  footerText?: string
  pagination?: PaginationProps
  /**
   * "fill" (default) stretches into the parent's remaining height — right
   * for data-heavy screens. "auto" hugs the rows — right for settings-style
   * pages where a near-empty table must not reserve viewport height.
   */
  layout?: "fill" | "auto"
}

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    columns, rows, rowKey, sort, onSort, hiddenColumns = [],
    selected = {}, onToggleRow, onToggleAll, onRowClick,
    state = "ready", loadingRows, empty, error, footerText, pagination,
    layout = "fill",
  } = props

  const wrapRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => setNarrow(el.getBoundingClientRect().width < NARROW))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const visible = columns.filter((c) => c.pinned || !hiddenColumns.includes(c.key))
  const selectable = !!onToggleRow
  const allOn = rows.length > 0 && rows.every((r) => selected[rowKey(r)])

  const colStyle = (c: ColumnDef<T>) =>
    narrow
      ? ({ flex: c.flex ? "1 1 100%" : "0 0 auto", minWidth: 0 } as const)
      : c.flex
        ? ({ flex: 1, minWidth: 0 } as const)
        : ({ width: c.width ?? 120, flex: "none" } as const)

  const checkbox = (on: boolean, label: string, onClick?: () => void) => (
    <button
      className="ui-btn"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      style={{ width: 18, height: 18, borderRadius: 5, flex: "none", display: "grid", placeItems: "center", fontSize: 11, boxSizing: "border-box",
        ...(on ? { background: "var(--accent)", color: "var(--accent-ink)", border: "1.5px solid var(--accent)" } : { border: "1.5px solid var(--line-2)", color: "transparent" }) }}
    >
      {on ? "✓" : ""}
    </button>
  )

  return (
    <div ref={wrapRef} style={{ ...(layout === "fill" ? { flex: 1, minHeight: 0 } : { flex: "none" }), display: "flex", flexDirection: "column", border: "1px solid var(--line)", borderRadius: "var(--r2)", overflow: "hidden", position: "relative" }}>
      {/* Sticky header — hidden in the narrow card representation */}
      <div style={{ display: narrow ? "none" : "flex", alignItems: "center", gap: 14, padding: "11px 18px", background: "var(--shell)", borderBottom: "1px solid var(--line)", flex: "none", position: "sticky", top: 0, zIndex: 5 }}>
        {selectable && checkbox(allOn, copy.data.selectAllRows, onToggleAll)}
        {visible.map((c) => {
          const sorted = sort?.key === c.key
          const header = (
            <>
              {c.label}
              {sorted && <span aria-hidden style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent-text)" }}>{sort?.dir === "asc" ? "▲" : "▼"}</span>}
            </>
          )
          const style = {
            ...colStyle(c),
            display: "flex", alignItems: "center", gap: 6,
            ...(c.align === "right" ? { justifyContent: "flex-end" } : {}),
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".11em", textTransform: "uppercase" as const,
            color: sorted ? "var(--txt)" : "var(--txt-3)",
          }
          return c.sortable && onSort ? (
            <button key={c.key} className="ui-btn" style={style} onClick={() => onSort(c.key)}
              aria-sort={sorted ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"}>
              {header}
            </button>
          ) : (
            <span key={c.key} style={style}>{header}</span>
          )
        })}
        <span style={{ width: 34, flex: "none" }} />
      </div>

      <div className="sh-scroll" style={layout === "fill" ? { flex: 1, minHeight: 0 } : undefined}>
        {state === "loading" && <TableLoading rowCount={loadingRows} />}
        {state === "error" && error && <TableError {...error} />}
        {(state === "empty" || (state === "ready" && rows.length === 0)) && empty && <TableEmpty {...empty} />}
        {state === "ready" &&
          rows.map((row) => {
            const key = rowKey(row)
            const isSel = !!selected[key]
            return (
              <div
                key={key}
                className="sh-row-hover"
                style={{
                  ...(narrow
                    ? { display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: "8px 12px" }
                    : { display: "flex", alignItems: "center", gap: 14 }),
                  padding: "13px 18px", borderBottom: "1px solid var(--line)",
                  background: isSel ? "var(--accent-tint)" : "var(--card)",
                  cursor: onRowClick ? "pointer" : undefined,
                }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable && checkbox(isSel, copy.data.selectRow, () => onToggleRow(key))}
                {visible.map((c) => (
                  <span key={c.key} style={{
                    ...colStyle(c),
                    ...(c.align === "right" && !narrow ? { textAlign: "right" as const } : {}),
                    ...(c.mono ? { fontFamily: "var(--mono)", fontSize: 13, color: "var(--txt-2)" } : { fontSize: 13.5, color: "var(--txt-2)" }),
                  }}>
                    {c.render ? c.render(row) : String(c.text?.(row) ?? "")}
                  </span>
                ))}
                {onRowClick && (
                  <span aria-hidden style={{ width: 34, flex: "none", display: narrow ? "none" : "grid", placeItems: "center", color: "var(--txt-4)" }}>⋮</span>
                )}
              </div>
            )
          })}
      </div>

      {(footerText || pagination) && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", background: "var(--shell)", borderTop: "1px solid var(--line)", flex: "none" }}>
          {footerText && <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)" }}>{footerText}</span>}
          <div style={{ flex: 1 }} />
          {pagination && <Pagination {...pagination} />}
        </div>
      )}
    </div>
  )
}

/** Reference person cell: name + mono sub-line with an initials disc. */
export function PersonCell({ name, sub }: { name: string; sub?: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
      <span style={{ width: 30, height: 30, borderRadius: 999, background: "var(--shell)", display: "grid", placeItems: "center", flex: "none", fontSize: 11.5, fontWeight: "var(--w-bold)" as never, color: "var(--txt-2)" }}>{initials}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em", color: "var(--txt)" }}>{name}</span>
        {sub && <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)" }}>{sub}</span>}
      </span>
    </span>
  )
}

/** Status/tone chip from the reference: mono label, tint ground, tone dot. */
export function ToneChip({ tone, label }: { tone: "ok" | "warn" | "bad" | "neutral"; label: ReactNode }) {
  const colors = tone === "neutral"
    ? { text: "var(--txt-3)", bg: "var(--shell)", dot: "var(--txt-3)" }
    : { text: `var(--${tone})`, bg: `var(--${tone}-tint)`, dot: `var(--${tone}-fill)` }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--mono)", fontSize: 11.5, color: colors.text, background: colors.bg, border: "1px solid var(--line)", borderRadius: 999, padding: "4px 10px" }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, display: "block", flex: "none", background: colors.dot }} />
      {label}
    </span>
  )
}
