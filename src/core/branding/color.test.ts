import { test } from "node:test"
import assert from "node:assert/strict"
import { contrastRatio, hexToOklch, normalizeHex } from "./color.ts"
import { oklchToHex } from "./email.ts"
import { brandContrastIssues, seedsToSkinInput, skinToSeeds } from "./seeds.ts"
import { skins } from "./skins.ts"

const near = (a: number, b: number, tol: number, what: string) =>
  assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} not within ${tol} of ${b}`)

test("normalizeHex accepts 3- and 6-digit forms, with or without #", () => {
  assert.equal(normalizeHex("#2F4FD0"), "#2f4fd0")
  assert.equal(normalizeHex("2f4fd0"), "#2f4fd0")
  assert.equal(normalizeHex(" #ABC "), "#aabbcc")
  assert.equal(normalizeHex("#12345"), null)
  assert.equal(normalizeHex("navy"), null)
  assert.equal(normalizeHex(""), null)
})

test("hexToOklch matches the reference OKLCH values", () => {
  // sRGB red per Ottosson's reference: L .628, C .258, H 29.2
  const red = hexToOklch("#FF0000")
  near(red.l, 0.628, 0.003, "red L")
  near(red.c, 0.2577, 0.003, "red C")
  near(red.h, 29.23, 0.5, "red H")
  // A cool mid grey: low chroma, hue on the blue side
  const grey = hexToOklch("#6B7280")
  near(grey.l, 0.55, 0.03, "grey L")
  assert.ok(grey.c > 0.01 && grey.c < 0.03, "grey chroma is a tint, not a colour")
  assert.ok(grey.h > 240 && grey.h < 290, "grey leans cool")
  assert.equal(hexToOklch("#808080").h, 0, "true grey reports no hue")
})

test("hex → oklch → hex round-trips within a byte", () => {
  for (const hex of ["#2f4fd0", "#6b7280", "#14532d", "#f3f4f6", "#ff0000", "#000000", "#ffffff"]) {
    const o = hexToOklch(hex)
    const back = oklchToHex(o.l, o.c, o.h)
    const diff = [1, 3, 5].map((i) => Math.abs(parseInt(hex.slice(i, i + 2), 16) - parseInt(back.slice(i, i + 2), 16)))
    assert.ok(Math.max(...diff) <= 1, `${hex} → ${back}`)
  }
})

test("contrastRatio matches the WCAG reference points", () => {
  near(contrastRatio("#000000", "#ffffff"), 21, 0.01, "black/white")
  near(contrastRatio("#ffffff", "#000000"), 21, 0.01, "symmetric")
  near(contrastRatio("#777777", "#ffffff"), 4.48, 0.02, "the classic #777")
  // Accepts the engine's oklch() strings too
  near(contrastRatio("oklch(0.52 0.160 250)", "#ffffff"), contrastRatio(oklchToHex(0.52, 0.16, 250), "#ffffff"), 0.01, "oklch input")
})

test("seedsToSkinInput keeps a dark accent as a dark fill with near-white ink", () => {
  const out = seedsToSkinInput({ accent: "#14532D", neutral: "#6B7280" }, skins.base)
  const accent = hexToOklch("#14532D")
  assert.equal(out.ah, Math.round(accent.h))
  near(out.ac, accent.c, 0.002, "ac")
  assert.ok((out.al ?? 1) < 0.5, "dark fill keeps its own lightness")
  assert.equal(out.alDark, undefined, "dark accents keep the engine default fill on dark")
  assert.equal(out.ink, undefined, "near-white ink on a dark fill")
  assert.equal(out.nh, Math.round(hexToOklch("#6B7280").h))
  assert.ok((out.nc ?? 0) > 0 && (out.nc ?? 0) <= 0.02)
  // Untouched by seeds
  assert.equal(out.font, skins.base.font)
  assert.equal(out.sc, skins.base.sc)
})

test("seedsToSkinInput states dark ink and dark-theme fill for a bright accent", () => {
  const out = seedsToSkinInput({ accent: "#3DFF9A", neutral: "#777777" }, skins.base)
  assert.ok((out.al ?? 0) > 0.66, "bright fill keeps its lightness")
  assert.equal(out.alDark, out.al)
  assert.equal(out.ink, 0.16)
  assert.equal(out.nh, 0)
  assert.equal(out.nc, 0)
  assert.throws(() => seedsToSkinInput({ accent: "blue", neutral: "#777" }, skins.base))
})

test("skinToSeeds round-trips through seedsToSkinInput", () => {
  for (const preset of [skins.base, skins.green, skins.electric]) {
    const back = seedsToSkinInput(skinToSeeds(preset), preset)
    near(back.ah, preset.ah, 2, "ah")
    near(back.ac, preset.ac, 0.01, "ac")
    near(back.nh, preset.nh, 6, "nh")
    near(back.nc, preset.nc, 0.002, "nc")
  }
})

test("contrast issues: base and electric pass; green's sage fill is known-short; a flip-point fill fails", () => {
  for (const id of ["base", "electric"] as const) {
    assert.deepEqual(brandContrastIssues(skins[id]), [], `${id} should pass`)
  }
  // The reference's green preset ships a sage fill under near-white ink at
  // ~4.0:1 in light — the warning is right to surface it, not hide it.
  const green = brandContrastIssues(skins.green)
  assert.deepEqual(green.map((i) => `${i.mode}:${i.pair}`), ["light:inkOnAccent"])
  assert.ok(green[0].ratio >= 3.9 && green[0].ratio < 4.5)
  // A fill parked right at the ink flip (L .62, near-white ink) is the
  // classic failure: legible-looking, under 4.5:1 for button text.
  const issues = brandContrastIssues({ ...skins.base, al: 0.62 })
  assert.ok(issues.length > 0)
  assert.ok(issues.every((i) => i.ratio < i.minimum))
})
