import type { ReactNode } from "react"

/**
 * Canonical data/CRUD types. Domain-agnostic: modules supply columns,
 * filter fields, rows, and actions — nothing here knows what a Customer
 * or Order is. Everything serializable is kept JSON-safe so filters,
 * sorting, and views can travel to a server API unchanged.
 */

export interface ColumnDef<T> {
  key: string
  label: string
  /** Cell renderer. Plain string cells may use `text` instead. */
  render?: (row: T) => ReactNode
  /** Plain-text accessor (also used for client-side sorting fallback). */
  text?: (row: T) => string | number
  sortable?: boolean
  /** Pinned columns cannot be hidden via the column picker. */
  pinned?: boolean
  /** Fixed width in px; omit for the flexible column. */
  width?: number
  /** One column may flex; the reference gives it to the person column. */
  flex?: boolean
  align?: "left" | "right"
  /** Render in the mono face (numerals, ids, timestamps). */
  mono?: boolean
}

export type SortDir = "asc" | "desc"

export interface SortState {
  key: string
  dir: SortDir
}

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "is_empty"
  | "is_not_empty"
  | "gte" // the reference's "at least" numeric operator
  | "lte"

export interface FilterCondition {
  field: string
  op: FilterOperator
  value: string
}

/** What a module declares filterable: field key, label, and value choices. */
export interface FilterFieldDef {
  key: string
  label: string
  /** Suggested values (enums); free text when omitted. */
  options?: string[]
  kind?: "text" | "number"
}

export interface SavedView {
  id: string
  label: string
  filters: FilterCondition[]
  sort: SortState | null
  hiddenColumns: string[]
  tab: string | null
}

export interface PageState {
  page: number
  pageSize: number
  /** Total row count — supplied by the server later, or rows.length now. */
  total: number
}

export type DataState = "loading" | "ready" | "empty" | "error"
