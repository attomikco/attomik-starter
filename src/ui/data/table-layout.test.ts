import { test } from "node:test"
import assert from "node:assert/strict"
import { CELL_GAP, CHECKBOX_WIDTH, MIN_BY_KIND, ROW_ACTION_WIDTH, ROW_PADDING_X, columnMinWidth, tableMinWidth } from "./table-layout.ts"

test("a column's minimum: explicit, else its width, else its kind, else text", () => {
  assert.equal(columnMinWidth({ key: "a", minWidth: 220, width: 100 }), 220)
  assert.equal(columnMinWidth({ key: "b", width: 110 }), 110)
  assert.equal(columnMinWidth({ key: "c", kind: "date" }), MIN_BY_KIND.date)
  assert.equal(columnMinWidth({ key: "d", flex: true }), MIN_BY_KIND.text)
  assert.equal(columnMinWidth({ key: "e", kind: "code" }), 90)
})

test("the table's min-width is the sum of the VISIBLE columns' minimums plus chrome", () => {
  const columns = [
    { key: "date", kind: "date" as const, pinned: true },
    { key: "site", flex: true, minWidth: 220 },
    { key: "status", kind: "status" as const },
    { key: "amount", kind: "number" as const, width: 120 },
  ]
  const all = 120 + 220 + 130 + 120
  assert.equal(tableMinWidth(columns, []), all + 3 * CELL_GAP + 2 * ROW_PADDING_X)
  // Hiding a column (Columnas picker) shrinks the minimum; a pinned column cannot be hidden.
  assert.equal(tableMinWidth(columns, ["status", "date"]), 120 + 220 + 120 + 2 * CELL_GAP + 2 * ROW_PADDING_X)
  // Select checkbox and the row-action spacer count as cells.
  assert.equal(tableMinWidth(columns, [], { selectable: true, rowAction: true }), all + CHECKBOX_WIDTH + ROW_ACTION_WIDTH + 5 * CELL_GAP + 2 * ROW_PADDING_X)
})
