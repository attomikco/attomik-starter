import { test } from "node:test"
import assert from "node:assert/strict"
import { en } from "./en.ts"
import { esMX } from "./es-MX.ts"
import { LOCALES, isLocale } from "./locales.ts"
import { copy, locale, resolveCopy } from "./index.ts"

/** Every key present in en with the same type — no silent English fallback. */
function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}:fn`]
  if (value && typeof value === "object") {
    return Object.keys(value as object)
      .sort()
      .flatMap((k) => shape((value as Record<string, unknown>)[k], path ? `${path}.${k}` : k))
  }
  return [`${path}:${typeof value}`]
}

test("es-MX mirrors the English dictionary key for key", () => {
  assert.deepEqual(shape(esMX), shape(en))
})

test("every registered locale resolves and declares its own lang tag", () => {
  for (const l of LOCALES) {
    assert.equal(resolveCopy(l).lang, l)
    assert.equal(isLocale(l), true)
  }
  assert.equal(isLocale("fr"), false)
})

test("the active copy follows the project config", () => {
  assert.equal(copy, resolveCopy(locale))
})

test("interpolated strings keep their own word order and plurals", () => {
  assert.equal(en.data.selected(1, "record"), "1 record selected")
  assert.equal(en.data.selected(3, "record"), "3 records selected")
  assert.equal(esMX.data.selected(1, "registro"), "1 registro seleccionado")
  assert.equal(esMX.data.selected(3, "registro"), "3 registros seleccionados")
  assert.equal(esMX.data.selected(2, "proveedor"), "2 proveedores seleccionados")
  assert.equal(en.shortcuts.goThen("O"), "G then O")
  assert.equal(esMX.shortcuts.goThen("O"), "G y luego O")
  assert.equal(esMX.audit.settingsUpdated("ana", 1), "ana actualizó la configuración del espacio de trabajo (1 campo)")
})
