import { test } from "node:test"
import assert from "node:assert/strict"
import { fetchAllRows } from "./paginate.ts"

/** Fakes the Supabase/PostgREST 1,000-row cap: a page never returns more than `cap` rows. */
function fakeTable(total: number, cap = 1000) {
  const all = Array.from({ length: total }, (_, i) => ({ id: i }))
  let calls = 0
  const range = (from: number, to: number) => {
    calls++
    const data = all.slice(from, Math.min(to + 1, from + cap, total))
    return Promise.resolve({ data, error: null })
  }
  return { range, callCount: () => calls }
}

test("fetchAllRows collects every row across more than one page", async () => {
  const table = fakeTable(3448)
  const rows = await fetchAllRows(() => table)
  assert.equal(rows.length, 3448)
  assert.deepEqual(rows[0], { id: 0 })
  assert.deepEqual(rows[3447], { id: 3447 })
  assert.equal(table.callCount(), 4) // 1000, 1000, 1000, 448
})

test("fetchAllRows stops after one page when the table is under the cap", async () => {
  const table = fakeTable(3)
  const rows = await fetchAllRows(() => table)
  assert.equal(rows.length, 3)
  assert.equal(table.callCount(), 1)
})

test("fetchAllRows handles a table exactly one page long (one extra empty request confirms the end)", async () => {
  const table = fakeTable(1000)
  const rows = await fetchAllRows(() => table)
  assert.equal(rows.length, 1000)
  assert.equal(table.callCount(), 2)
})

test("fetchAllRows surfaces a page error instead of returning a partial result", async () => {
  const table = { range: () => Promise.resolve({ data: null, error: { message: "boom" } }) }
  await assert.rejects(() => fetchAllRows(() => table), /boom/)
})
