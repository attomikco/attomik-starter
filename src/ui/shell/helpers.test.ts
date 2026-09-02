import { test } from "node:test"
import assert from "node:assert/strict"
import { buildGoMap, filterPaletteGroups, isNavActive, isTypingTarget } from "./helpers.ts"
import { buildNavigation } from "../../core/navigation/build.ts"
import type { ModuleDefinition } from "../../core/modules/registry"

test("active route calculation", () => {
  assert.equal(isNavActive("/", "/"), true)
  assert.equal(isNavActive("/media", "/"), false)
  assert.equal(isNavActive("/media", "/media"), true)
  assert.equal(isNavActive("/media/uploads", "/media"), true)
  assert.equal(isNavActive("/mediafoo", "/media"), false)
  assert.equal(isNavActive("/customers", "/media"), false)
})

test("keyboard shortcuts suppressed inside text fields", () => {
  assert.equal(isTypingTarget("INPUT", false), true)
  assert.equal(isTypingTarget("input", false), true)
  assert.equal(isTypingTarget("TEXTAREA", false), true)
  assert.equal(isTypingTarget("SELECT", false), true)
  assert.equal(isTypingTarget("DIV", true), true)
  assert.equal(isTypingTarget("DIV", false), false)
  assert.equal(isTypingTarget("A", false), false)
})

test("command palette filtering", () => {
  const groups = [
    { label: "Go to", items: [{ label: "Overview", run: () => {} }, { label: "Media", run: () => {} }] },
    { label: "Actions", items: [{ label: "Collapse the sidebar", run: () => {} }] },
  ]
  assert.equal(filterPaletteGroups(groups, "").length, 2)
  const media = filterPaletteGroups(groups, "med")
  assert.equal(media.length, 1)
  assert.equal(media[0].items[0].label, "Media")
  const upper = filterPaletteGroups(groups, "COLLAPSE")
  assert.equal(upper[0].items[0].label, "Collapse the sidebar")
  assert.equal(filterPaletteGroups(groups, "zzz").length, 0)
})

const mod = (id: string, group: "operate" | "configure" | "settings", order: number, nav = true): ModuleDefinition =>
  ({
    id: id as ModuleDefinition["id"],
    ...(nav ? { navigation: { group, href: `/${id}`, order, icon: id } } : {}),
  }) as ModuleDefinition

/** On-screen names come from the dictionary, not the registry; the fixture supplies English ones. */
const NAMES = { media: { label: "Media", description: "" }, overview: { label: "Overview", description: "" }, analytics: { label: "Analytics", description: "" } }

test("navigation derives from enabled modules only, sorted by order", () => {
  const nav = buildNavigation([mod("media", "configure", 10), mod("overview", "operate", 0), mod("analytics", "operate", 5)], NAMES)
  assert.deepEqual(nav.map((g) => g.group), ["operate", "configure"])
  assert.deepEqual(nav[0].items.map((i) => i.moduleId), ["overview", "analytics"])
  assert.deepEqual(nav[1].items.map((i) => i.moduleId), ["media"])
})

test("empty nav groups are removed; nav-less modules are skipped", () => {
  const nav = buildNavigation([mod("overview", "operate", 0), mod("hidden", "settings", 0, false)], NAMES)
  assert.equal(nav.length, 1)
  assert.equal(nav[0].group, "operate")
})

test("G-jump map contains only enabled reference destinations", () => {
  const map = buildGoMap([
    { moduleId: "overview", href: "/", label: "Overview" },
    { moduleId: "media", href: "/media", label: "Media" },
  ])
  assert.deepEqual(Object.keys(map), ["o"])
  assert.equal(map.o.href, "/")
  const fuller = buildGoMap([
    { moduleId: "overview", href: "/", label: "Overview" },
    { moduleId: "messages", href: "/messages", label: "Messages" },
  ])
  assert.deepEqual(Object.keys(fuller).sort(), ["m", "o"])
})
