import { test } from "node:test"
import assert from "node:assert/strict"
import { createTranslator, defineCopy, interpolate, resetMissingKeyWarnings } from "./t.ts"
import { createFormatters, isTimeZone, listTimeZones, utcOffsetLabel, TIME_ZONE_CHOICES } from "./format.ts"
import { settingsCopy } from "../../modules/settings/copy.ts"

const DICTS = {
  en: { "x.hello": "Hello {name}", "x.items.one": "{n} thing", "x.items.other": "{n} things", "x.onlyEnglish": "fallback" },
  "es-MX": { "x.hello": "Hola {name}", "x.items.one": "{n} cosa", "x.items.other": "{n} cosas" },
}

test("translator interpolates, pluralizes, and falls back to English, then to the key", () => {
  const es = createTranslator(DICTS, "es-MX")
  assert.equal(es("x.hello", { name: "Sam" }), "Hola Sam")
  assert.equal(es.n("x.items", 1), "1 cosa")
  assert.equal(es.n("x.items", 3), "3 cosas")
  assert.equal(es("x.onlyEnglish"), "fallback")
  assert.equal(es("x.missing"), "x.missing")
  assert.equal(es.locale, "es-MX")

  const en = createTranslator(DICTS, "en")
  assert.equal(en("x.hello", { name: "Sam" }), "Hello Sam")
  assert.equal(en.n("x.items", 2), "2 things")
})

test("interpolation leaves unknown placeholders visible", () => {
  assert.equal(interpolate("Hi {name}, {n} left", { name: "A" }), "Hi A, {n} left")
  assert.equal(interpolate("plain"), "plain")
})

test("a missing key warns once outside production and never in production", () => {
  const env = process.env as Record<string, string | undefined>
  const original = env.NODE_ENV
  const calls: string[] = []
  const warn = console.warn
  console.warn = (msg: string) => { calls.push(String(msg)) }
  try {
    resetMissingKeyWarnings()
    env.NODE_ENV = "development"
    const t = createTranslator(DICTS, "en")
    t("x.nope"); t("x.nope")
    assert.deepEqual(calls, ["[i18n] missing copy key: x.nope"])

    resetMissingKeyWarnings()
    env.NODE_ENV = "production"
    calls.length = 0
    t("x.nope")
    assert.deepEqual(calls, [])
  } finally {
    console.warn = warn
    env.NODE_ENV = original
    resetMissingKeyWarnings()
  }
})

test("defineCopy binds one translator per locale and reuses it", () => {
  const copy = defineCopy(DICTS)
  assert.equal(copy.for("es-MX"), copy.for("es-MX"))
  assert.notEqual(copy.for("en"), copy.for("es-MX"))
  assert.equal(copy.for("es-MX")("x.hello", { name: "Sam" }), "Hola Sam")
})

test("settings module copy: every English key has an es-MX counterpart, and nothing extra", () => {
  const en = Object.keys(settingsCopy.dictionaries.en)
  const es = Object.keys(settingsCopy.dictionaries["es-MX"] ?? {})
  assert.ok(en.length > 100, "settings dictionary is empty")
  assert.deepEqual(es.filter((k) => !en.includes(k)), [], "es-MX keys without an English source")
  assert.deepEqual(en.filter((k) => !es.includes(k)), [], "English keys with no es-MX value")
  for (const k of en) {
    assert.ok(k.startsWith("settings."), `${k} is not under settings.`)
    assert.match(k, /^[a-z][a-zA-Z0-9.-]*$/, `${k} is not an English identifier`)
  }
  // Plural pairs stay paired in both locales
  for (const k of en.filter((k) => k.endsWith(".one"))) {
    const other = k.replace(/\.one$/, ".other")
    assert.ok(en.includes(other) && es.includes(other), `${k} needs ${other}`)
  }
})

test("formatters follow the locale for dates and numbers", () => {
  const en = createFormatters("en", "UTC")
  const es = createFormatters("es-MX", "UTC")
  const iso = "2026-09-02T14:05:00Z"
  assert.match(en.date(iso), /Sep 2, 2026|2 Sep 2026/)
  assert.match(es.date(iso), /sept?\.? 2026|sep 2026/i)
  assert.equal(en.time(iso), "14:05")
  assert.equal(es.time(iso), "14:05")
  assert.equal(en.number(1204), "1,204")
  assert.equal(es.number(1204.5, { maximumFractionDigits: 1 }), "1,204.5")
  assert.equal(en.daysBetween("2026-09-01T00:00:00Z", "2026-09-08T00:00:00Z"), 7)
  assert.equal(createFormatters("en", "UTC"), en, "cached per locale + zone")
})

test("time zone choices are valid IANA ids with readable offset labels", () => {
  for (const id of TIME_ZONE_CHOICES) assert.ok(isTimeZone(id), `${id} is not a zone Intl accepts`)
  assert.equal(utcOffsetLabel("UTC", new Date("2026-01-15T12:00:00Z")), "UTC")
  assert.equal(utcOffsetLabel("America/New_York", new Date("2026-01-15T12:00:00Z")), "UTC−5")
  assert.equal(utcOffsetLabel("America/New_York", new Date("2026-07-15T12:00:00Z")), "UTC−4")
  assert.equal(utcOffsetLabel("Europe/Madrid", new Date("2026-01-15T12:00:00Z")), "UTC+1")
  const rows = listTimeZones("Asia/Tokyo")
  assert.equal(rows[0].value, "Asia/Tokyo", "a zone set elsewhere still shows, first")
  assert.match(rows.find((r) => r.value === "America/Mexico_City")!.label, /^Mexico City · UTC−6$/)
  assert.equal(isTimeZone("Mars/Olympus"), false)
})
