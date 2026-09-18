import { test } from "node:test"
import assert from "node:assert/strict"
import { createClient } from "@supabase/supabase-js"
import { fetchAllRows } from "./paginate.ts"
import { ROW_CAP, assessRowCap, guardRowCap, rowCapModeFor } from "./row-cap-guard.ts"

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }))
const url = (path: string) => new URL(`https://example.supabase.co/rest/v1/${path}`)

test("the cap is PostgREST's 1,000, and only production merely warns", () => {
  assert.equal(ROW_CAP, 1000)
  assert.equal(rowCapModeFor("production"), "warn")
  for (const env of ["development", "test", undefined]) assert.equal(rowCapModeFor(env), "throw", String(env))
})

test("assess: exactly 1,000 rows with no limit is the violation", () => {
  const message = assessRowCap({ method: "GET", url: url("items?select=id&workspace_id=eq.abc"), data: rows(1000) })
  assert.ok(message)
  assert.match(message, /exactly 1000 rows/)
  assert.match(message, /fetchAllRows/)
  assert.match(message, /items\?select=id&workspace_id=eq\.abc/, "the message carries the query")
})

test("assess: everything that is not a truncated plain read is fine", () => {
  const ok = (over: Partial<Parameters<typeof assessRowCap>[0]>) => assert.equal(assessRowCap({ method: "GET", url: url("t?select=id"), data: rows(1000), ...over }), null)
  ok({ data: rows(999) })
  ok({ data: rows(1001) }) // not something the cap produces
  ok({ data: rows(1) })
  ok({ data: null })
  ok({ data: { id: 1 } }) // a single-row read
  ok({ url: url("t?select=id&limit=1000&offset=0") }) // .range() / .limit() / fetchAllRows
  ok({ error: { message: "boom" } })
  ok({ method: "POST" }) // an insert ... returning rows: writes are not capped
  ok({ method: "PATCH" })
  ok({ method: "DELETE" })
})

test("assess: an rpc is a read too", () => {
  assert.ok(assessRowCap({ method: "POST", url: url("rpc/receivables_aging"), data: rows(1000) }))
  assert.equal(assessRowCap({ method: "POST", url: url("rpc/receivables_aging?limit=10"), data: rows(1000) }), null)
})

/**
 * A real supabase-js client over a stub PostgREST: it honours limit/offset like
 * the server does and caps an unbounded request at 1,000 rows, so the guard is
 * tested against how the installed postgrest-js really builds requests.
 */
function stubClient(total: number, mode: "throw" | "warn" = "throw", warned: string[] = []) {
  const fetchStub: typeof fetch = async (input, init) => {
    const u = new URL(String(input))
    const method = init?.method ?? "GET"
    if (method === "HEAD") return new Response(null, { status: 200, headers: { "content-range": `*/${total}` } })
    const offset = Number(u.searchParams.get("offset") ?? 0)
    const limit = Math.min(Number(u.searchParams.get("limit") ?? ROW_CAP), ROW_CAP)
    const body = method === "POST" && !u.pathname.includes("/rpc/") ? rows(2) : rows(total).slice(offset, offset + limit)
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } })
  }
  const client = createClient("https://example.supabase.co", "sb_publishable_test", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchStub } })
  return guardRowCap(client, { mode, warn: (m) => warned.push(m) })
}

test("a plain select that returns the capped 1,000 rows rejects (development / test)", async () => {
  const supabase = stubClient(2500)
  await assert.rejects(async () => { await supabase.from("items").select("id").eq("workspace_id", "abc") }, /Row cap: .*items/)
})

test("the same read is fine when it is not truncated", async () => {
  const { data, error } = await stubClient(999).from("items").select("id")
  assert.equal(error, null)
  assert.equal(data?.length, 999)
})

test("an explicit range or limit is a request for those rows, not a truncation", async () => {
  const supabase = stubClient(2500)
  assert.equal((await supabase.from("t").select("id").range(0, 999)).data?.length, 1000)
  assert.equal((await supabase.from("t").select("id").limit(1000)).data?.length, 1000)
})

test("fetchAllRows pages a 2,500-row table through the guard without tripping it", async () => {
  const supabase = stubClient(2500)
  const all = await fetchAllRows<{ id: number }>(() => supabase.from("t").select("id").order("id"))
  assert.equal(all.length, 2500)
})

test("exactly 1,000 rows through fetchAllRows also passes (its pages always carry a limit)", async () => {
  const all = await fetchAllRows<{ id: number }>(() => stubClient(1000).from("t").select("id").order("id"))
  assert.equal(all.length, 1000)
})

test("head/count reads, writes, errors and single rows are never flagged", async () => {
  const supabase = stubClient(2500)
  const count = await supabase.from("t").select("id", { count: "exact", head: true })
  assert.equal(count.error, null)
  const inserted = await supabase.from("t").insert(rows(2)).select("id")
  assert.equal(inserted.error, null)
  const one = await stubClient(1).from("t").select("id").maybeSingle()
  assert.equal(one.error, null)
})

test("an rpc that comes back capped is caught too", async () => {
  await assert.rejects(async () => { await stubClient(2500).rpc("some_set_returning_fn") }, /Row cap/)
})

test("schema() clients are guarded as well", async () => {
  await assert.rejects(async () => { await stubClient(2500).schema("public").from("t").select("id") }, /Row cap/)
})

test("production warns with the query and still returns the rows", async () => {
  const warned: string[] = []
  const { data, error } = await stubClient(2500, "warn", warned).from("items").select("id").eq("workspace_id", "abc")
  assert.equal(error, null)
  assert.equal(data?.length, 1000, "the caller still gets the (truncated) rows: a page must not break in production")
  assert.equal(warned.length, 1)
  assert.match(warned[0], /items\?select=id&workspace_id=eq\.abc/)
})

test("the rest of the client passes through untouched", () => {
  const supabase = stubClient(1)
  assert.equal(typeof supabase.auth.getSession, "function")
  assert.equal(typeof supabase.storage.from, "function")
})
