"use client"

import { useEffect, useRef, useState, type ReactNode, type UIEvent } from "react"
import { useCopy } from "@/core/i18n/client"
import type { ColumnDef, DataState, SortState } from "@/core/data/types"
import { TableEmpty, TableError, TableLoading } from "./data-states"
import { Pagination, type PaginationProps } from "./pagination"
import { nameInitials } from "@/ui/initials"

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
/** A flex column with no explicit minWidth used to have none at all (`minWidth: 0`) — the actual cause of a header-label/cell collision bug: it could shrink to zero and let its own content overflow into the next column instead of the table scrolling. */
const DEFAULT_FLEX_MIN_WIDTH = 200
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
  const onBodyScroll = (e: UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
  }

  const visible = columns.filter((c) => c.pinned || !hiddenColumns.includes(c.key))
  const selectable = !!onToggleRow
  const allOn = rows.length > 0 && rows.every((r) => selected[rowKey(r)])

  const colMinWidth = (c: ColumnDef<T>): number => c.flex ? (c.minWidth ?? DEFAULT_FLEX_MIN_WIDTH) : (c.minWidth ?? c.width ?? 120)

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
  const extraSlots = (selectable ? 1 : 0) + (onRowClick ? 1 : 0)
  const rowMinWidth = narrow ? undefined : visible.reduce((sum, c) => sum + colMinWidth(c), 0)
    + (selectable ? 18 : 0) + (onRowClick ? 34 : 0)
    + GAP * (visible.length - 1 + extraSlots)
    + ROW_PADDING_X * 2

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
    <div ref={wrapRef} style={{ ...(layout === "fill" ? { flex: 1, minHeight: 0 } : { flex: "none" }), display: "flex", flexDirection: "column", border: "1px solid var(--line)", borderRadius: "var(--r2)", overflow: "hidden", position: "relative" }}>
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
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{c.label}</span>
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
          <span style={{ width: 34, flex: "none" }} />
        </div>
      </div>

      <div className="sh-scroll" onScroll={onBodyScroll} style={{ ...(layout === "fill" ? { flex: 1, minHeight: 0 } : undefined), overflowX: narrow ? undefined : "auto" }}>
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
                  {visible.map((c, i) => (
                    <span key={c.key} style={{
                      ...colStyle(c),
                      ...(c.align === "right" && !narrow ? { textAlign: "right" as const } : {}),
                      ...(c.mono ? { fontFamily: "var(--mono)", fontSize: 13, color: "var(--txt-2)" } : { fontSize: 13.5, color: "var(--txt-2)" }),
                      ...(i === 0 ? { ...stickyFirstColStyle, background: rowBg } : {}),
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
        )}
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
