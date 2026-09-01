import { test } from "node:test"
import assert from "node:assert/strict"
import { devToolsEnabled } from "./dev-gate.ts"

test("dev tooling is blocked only in production builds", () => {
  assert.equal(devToolsEnabled("production"), false)
  assert.equal(devToolsEnabled("development"), true)
  assert.equal(devToolsEnabled("test"), true)
  assert.equal(devToolsEnabled(undefined), true)
})
