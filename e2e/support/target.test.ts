import { test } from "node:test"
import assert from "node:assert/strict"
import { DEFAULT_LOCAL_URL, resolveE2eTarget } from "./target.ts"

const REF = "abcdefghijklmnopqrst"
const refs = [REF]
const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`
const local = { E2E_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local", E2E_SUPABASE_SERVICE_ROLE_KEY: "sb_secret_local" }

test("defaults to the local stack and returns its keys", () => {
  const t = resolveE2eTarget(local, refs)
  assert.equal(t.url, DEFAULT_LOCAL_URL)
  assert.equal(t.publishableKey, "sb_publishable_local")
  assert.equal(t.serviceRoleKey, "sb_secret_local")
})

test("accepts every loopback spelling, and strips a trailing slash", () => {
  for (const url of ["http://127.0.0.1:54321", "http://localhost:54321/", "http://[::1]:54321"]) {
    assert.equal(resolveE2eTarget({ ...local, E2E_SUPABASE_URL: url }, refs).url, url.replace(/\/+$/, ""))
  }
})

test("refuses the hosted project, by host and by ref", () => {
  assert.throws(() => resolveE2eTarget({ ...local, E2E_SUPABASE_URL: `https://${REF}.supabase.co` }, refs), /HOSTED Supabase project/)
  assert.throws(() => resolveE2eTarget({ ...local, E2E_SUPABASE_URL: "https://other-project.supabase.co" }, refs), /HOSTED Supabase project/)
  assert.throws(() => resolveE2eTarget({ ...local, E2E_SUPABASE_URL: `http://127.0.0.1:54321/${REF}` }, refs), /HOSTED Supabase project/)
})

test("refuses anything that is not loopback, lookalikes included", () => {
  for (const url of ["https://example.com", "http://127.0.0.1.evil.com", "http://localhost.evil.com:54321", "http://10.0.0.5:54321", "not a url"]) {
    assert.throws(() => resolveE2eTarget({ ...local, E2E_SUPABASE_URL: url }, refs), /e2e refused/, url)
  }
})

test("a hosted URL exported in the shell fails fast even when the E2E_ variables are local", () => {
  assert.throws(() => resolveE2eTarget({ ...local, NEXT_PUBLIC_SUPABASE_URL: `https://${REF}.supabase.co` }, refs), /NEXT_PUBLIC_SUPABASE_URL .* HOSTED/)
  assert.throws(() => resolveE2eTarget({ ...local, SUPABASE_URL: `https://${REF}.supabase.co` }, refs), /SUPABASE_URL .* HOSTED/)
  // A local ambient value is fine.
  assert.equal(resolveE2eTarget({ ...local, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" }, refs).url, DEFAULT_LOCAL_URL)
})

test("both keys are required", () => {
  assert.throws(() => resolveE2eTarget({}, refs), /required/)
  assert.throws(() => resolveE2eTarget({ E2E_SUPABASE_PUBLISHABLE_KEY: "x" }, refs), /required/)
  assert.throws(() => resolveE2eTarget({ E2E_SUPABASE_SERVICE_ROLE_KEY: "x" }, refs), /required/)
})

test("a hosted project's key is refused even with a local URL", () => {
  const hostedKey = jwt({ iss: "supabase", ref: REF, role: "service_role" })
  assert.throws(() => resolveE2eTarget({ ...local, E2E_SUPABASE_SERVICE_ROLE_KEY: hostedKey }, refs), /hosted project "abcdefghijklmnopqrst"/)
  assert.throws(() => resolveE2eTarget({ ...local, E2E_SUPABASE_PUBLISHABLE_KEY: hostedKey }, refs), /hosted project/)
  // The local stack's demo JWTs carry no ref.
  const demo = jwt({ iss: "supabase-demo", role: "service_role" })
  assert.equal(resolveE2eTarget({ ...local, E2E_SUPABASE_SERVICE_ROLE_KEY: demo }, refs).serviceRoleKey, demo)
})
