import { test } from "node:test"
import assert from "node:assert/strict"
import { validateEmail, emailInitials } from "./email-validation.ts"
import { sanitizeNextPath } from "./redirects.ts"

test("email validation names the specific problem (reference copy)", () => {
  assert.equal(validateEmail("").ok, false)
  assert.match((validateEmail("") as { message: string }).message, /address you use at work/)
  assert.match((validateEmail("name.company.com") as { message: string }).message, /Missing the @/)
  assert.match((validateEmail("na me@company.com") as { message: string }).message, /cannot contain spaces/)
  assert.match((validateEmail("name@company") as { message: string }).message, /needs a dot/)
  assert.match((validateEmail("name@company.c") as { message: string }).message, /complete email address/)
})

test("valid emails pass and are trimmed", () => {
  const ok = validateEmail("  pablo@attomik.co ")
  assert.deepEqual(ok, { ok: true, email: "pablo@attomik.co" })
  assert.equal(validateEmail("a.b+tag@sub.domain.io").ok, true)
})

test("initials derive safely from email", () => {
  assert.equal(emailInitials("pablo@attomik.co"), "PA")
  assert.equal(emailInitials("anna.hayes@attomik.co"), "AH")
  assert.equal(emailInitials("sam_whitfield@x.io"), "SW")
  assert.equal(emailInitials("a@b.co"), "A")
})

test("next path: local application paths pass through", () => {
  assert.equal(sanitizeNextPath("/media"), "/media")
  assert.equal(sanitizeNextPath("/customers?tab=all"), "/customers?tab=all")
  assert.equal(sanitizeNextPath("/dev/shell"), "/dev/shell")
})

test("next path: external and open redirects are rejected", () => {
  assert.equal(sanitizeNextPath("https://evil.example"), "/")
  assert.equal(sanitizeNextPath("//evil.example"), "/")
  assert.equal(sanitizeNextPath("/\\evil.example"), "/")
  assert.equal(sanitizeNextPath("/a://b"), "/")
  assert.equal(sanitizeNextPath("javascript:alert(1)"), "/")
})

test("next path: empty/invalid falls back, auth loops avoided", () => {
  assert.equal(sanitizeNextPath(null), "/")
  assert.equal(sanitizeNextPath(""), "/")
  assert.equal(sanitizeNextPath("media"), "/")
  assert.equal(sanitizeNextPath("/login"), "/")
  assert.equal(sanitizeNextPath("/auth/callback"), "/")
})
