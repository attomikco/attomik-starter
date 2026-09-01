"use client"

import { copy } from "@/core/i18n"

/** Reference pagination: ‹ numbered pages ›, 32px squares, mono digits. */
export interface PaginationProps {
  page: number
  pageCount: number
  onPage: (page: number) => void
}

export function Pagination({ page, pageCount, onPage }: PaginationProps) {
  const numbers: number[] = []
  const span = 5
  let start = Math.max(1, Math.min(page - 2, pageCount - span + 1))
  for (let p = start; p <= Math.min(pageCount, start + span - 1); p++) numbers.push(p)

  const cell = (label: string, target: number | null, active = false, ariaLabel?: string) => (
    <button
      key={ariaLabel ?? label}
      className="ui-btn"
      disabled={target === null}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      onClick={() => target !== null && onPage(target)}
      style={{ width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: 12, boxSizing: "border-box",
        opacity: target === null ? 0.45 : 1,
        ...(active
          ? { background: "var(--accent)", color: "var(--accent-ink)" }
          : { background: "var(--card)", border: "1px solid var(--line)", color: "var(--txt-2)" }) }}
    >
      {label}
    </button>
  )

  return (
    <nav aria-label={copy.data.pagination} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {cell("‹", page > 1 ? page - 1 : null, false, copy.data.previousPage)}
      {numbers.map((p) => cell(String(p), p, p === page))}
      {cell("›", page < pageCount ? page + 1 : null, false, copy.data.nextPage)}
    </nav>
  )
}
