import { test } from "node:test"
import assert from "node:assert/strict"
import { effectivePreference, resolveTheme } from "./theme-resolve.ts"

test("the six-combination matrix (no local override)", () => {
  // preference, systemPrefersDark → resolved
  assert.equal(resolveTheme("system", "light", false), "light")
  assert.equal(resolveTheme("system", "light", true), "light")
  assert.equal(resolveTheme("system", "dark", false), "dark")
  assert.equal(resolveTheme("system", "dark", true), "dark")
  assert.equal(resolveTheme("system", "system", false), "light")
  assert.equal(resolveTheme("system", "system", true), "dark")
})

test("system never falls back to light when the OS is dark", () => {
  assert.equal(resolveTheme("system", "system", true), "dark")
})

test("explicit local toggle beats the workspace default", () => {
  assert.equal(resolveTheme("light", "dark", true), "light")
  assert.equal(resolveTheme("dark", "light", false), "dark")
  assert.equal(resolveTheme("light", "system", true), "light")
})

test("OS change flips only system-governed states", () => {
  // Auto/Auto: follows the OS both ways without touching the preference
  assert.equal(resolveTheme("system", "system", false), "light")
  assert.equal(resolveTheme("system", "system", true), "dark")
  // explicit prefs are immune to the OS
  assert.equal(resolveTheme("dark", "system", false), "dark")
})

test("effective preference chain", () => {
  assert.equal(effectivePreference("system", "dark"), "dark")
  assert.equal(effectivePreference("system", "system"), "system")
  assert.equal(effectivePreference("light", "dark"), "light")
})
