import { test } from "node:test"
import assert from "node:assert/strict"
import {
  applyFilters,
  applySearch,
  applySort,
  clampPage,
  deserializeView,
  isDirty,
  pageCount,
  pageSlice,
  pageSummary,
  serializeView,
  toggleSort,
} from "./query.ts"
import type { SavedView } from "./types"

type Row = { id: string; name: string; amount: number; owner: string }
const rows: Row[] = [
  { id: "a", name: "Beta", amount: 500, owner: "sam" },
  { id: "b", name: "alpha", amount: 100, owner: "" },
  { id: "c", name: "Gamma", amount: 900, owner: "mara" },
]
const valueOf = (r: Row, k: string) => r[k as keyof Row]

test("toggleSort: new key sorts desc, same key flips (reference behavior)", () => {
  assert.deepEqual(toggleSort(null, "name"), { key: "name", dir: "desc" })
  assert.deepEqual(toggleSort({ key: "name", dir: "desc" }, "name"), { key: "name", dir: "asc" })
  assert.deepEqual(toggleSort({ key: "name", dir: "asc" }, "amount"), { key: "amount", dir: "desc" })
})

test("applySort: numeric and locale string sorting, original untouched", () => {
  const byAmount = applySort(rows, { key: "amount", dir: "asc" }, valueOf)
  assert.deepEqual(byAmount.map((r) => r.id), ["b", "a", "c"])
  const byName = applySort(rows, { key: "name", dir: "asc" }, valueOf)
  assert.deepEqual(byName.map((r) => r.id), ["b", "a", "c"])
  assert.equal(rows[0].id, "a")
  assert.deepEqual(applySort(rows, null, valueOf).map((r) => r.id), ["a", "b", "c"])
})

test("applySearch: module-provided searchable text only", () => {
  const search = (r: Row) => `${r.name} ${r.owner}`
  assert.deepEqual(applySearch(rows, "MAR", search).map((r) => r.id), ["c"])
  assert.deepEqual(applySearch(rows, "  ", search).length, 3)
  assert.deepEqual(applySearch(rows, "900", search).length, 0, "amount not searchable unless declared")
})

test("applyFilters: match-all with every operator", () => {
  const f = (conds: Parameters<typeof applyFilters<Row>>[1]) => applyFilters(rows, conds, valueOf).map((r) => r.id)
  assert.deepEqual(f([{ field: "owner", op: "equals", value: "sam" }]), ["a"])
  assert.deepEqual(f([{ field: "owner", op: "not_equals", value: "sam" }]), ["b", "c"])
  assert.deepEqual(f([{ field: "name", op: "contains", value: "am" }]), ["c"])
  assert.deepEqual(f([{ field: "owner", op: "is_empty", value: "" }]), ["b"])
  assert.deepEqual(f([{ field: "owner", op: "is_not_empty", value: "" }]), ["a", "c"])
  assert.deepEqual(f([{ field: "amount", op: "gte", value: "500" }]), ["a", "c"])
  assert.deepEqual(f([{ field: "amount", op: "lte", value: "$500.00" }]), ["a", "b"])
  assert.deepEqual(
    f([
      { field: "amount", op: "gte", value: "200" },
      { field: "name", op: "contains", value: "beta" },
    ]),
    ["a"],
  )
})

test("pagination calculations stay consistent", () => {
  assert.equal(pageCount({ total: 0, pageSize: 8 }), 1)
  assert.equal(pageCount({ total: 12, pageSize: 8 }), 2)
  assert.equal(clampPage(9, { total: 12, pageSize: 8 }), 2)
  assert.equal(clampPage(0, { total: 12, pageSize: 8 }), 1)
  assert.deepEqual(pageSlice([1, 2, 3, 4, 5], { page: 2, pageSize: 2 }), [3, 4])
  const words = { pageEmpty: "Showing 0 records", pageRange: (a: number, b: number, total: string) => `Showing ${a}–${b} of ${total}` }
  assert.equal(pageSummary({ page: 2, pageSize: 2, total: 5 }, 2, words), "Showing 3–4 of 5")
  assert.equal(pageSummary({ page: 1, pageSize: 2, total: 0 }, 0, words), "Showing 0 records")
  assert.equal(pageSummary({ page: 1, pageSize: 25, total: 1204 }, 25, words, (n) => n.toLocaleString("en-US")), "Showing 1–25 of 1,204")
})

test("saved views serialize and survive malformed input", () => {
  const view: SavedView = {
    id: "v1", label: "Over 500",
    filters: [{ field: "amount", op: "gte", value: "500" }],
    sort: { key: "amount", dir: "desc" },
    hiddenColumns: ["owner"], tab: "All",
  }
  assert.deepEqual(deserializeView(serializeView(view)), view)
  assert.equal(deserializeView("not json"), null)
  assert.equal(deserializeView('{"nope":1}'), null)
  const partial = deserializeView('{"id":"x","label":"y"}')
  assert.deepEqual(partial, { id: "x", label: "y", filters: [], sort: null, hiddenColumns: [], tab: null })
})

test("dirty-state comparison is key-order insensitive", () => {
  assert.equal(isDirty({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 }), false)
  assert.equal(isDirty({ a: 1 }, { a: 2 }), true)
  assert.equal(isDirty({ a: 1 }, { a: 1, b: undefined }), true)
})
