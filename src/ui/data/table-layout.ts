/**
 * DataTable sizing rules (docs/UI_STANDARDS.md, Tables), pure so they are
 * node-tested: every column has a minimum width it never shrinks below;
 * the table's own minimum is the sum of its VISIBLE columns' minimums plus
 * the fixed chrome (gaps, padding, the select checkbox, the row-action
 * spacer). When that exceeds the container the table scrolls sideways
 * inside its own wrapper; extra space goes to the flexible columns.
 */

export interface SizedColumn {
  key: string
  width?: number
  flex?: boolean
  minWidth?: number
  kind?: "text" | "date" | "status" | "number" | "code"
  pinned?: boolean
}

export const MIN_BY_KIND: Record<NonNullable<SizedColumn["kind"]>, number> = { text: 160, date: 120, status: 130, number: 100, code: 90 }
export const CELL_GAP = 14
export const ROW_PADDING_X = 18
export const CHECKBOX_WIDTH = 18
export const ROW_ACTION_WIDTH = 34

/** A column's minimum: explicit, else its fixed width, else its kind's default, else the text default. */
export function columnMinWidth(c: SizedColumn): number {
  if (c.minWidth !== undefined) return c.minWidth
  if (c.width !== undefined) return c.width
  if (c.kind) return MIN_BY_KIND[c.kind]
  return MIN_BY_KIND.text
}

export function visibleColumns<C extends SizedColumn>(columns: C[], hidden: readonly string[]): C[] {
  return columns.filter((c) => c.pinned || !hidden.includes(c.key))
}

/** The table's min-width for a set of visible columns and its chrome. */
export function tableMinWidth(columns: SizedColumn[], hidden: readonly string[], chrome: { selectable?: boolean; rowAction?: boolean } = {}): number {
  const visible = visibleColumns(columns, hidden)
  const cells = visible.length + (chrome.selectable ? 1 : 0) + (chrome.rowAction ? 1 : 0)
  const gaps = Math.max(0, cells - 1) * CELL_GAP
  const chromeWidth = (chrome.selectable ? CHECKBOX_WIDTH : 0) + (chrome.rowAction ? ROW_ACTION_WIDTH : 0)
  return visible.reduce((sum, c) => sum + columnMinWidth(c), 0) + chromeWidth + gaps + ROW_PADDING_X * 2
}
