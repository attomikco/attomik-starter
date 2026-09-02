import { test } from "node:test"
import assert from "node:assert/strict"
import { geometryToRow, rowToGeometry, rowToSkinInput, skinInputToRow, type WorkspaceBrandRow } from "./persistence.ts"
import { skins } from "./skins.ts"
import { themedDeclarations } from "./css.ts"

const baseRow: WorkspaceBrandRow = {
  display_name: "Attomik Starter",
  radius_large: 22,
  radius_medium: 16,
  radius_small: 11,
  logo_light_path: null,
  logo_dark_path: null,
  favicon_path: null,
  accent_hue: 250,
  accent_chroma: 0.16,
  neutral_hue: 250,
  neutral_chroma: 0.006,
  semantic_chroma: 0.15,
  font_family: "Instrument Sans",
  mono_font_family: "IBM Plex Mono",
  weight_bold: 700,
  weight_semibold: 600,
  accent_lightness: null,
  accent_lightness_dark: null,
  accent_ink_lightness: null,
  default_appearance: "light",
  default_locale: "en",
  time_zone: "UTC",
  default_member_role: "member",
}

test("workspace_settings row maps to the canonical base SkinInput", () => {
  assert.deepEqual(rowToSkinInput(baseRow), skins.base)
})

test("SkinInput round-trips through the row mapping", () => {
  for (const skin of Object.values(skins)) {
    const row = { ...baseRow, ...skinInputToRow(skin) }
    assert.deepEqual(rowToSkinInput(row), skin)
  }
})

test("optional bright-fill fields survive as nulls, not zeros", () => {
  const row = skinInputToRow(skins.base)
  assert.equal(row.accent_lightness, null)
  assert.equal(row.accent_ink_lightness, null)
  const electric = skinInputToRow(skins.electric)
  assert.equal(electric.accent_lightness, 0.86)
  assert.equal(electric.accent_ink_lightness, 0.16)
})

test("numeric strings from postgres coerce to numbers", () => {
  const row = { ...baseRow, accent_hue: "250" as unknown as number, accent_chroma: "0.16" as unknown as number }
  const skin = rowToSkinInput(row)
  assert.equal(skin.ah, 250)
  assert.equal(skin.ac, 0.16)
})

test("themedDeclarations honors the workspace default appearance", () => {
  const light = themedDeclarations("light", "L", "D")
  assert.match(light, /:root:not\(\[data-theme="dark"\]\) \{ L \}/)
  assert.ok(!light.includes("prefers-color-scheme"), "light default ignores OS preference")

  const dark = themedDeclarations("dark", "L", "D")
  assert.match(dark, /:root:not\(\[data-theme="light"\]\) \{ D \}/)
  assert.match(dark, /:root\[data-theme="light"\] \{ L \}/)

  const system = themedDeclarations("system", "L", "D")
  assert.match(system, /prefers-color-scheme: dark/)
})

test("geometry maps radius_large/medium/small to r/r2/r3 with reference defaults", () => {
  assert.deepEqual(rowToGeometry(baseRow), { r: 22, r2: 16, r3: 11 })
  assert.deepEqual(geometryToRow({ r: 30, r2: 8, r3: 0 }), { radius_large: 30, radius_medium: 8, radius_small: 0 })
  assert.deepEqual(rowToGeometry({ ...baseRow, ...geometryToRow({ r: 5, r2: 6, r3: 7 }) }), { r: 5, r2: 6, r3: 7 })
})
