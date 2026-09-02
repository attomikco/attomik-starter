import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveSkin, clampSkinInput } from "./derive.ts"
import { skins } from "./skins.ts"
import { contrastRatio } from "./color.ts"
import { seedsToSkinInput } from "./seeds.ts"
import type { SkinInput } from "./types.ts"

const REQUIRED_VARS = [
  "--bg", "--shell", "--card", "--line", "--line-2",
  "--txt", "--txt-2", "--txt-3", "--txt-4",
  "--accent", "--accent-ink", "--accent-text", "--accent-tint",
  "--lead", "--lead-line",
  "--s1", "--s2", "--s3", "--s4", "--s5",
  "--ok", "--ok-fill", "--ok-tint",
  "--warn", "--warn-fill", "--warn-tint",
  "--bad", "--bad-fill", "--bad-tint",
  "--hero", "--hero-hair", "--hero-strong", "--hero-txt", "--hero-fill", "--hero-mute", "--hero-accent",
  "--font", "--mono", "--w-bold", "--w-semi",
  "--r", "--r2", "--r3",
]

test("same input always produces same output", () => {
  assert.deepEqual(resolveSkin(skins.base, "light"), resolveSkin(skins.base, "light"))
  assert.deepEqual(resolveSkin(skins.electric, "dark"), resolveSkin(skins.electric, "dark"))
})

test("base preset resolves the reference values", () => {
  const light = resolveSkin(skins.base, "light")
  // Expected strings reproduce the reference ok3(): raw lightness, chroma toFixed(3)
  assert.equal(light["--bg"], "oklch(0.918 0.006 250)")
  assert.equal(light["--txt"], "oklch(0.17 0.010 250)")
  assert.equal(light["--accent"], "oklch(0.52 0.160 250)")
  assert.equal(light["--accent-text"], "oklch(0.44 0.150 250)")
  assert.equal(light["--accent-tint"], "oklch(0.44 0.150 250 / .10)")
  assert.equal(light["--s1"], "oklch(0.34 0.130 250)")
  assert.equal(light["--s5"], "oklch(0.82 0.061 250)")
  assert.equal(light["--font"], "'Instrument Sans', system-ui, sans-serif")
  assert.equal(light["--w-bold"], "700")
  assert.equal(light["--r"], "22px")

  const dark = resolveSkin(skins.base, "dark")
  assert.equal(dark["--bg"], "oklch(0.155 0.007 250)")
  assert.equal(dark["--txt"], "oklch(0.96 0.002 250)")
  // No al/alDark on base: default fill lightness .52 light / .66 dark
  assert.equal(dark["--accent"], "oklch(0.66 0.160 250)")
})

test("electric preset uses bright-fill lightness and stated ink", () => {
  const light = resolveSkin(skins.electric, "light")
  assert.equal(light["--accent"], "oklch(0.86 0.210 160)")
  assert.equal(light["--accent-ink"], "oklch(0.16 0.004 160)")

  const dark = resolveSkin(skins.electric, "dark")
  assert.equal(dark["--accent"], "oklch(0.88 0.210 160)")
  assert.equal(dark["--accent-ink"], "oklch(0.16 0.004 160)")
})

test("a dark-fill seeded skin keeps WCAG contrast on the pairs the seeds can break", () => {
  const seeded = seedsToSkinInput({ accent: "#14532D", neutral: "#6B7280" }, skins.base)
  const opaque = (t: string) => t.replace(/ \/ [.\d]+\)$/, ")")
  const light = resolveSkin(seeded, "light")
  const dark = resolveSkin(seeded, "dark")
  // The light fill IS the seed's lightness; the dark fill lifts to the engine default
  assert.match(light["--accent"], /^oklch\(0\.3\d /)
  assert.match(dark["--accent"], /^oklch\(0\.66 /)
  // Semantic hues untouched by the accent
  assert.match(light["--ok"], / 147\)$/)
  assert.match(light["--bad"], / 25\)$/)
  for (const mode of ["light", "dark"] as const) {
    const t = resolveSkin(seeded, mode)
    assert.ok(contrastRatio(t["--accent-ink"], t["--accent"]) >= 4.5, `${mode}: ink on accent`)
    assert.ok(contrastRatio(t["--accent-text"], t["--card"]) >= 4.5, `${mode}: accent text on card`)
    assert.ok(contrastRatio(t["--accent-text"], t["--bg"]) >= 4.5, `${mode}: accent text on bg`)
    assert.ok(contrastRatio(t["--txt"], t["--bg"]) >= 7, `${mode}: body text`)
    for (const v of ["--ok", "--warn", "--bad"]) {
      assert.ok(contrastRatio(t[v], t["--card"]) >= 3.3, `${mode}: ${v} on card`)
    }
    assert.ok(contrastRatio(t["--bad"], t["--card"]) >= 4.5, `${mode}: red text on card`)
  }
  // Semantic fills sit on cards, never on the accent; the only status the
  // reference places against a fill is amber, which must stay readable
  assert.ok(contrastRatio(opaque(light["--warn-fill"]), light["--accent"]) >= 3, "amber fill on the dark accent")
})

test("semantic hues stay fixed regardless of brand accent", () => {
  const violet: SkinInput = { ...skins.base, ah: 300, nh: 300 }
  for (const mode of ["light", "dark"] as const) {
    const t = resolveSkin(violet, mode)
    assert.match(t["--ok"], / 147\)$/)
    assert.match(t["--bad"], / 25\)$/)
    // Amber text hue: 78 light, 88 dark — exactly as the reference
    assert.match(t["--warn"], mode === "light" ? / 78\)$/ : / 88\)$/)
    // Accent follows the brand
    assert.match(t["--accent"], / 300\)$/)
  }
})

test("light and dark are distinct peer palettes", () => {
  const light = resolveSkin(skins.base, "light")
  const dark = resolveSkin(skins.base, "dark")
  for (const v of ["--bg", "--shell", "--card", "--txt", "--lead", "--ok", "--s1"]) {
    assert.notEqual(light[v], dark[v], `${v} must differ between themes`)
  }
  // Dark is a peer, not an inversion: its bg is not light's txt
  assert.notEqual(dark["--bg"], light["--txt"])
})

test("all required CSS variables are always present and non-empty", () => {
  for (const preset of Object.values(skins)) {
    for (const mode of ["light", "dark"] as const) {
      const t = resolveSkin(preset, mode)
      for (const v of REQUIRED_VARS) {
        assert.ok(typeof t[v] === "string" && t[v].length > 0, `${v} missing in ${mode}`)
      }
      assert.equal(Object.keys(t).length, REQUIRED_VARS.length)
    }
  }
})

test("out-of-range input is clamped to the documented brand ranges", () => {
  const wild = clampSkinInput({ ...skins.base, ac: 5, nc: -1, sc: 0, ah: 999, wb: 1200 })
  assert.equal(wild.ac, 0.28)
  assert.equal(wild.nc, 0)
  assert.equal(wild.sc, 0.06)
  assert.equal(wild.ah, 360)
  assert.equal(wild.wb, 900)
  // Valid input passes through untouched
  assert.deepEqual(clampSkinInput(skins.electric), skins.electric)
})
