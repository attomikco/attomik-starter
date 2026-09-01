import type {
  FilterCondition,
  PageState,
  SavedView,
  SortDir,
  SortState,
} from "./types"

/**
 * Pure, domain-agnostic query helpers. Client-side today; the same
 * serializable SortState/FilterCondition/PageState shapes are what a module
 * sends to a server API when the dataset outgrows the client (the DataTable
 * itself never assumes where processing happens).
 */

/** Reference behavior: new column sorts desc, clicking again flips. */
export function toggleSort(current: SortState | null, key: string): SortState {
  if (!current || current.key !== key) return { key, dir: "desc" }
  return { key, dir: current.dir === "desc" ? "asc" : "desc" }
}

export function applySort<T>(
  rows: T[],
  sort: SortState | null,
  valueOf: (row: T, key: string) => unknown,
): T[] {
  if (!sort) return rows.slice()
  const dir: number = sort.dir === "asc" ? 1 : -1
  return rows.slice().sort((a, b) => {
    const x = valueOf(a, sort.key)
    const y = valueOf(b, sort.key)
    if (typeof x === "number" && typeof y === "number") return (x - y) * dir
    return String(x ?? "").localeCompare(String(y ?? "")) * dir
  })
}

/** Modules decide which fields are searchable — rows are never stringified blindly. */
export function applySearch<T>(
  rows: T[],
  query: string,
  searchText: (row: T) => string,
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((r) => searchText(r).toLowerCase().includes(q))
}

export function matchesCondition(
  value: unknown,
  condition: FilterCondition,
): boolean {
  const raw = value === null || value === undefined ? "" : String(value)
  const target = condition.value
  switch (condition.op) {
    case "equals":
      return raw === target
    case "not_equals":
      return raw !== target
    case "contains":
      return raw.toLowerCase().includes(target.toLowerCase())
    case "is_empty":
      return raw.trim() === ""
    case "is_not_empty":
      return raw.trim() !== ""
    case "gte":
      return toNumber(raw) >= toNumber(target)
    case "lte":
      return toNumber(raw) <= toNumber(target)
    default:
      return true
  }
}

function toNumber(v: string): number {
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? n : 0
}

/** Match-all semantics, as the reference's "Match all conditions" panel. */
export function applyFilters<T>(
  rows: T[],
  conditions: FilterCondition[],
  valueOf: (row: T, key: string) => unknown,
): T[] {
  if (conditions.length === 0) return rows
  return rows.filter((r) => conditions.every((c) => matchesCondition(valueOf(r, c.field), c)))
}

// ---------------------------------------------------------------- paging

export function pageCount(state: Pick<PageState, "total" | "pageSize">): number {
  return Math.max(1, Math.ceil(state.total / Math.max(1, state.pageSize)))
}

export function clampPage(page: number, state: Pick<PageState, "total" | "pageSize">): number {
  return Math.min(Math.max(1, page), pageCount(state))
}

/** Client-side slice for the current page; unused once the server pages. */
export function pageSlice<T>(rows: T[], state: Pick<PageState, "page" | "pageSize">): T[] {
  const start = (state.page - 1) * state.pageSize
  return rows.slice(start, start + state.pageSize)
}

export function pageSummary(state: PageState, shown: number): string {
  if (state.total === 0) return "Showing 0 records"
  const start = (state.page - 1) * state.pageSize + 1
  return `Showing ${start}–${start + shown - 1} of ${state.total.toLocaleString("en-US")}`
}

// ------------------------------------------------------------ saved views

export function serializeView(view: SavedView): string {
  return JSON.stringify(view)
}

export function deserializeView(raw: string): SavedView | null {
  try {
    const v = JSON.parse(raw) as SavedView
    if (typeof v?.id !== "string" || typeof v?.label !== "string") return null
    return {
      id: v.id,
      label: v.label,
      filters: Array.isArray(v.filters) ? v.filters : [],
      sort: v.sort && typeof v.sort.key === "string" ? v.sort : null,
      hiddenColumns: Array.isArray(v.hiddenColumns) ? v.hiddenColumns : [],
      tab: typeof v.tab === "string" ? v.tab : null,
    }
  } catch {
    return null
  }
}

// ------------------------------------------------------------ dirty state

/** Order-insensitive deep equality over JSON-safe form values. */
export function isDirty(saved: unknown, draft: unknown): boolean {
  return stable(saved) !== stable(draft)
}

function stable(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v)
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]"
  const obj = v as Record<string, unknown>
  return (
    "{" +
    Object.keys(obj)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + stable(obj[k]))
      .join(",") +
    "}"
  )
}

export type { SortDir }
