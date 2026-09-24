import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { PLURAL_NOUNS } from "../../core/i18n/plural-nouns.ts"

/**
 * Static half of the UI audit (docs/UI_AUDIT.md), regex over source so it
 * needs no compiler API:
 *  1. no page-level centring or max-width in screen files — `margin: "0 auto"`,
 *     `marginInline: "auto"`, or a numeric `maxWidth` of 1000px or more —
 *     under src/app and src/modules (the auth layout's centred card is the
 *     one allowed place);
 *  2. no hard-coded plural built next to a count outside the pluralize
 *     helper: a `${…} <plural>` template, a `} <plural>` JSX text, or a
 *     `=== 1 ?` ternary picking a form. KNOWN_RAW_PLURALS lists files a
 *     project still has to migrate; it only ever shrinks (empty in the starter).
 */

const ROOT = resolve(import.meta.dirname, "../../..")

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full)
  }
  return out
}

const screenFiles = [...walk(resolve(ROOT, "src/app")), ...walk(resolve(ROOT, "src/modules"))]
const rel = (f: string) => relative(ROOT, f)

/** The signed-out surface is a centred card by design (its layout and pages). */
const centeringAllowed = (file: string) => file.startsWith("src/app/(auth)/")

test("no page-level centring or max-width in screen files", () => {
  const offenders: string[] = []
  for (const f of screenFiles) {
    if (centeringAllowed(rel(f))) continue
    const src = readFileSync(f, "utf8")
    src.split("\n").forEach((line, i) => {
      if (/margin:\s*"0 auto"|marginInline:\s*"auto"|mx-auto/.test(line)) offenders.push(`${rel(f)}:${i + 1} centred wrapper`)
      const m = line.match(/maxWidth:\s*(\d{4,})/)
      if (m) offenders.push(`${rel(f)}:${i + 1} maxWidth ${m[1]}`)
    })
  }
  assert.deepEqual(offenders, [])
})

/** Files that still build plurals by hand; remove a file as its module migrates onto pluralize/countOf. */
const KNOWN_RAW_PLURALS = new Set<string>([])

const nouns = PLURAL_NOUNS.join("|")
// A noun right after `}` is a count only when it is text, not a JSX prop (`members={members}`); a `=== 1 ?` ternary counts only when its two strings differ by a suffix (`"item" : "items"`).
const RAW_PLURAL = new RegExp(`(?:\\$\\{[^}]*\\}|\\})\\s+(?:${nouns})\\b(?!\\s*=)`, "u")
const PLURAL_TERNARY = /===\s*1\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/u
const isRawPlural = (line: string): boolean => {
  if (RAW_PLURAL.test(line)) return true
  const m = line.match(PLURAL_TERNARY)
  return !!m && (m[2].startsWith(m[1]) || m[1].startsWith(m[2]))
}

test("counts go through pluralize: no raw plural next to a count outside the helper", () => {
  const offenders: string[] = []
  const stillListed: string[] = []
  for (const f of screenFiles) {
    // Dictionaries hold "{n} días"-style VALUES with .one/.other pairs; the rule is about code building plurals.
    if (rel(f).startsWith("src/core/i18n/") || /(^|\/)copy\.ts$/.test(rel(f))) continue
    const src = readFileSync(f, "utf8")
    const hit = src.split("\n").findIndex(isRawPlural)
    if (hit >= 0) {
      if (KNOWN_RAW_PLURALS.has(rel(f))) stillListed.push(rel(f))
      else offenders.push(`${rel(f)}:${hit + 1}`)
    }
  }
  assert.deepEqual(offenders, [], "raw plural in a file not on the migration list")
  // A migrated file must leave the list, so the list only ever shrinks.
  const stale = [...KNOWN_RAW_PLURALS].filter((f) => !stillListed.includes(f))
  assert.deepEqual(stale, [], "files on KNOWN_RAW_PLURALS that no longer contain a raw plural — remove them from the list")
})
