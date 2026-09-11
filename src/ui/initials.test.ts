import { test } from "node:test"
import assert from "node:assert/strict"
import { nameInitials } from "./initials.ts"

test("two words: first letter of the first word plus first letter of the last", () => {
  assert.equal(nameInitials("Pablo Rivera"), "PR")
  assert.equal(nameInitials("Manuel Sierra"), "MS")
})

test("a single word falls back to its own first two letters", () => {
  assert.equal(nameInitials("Ale"), "AL")
  assert.equal(nameInitials("A"), "A")
})

test("three or more words still use only the first and the last, never a middle one", () => {
  assert.equal(nameInitials("Juan Carlos Pérez"), "JP")
})

test("extra/leading/trailing whitespace is ignored", () => {
  assert.equal(nameInitials("  Pablo   Rivera  "), "PR")
})

test("empty or whitespace-only input yields nothing", () => {
  assert.equal(nameInitials(""), "")
  assert.equal(nameInitials("   "), "")
})

test("always uppercase regardless of input case", () => {
  assert.equal(nameInitials("pablo rivera"), "PR")
})
