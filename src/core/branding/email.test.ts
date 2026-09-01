import { test } from "node:test"
import assert from "node:assert/strict"
import { cssColorToHex, emailBrand, oklchToHex } from "./email.ts"
import { defaultSkin, skins } from "./skins.ts"

test("oklch extremes convert to pure white and black", () => {
  assert.equal(oklchToHex(1, 0, 0), "#ffffff")
  assert.equal(oklchToHex(0, 0, 0), "#000000")
})

test("the base accent converts to a plausible blue", () => {
  // oklch(0.52 0.16 250): blue channel must dominate, red stay low.
  const hex = oklchToHex(0.52, 0.16, 250)
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  assert.ok(b > g && g > r, `expected blue-dominant, got ${hex}`)
})

test("cssColorToHex passes hex through and expands shorthand", () => {
  assert.equal(cssColorToHex("#2f4fd0"), "#2f4fd0")
  assert.equal(cssColorToHex("#fff"), "#ffffff")
  assert.equal(cssColorToHex(" oklch(1 0 0) "), "#ffffff")
  assert.throws(() => cssColorToHex("var(--accent)"))
})

test("every shipped skin yields a legible email accent pair", () => {
  for (const skin of [defaultSkin, ...Object.values(skins)]) {
    const { accent, accentInk } = emailBrand(skin)
    assert.match(accent, /^#[0-9a-f]{6}$/)
    assert.match(accentInk, /^#[0-9a-f]{6}$/)
    assert.notEqual(accent, accentInk)
  }
})
