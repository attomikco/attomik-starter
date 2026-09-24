import { test } from "node:test"
import assert from "node:assert/strict"
import { countOf, pluralize } from "./pluralize.ts"

const evento = { one: "evento", other: "eventos" }

test("pluralize follows Intl rules: one for exactly 1, other for 0, 2 and fractions", () => {
  assert.equal(pluralize(1, evento), "evento")
  assert.equal(pluralize(0, evento), "eventos")
  assert.equal(pluralize(2, evento), "eventos")
  assert.equal(pluralize(1.5, evento), "eventos")
  assert.equal(pluralize(1, { one: "member", other: "members" }, "en"), "member")
})

test("countOf formats the number and picks the form", () => {
  assert.equal(countOf(1, evento), "1 evento")
  assert.equal(countOf(1234, evento, (n) => n.toLocaleString("es-MX")), "1,234 eventos")
})
