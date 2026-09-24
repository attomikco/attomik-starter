"use client"

import { useEffect, useRef, useState, type ReactNode, type UIEvent } from "react"
import { useCopy } from "@/core/i18n/client"
import type { ColumnDef, DataState, SortState } from "@/core/data/types"
import { TableEmpty, TableError, TableLoading } from "./data-states"
import { Pagination, type PaginationProps } from "./pagination"
import { nameInitials } from "@/ui/initials"
import { ROW_ACTION_WIDTH, columnMinWidth, tableMinWidth, visibleColumns } from "./table-layout"

/**
 * The canonical DataTable, ported from part-data.dc.html. Generic and
 * domain-agnostic: modules supply columns, rows, and callbacks. Sorting,
 * filtering, and paging are CONTROLLED — the table renders what it is
 * given, so a module can process client-side (core/data helpers) today and
 * server-side later without replacing the component.
 *
 * Sizing (docs/UI_STANDARDS.md, Tables): every column has a minimum width
 * it never shrinks below — explicit, else its fixed width, else a default
 * by `kind` (table-layout.ts, node-tested). The row's intrinsic width is
 * the sum of the visible minimums plus the chrome, recomputed as the column
 * picker toggles; once that no longer fits, the body scrolls sideways and
 * drives the header's scrollLeft so the two never drift, and the page never
 * scrolls sideways. Extra space goes to the flexible columns. The first
 * column is sticky on the left, the header on top; a right-edge shadow
 * shows while columns sit off-screen. Plain text cells truncate with a
 * title; header labels too; PersonCell truncates each of its lines.
 *
 * Responsive: measured against the table's own container (the rail changes
 * available width). Under 720px the header hides and rows wrap into the
 * reference's card representation, which needs no sideways scroll.
 */

const NARROW = 720
/** The row's own horizontal padding ("13px 18px" / "11px 18px") — the sticky first column sticks at this offset, not 0, so it stays flush with the row's normal left inset instead of jumping to the scroll container's bare edge. */
const ROW_PADDING_X = 18
const GAP = 14

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
  const copy = useCopy()
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

  // The header can't horizontally scroll on its own (that would let it drift
  // out of sync with the body) — it only ever receives a programmatic
  // scrollLeft, driven by the body's own real scrollbar.
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  // Right-edge shadow while columns sit off-screen to the right.
  const [moreRight, setMoreRight] = useState(false)
  const updateMoreRight = (el: HTMLDivElement) => setMoreRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 2)
  const onBodyScroll = (e: UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
    updateMoreRight(e.currentTarget)
  }

  const visible = visibleColumns(columns, hiddenColumns)
  const selectable = !!onToggleRow
  const allOn = rows.length > 0 && rows.every((r) => selected[rowKey(r)])
  useEffect(() => {
    const el = bodyScrollRef.current
    if (!el) return
    updateMoreRight(el)
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updateMoreRight(el)) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [visible.length, props.rows.length, narrow])

  const colMinWidth = (c: ColumnDef<T>): number => columnMinWidth(c)
  const truncate = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }

  const colStyle = (c: ColumnDef<T>) =>
    narrow
      // Phone card layout: a value shrinks to the row and wraps (long names, emails), never pushes past it.
      ? ({ flex: c.flex ? "1 1 100%" : "0 1 auto", minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere" } as const)
      : c.flex
        ? ({ flex: "1 1 auto", minWidth: colMinWidth(c) } as const)
        : ({ width: c.width ?? 120, minWidth: colMinWidth(c), flex: "0 0 auto" } as const)

  // Not narrow: the row/header's intrinsic width never shrinks below the sum
  // of every visible column's own floor — once that no longer fits the
  // container, the table scrolls horizontally instead of squeezing columns
  // past their floor.
  const rowMinWidth = narrow ? undefined : tableMinWidth(visible, [], { selectable, rowAction: !!onRowClick })

  // The first visible column stays put horizontally while the rest scroll
  // under it — `left` matches the row's own padding (not 0) so it stays
  // flush with the row's normal left inset instead of jumping to the bare
  // scroll-container edge. Needs its own opaque background (set per call
  // site below, header vs. selected/unselected row) to occlude whatever
  // scrolls underneath it.
  const stickyFirstColStyle = narrow ? {} : { position: "sticky" as const, left: selectable ? ROW_PADDING_X + 18 + GAP : ROW_PADDING_X, zIndex: 1 }

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
    <div ref={wrapRef} data-data-table style={{ ...(layout === "fill" ? { flex: 1, minHeight: 0 } : { flex: "none" }), display: "flex", flexDirection: "column", border: "1px solid var(--line)", borderRadius: "var(--r2)", overflow: "hidden", position: "relative" }}>
      {/* Sticky header — hidden in the narrow card representation. Never
          scrolls on its own (overflow-x hidden): its scrollLeft is only ever
          set programmatically, from the body's real scrollbar (onBodyScroll
          above), so the two can never drift out of sync. */}
      <div ref={headerScrollRef} style={{ display: narrow ? "none" : "block", overflowX: "hidden", background: "var(--shell)", borderBottom: "1px solid var(--line)", flex: "none", position: "sticky", top: 0, zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: GAP, padding: "11px 18px", minWidth: rowMinWidth }}>
          {selectable && checkbox(allOn, copy.data.selectAllRows, onToggleAll)}
          {visible.map((c, i) => {
            const sorted = sort?.key === c.key
            const header = (
              <>
                <span title={c.label} style={{ ...truncate, minWidth: 0 }}>{c.label}</span>
                {sorted && <span aria-hidden style={{ flex: "none", fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent-text)" }}>{sort?.dir === "asc" ? "▲" : "▼"}</span>}
              </>
            )
            const style = {
              ...colStyle(c),
              display: "flex", alignItems: "center", gap: 6,
              ...(c.align === "right" ? { justifyContent: "flex-end" } : {}),
              fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".11em", textTransform: "uppercase" as const,
              color: sorted ? "var(--txt)" : "var(--txt-3)",
              ...(i === 0 ? { ...stickyFirstColStyle, background: "var(--shell)" } : {}),
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
          {/* The trailing spacer exists under the SAME condition as the rows' ⋮ cell, so header and body columns always line up. */}
          {onRowClick && <span aria-hidden style={{ width: ROW_ACTION_WIDTH, flex: "none" }} />}
        </div>
      </div>

      <div ref={bodyScrollRef} className="sh-scroll" data-allow-overflow onScroll={onBodyScroll} style={{ ...(layout === "fill" ? { flex: 1, minHeight: 0 } : undefined), overflowX: narrow ? undefined : "auto" }}>
        {state === "loading" && <TableLoading rowCount={loadingRows} />}
        {state === "error" && error && <TableError {...error} />}
        {(state === "empty" || (state === "ready" && rows.length === 0)) && empty && <TableEmpty {...empty} />}
        {state === "ready" && (
          <div style={{ display: "flex", flexDirection: "column", minWidth: narrow ? undefined : rowMinWidth }}>
            {rows.map((row) => {
              const key = rowKey(row)
              const isSel = !!selected[key]
              const rowBg = isSel ? "var(--accent-tint)" : "var(--card)"
              return (
                <div
                  key={key}
                  className="sh-row-hover"
                  style={{
                    ...(narrow
                      ? { display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: "8px 12px" }
                      : { display: "flex", alignItems: "center", gap: 14 }),
                    padding: "13px 18px", borderBottom: "1px solid var(--line)",
                    background: rowBg,
                    cursor: onRowClick ? "pointer" : undefined,
                  }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && checkbox(isSel, copy.data.selectRow, () => onToggleRow(key))}
                  {visible.map((c, i) => {
                    const plain = !c.render
                    const value = plain ? String(c.text?.(row) ?? "") : null
                    return (
                      <span key={c.key} title={plain && !narrow ? value ?? undefined : undefined} style={{
                        ...colStyle(c),
                        ...(plain && !narrow ? truncate : {}),
                        ...(c.align === "right" && !narrow ? { textAlign: "right" as const } : {}),
                        ...(c.mono ? { fontFamily: "var(--mono)", fontSize: 13, color: "var(--txt-2)" } : { fontSize: 13.5, color: "var(--txt-2)" }),
                        ...(i === 0 ? { ...stickyFirstColStyle, background: rowBg } : {}),
                      }}>
                        {plain ? value : c.render!(row)}
                      </span>
                    )
                  })}
                  {onRowClick && (
                    <span aria-hidden style={{ width: ROW_ACTION_WIDTH, flex: "none", display: narrow ? "none" : "grid", placeItems: "center", color: "var(--txt-4)" }}>⋮</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {moreRight && !narrow && (
        <div aria-hidden style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 28, pointerEvents: "none", background: "linear-gradient(to left, rgba(8,10,14,.14), transparent)" }} />
      )}

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

/**
 * Reference person cell: name + mono sub-line with an initials disc. Name
 * and sub each stay on their own single line — two lines total, never more
 * — truncated with an ellipsis rather than wrapping (wrapping a long
 * sub-line risks a mid-word break once the column has a real floor width
 * instead of shrinking to fit).
 */
export function PersonCell({ name, sub }: { name: string; sub?: string }) {
  const initials = nameInitials(name)
  const lineStyle = { display: "block" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
      <span style={{ width: 30, height: 30, borderRadius: 999, background: "var(--shell)", display: "grid", placeItems: "center", flex: "none", fontSize: 11.5, fontWeight: "var(--w-bold)" as never, color: "var(--txt-2)" }}>{initials}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ ...lineStyle, fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em", color: "var(--txt)" }}>{name}</span>
        {sub && <span style={{ ...lineStyle, fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)" }}>{sub}</span>}
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
