import assert from "node:assert/strict"
import { test } from "node:test"
import { evaluate, parseAllowlist } from "./rls.ts"
import { isForbiddenEnvFile, scanText } from "./secrets.ts"

// Fixtures are assembled at runtime so this file never trips the scanner.
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url")
const jwt = (payload: object) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.c2lnbmF0dXJlc2lnbmF0dXJl`
const checks = (text: string) => scanText("f", text).map((f) => f.check)

test("env files: only .env.example may be tracked", () => {
  assert.equal(isForbiddenEnvFile(".env.example"), false)
  assert.equal(isForbiddenEnvFile(".env"), true)
  assert.equal(isForbiddenEnvFile("apps/web/.env.production"), true)
  assert.equal(isForbiddenEnvFile("docs/env.md"), false)
})

test("NEXT_PUBLIC_ names that announce a private credential are flagged", () => {
  const pub = "NEXT_" + "PUBLIC_"
  assert.deepEqual(checks(`${pub}SUPABASE_SERVICE_ROLE_KEY=x`), ["public-private-name"])
  assert.deepEqual(checks(`process.env.${pub}STRIPE_SECRET`), ["public-private-name"])
  assert.deepEqual(checks(`${pub}SUPABASE_PUBLISHABLE_KEY=sb_publishable_x`), [])
})

test("credential shapes", () => {
  assert.deepEqual(checks(`key=${jwt({ iss: "supabase", ref: "abcdefghijklmnopqrst", role: "service_role" })}`), ["credential"])
  // The CLI's public local-stack defaults and anon keys are not secrets.
  assert.deepEqual(checks(jwt({ iss: "supabase-demo", role: "service_role" })), [])
  assert.deepEqual(checks(jwt({ iss: "supabase", role: "anon" })), [])
  assert.deepEqual(checks("sb_" + "secret_" + "a1B2c3D4e5F6g7H8i9J0kLmN"), ["credential"])
  assert.deepEqual(checks("sb_" + "secret_" + "N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"), [])
  assert.deepEqual(checks("sb_" + "secret_local"), [])
  assert.deepEqual(checks("RESEND_API_KEY=re" + "_Ab12Cd34_Ef56Gh78Ij90Kl12Mn34Op56"), ["credential"])
  assert.deepEqual(checks("RESEND_API_KEY=re_your_sending_key_here"), [])
  assert.deepEqual(checks("-----BEGIN " + "PRIVATE KEY-----"), ["credential"])
  assert.deepEqual(checks("-----BEGIN RSA " + "PRIVATE KEY-----"), ["credential"])
  assert.deepEqual(checks("-----BEGIN PUBLIC KEY-----"), [])
})

test("rls allowlist: entries need a table and a written reason", () => {
  assert.deepEqual(parseAllowlist('{ "tables": [] }'), [])
  assert.throws(() => parseAllowlist('{ "tables": [{ "table": "public.x" }] }'), /reason/)
  assert.throws(() => parseAllowlist('{ "tables": [{ "table": "x", "reason": "long enough reason" }] }'), /public/)
})

test("rls: unlisted tables without RLS fail; listed ones pass; stale entries are noted", () => {
  const allow = [{ table: "public.lookup", reason: "static reference data, no rows per tenant" }]
  assert.deepEqual(evaluate(["public.lookup", "public.leak"], allow), { violations: ["public.leak"], stale: [] })
  assert.deepEqual(evaluate([], allow), { violations: [], stale: ["public.lookup"] })
})
