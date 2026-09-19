import { test } from "node:test"
import assert from "node:assert/strict"
import { findMissingMigrations } from "./check-migrations-pushed.ts"

test("findMissingMigrations: every local migration already applied returns nothing", () => {
  const rows = [{ local: "20260101000000", remote: "20260101000000" }, { local: "20260102000000", remote: "20260102000000" }]
  assert.deepEqual(findMissingMigrations(rows), [])
})

test("findMissingMigrations: a local-only row (no remote) is reported", () => {
  const rows = [{ local: "20260101000000", remote: "20260101000000" }, { local: "20260102000000", remote: undefined }]
  assert.deepEqual(findMissingMigrations(rows), ["20260102000000"])
})

test("findMissingMigrations: multiple missing rows are reported in the given order", () => {
  const rows = [{ local: "20260101000000" }, { local: "20260102000000", remote: "20260102000000" }, { local: "20260103000000" }]
  assert.deepEqual(findMissingMigrations(rows), ["20260101000000", "20260103000000"])
})

test("findMissingMigrations: an empty remote string counts as missing too, not just absent", () => {
  const rows = [{ local: "20260101000000", remote: "" }]
  assert.deepEqual(findMissingMigrations(rows), ["20260101000000"])
})

test("findMissingMigrations: a remote-only row (should not happen in practice) is never reported — only local rows matter", () => {
  const rows = [{ remote: "20260101000000" }]
  assert.deepEqual(findMissingMigrations(rows), [])
})

test("findMissingMigrations: an empty list returns nothing", () => {
  assert.deepEqual(findMissingMigrations([]), [])
})
