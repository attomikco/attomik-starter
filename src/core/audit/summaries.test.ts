import { test } from "node:test"
import assert from "node:assert/strict"
import { en } from "../i18n/en.ts"
import { esMX } from "../i18n/es-MX.ts"
import { eventTone, eventVerb, isValidActionName, summarizeEvent } from "./summaries.ts"

const e = (action: string, resourceLabel: string | null = null, before: Record<string, unknown> | null = null, after: Record<string, unknown> | null = null) =>
  ({ action, resourceLabel, before, after })

test("summaries render human prose, not event names", () => {
  assert.equal(
    summarizeEvent(e("workspace.member.role_changed", "ana@x.co", { role: "viewer" }, { role: "member" }), "pablo@attomik.co", en.audit),
    "pablo@attomik.co changed ana@x.co’s role from viewer to member",
  )
  assert.equal(
    summarizeEvent(e("workspace.invitation.created", "sam@x.co", null, { role: "admin" }), "pablo@attomik.co", en.audit),
    "pablo@attomik.co invited sam@x.co as admin",
  )
  assert.equal(
    summarizeEvent(e("workspace.member.added", "sam@x.co", null, { role: "member" }), "sam@x.co", en.audit),
    "sam@x.co joined as member",
  )
  assert.equal(
    summarizeEvent(e("workspace.settings.updated", "Attomik Starter", { accent_hue: 250 }, { accent_hue: 300 }), "pablo@attomik.co", en.audit),
    "pablo@attomik.co updated workspace settings (1 field)",
  )
  assert.equal(
    summarizeEvent(e("workspace.invitation.accepted", "sam@x.co"), "sam@x.co", en.audit),
    "sam@x.co accepted their invitation",
  )
})

test("unknown module actions degrade to readable words in English", () => {
  assert.equal(
    summarizeEvent(e("media.file.uploaded", "logo.svg"), "pablo@attomik.co", en.audit),
    "pablo@attomik.co — media file uploaded — logo.svg",
  )
})

test("es-MX renders the known events in Spanish and shows unknown actions as identifiers", () => {
  assert.equal(
    summarizeEvent(e("workspace.member.role_changed", "ana@x.co", { role: "viewer" }, { role: "member" }), "pablo@attomik.co", esMX.audit),
    "pablo@attomik.co cambió el rol de ana@x.co de viewer a member",
  )
  assert.equal(
    summarizeEvent(e("workspace.member.added", "sam@x.co", null, { role: "member" }), "sam@x.co", esMX.audit),
    "sam@x.co se unió como member",
  )
  // English identifier words must not be passed off as Spanish prose
  assert.equal(
    summarizeEvent(e("media.file.uploaded", "logo.svg"), "pablo@attomik.co", esMX.audit),
    "pablo@attomik.co · media.file.uploaded · logo.svg",
  )
})

test("tones follow the verb, red means destructive", () => {
  assert.equal(eventTone("workspace.member.removed"), "bad")
  assert.equal(eventTone("workspace.invitation.revoked"), "bad")
  assert.equal(eventTone("workspace.invitation.created"), "ok")
  assert.equal(eventTone("workspace.invitation.accepted"), "ok")
  assert.equal(eventTone("workspace.settings.updated"), "neutral")
  assert.equal(eventTone("workspace.invitation.resent"), "warn")
  assert.equal(eventVerb("workspace.member.role_changed"), "role changed")
})

test("action naming convention validation matches the database rule", () => {
  assert.equal(isValidActionName("workspace.member.added"), true)
  assert.equal(isValidActionName("media.exported"), true)
  assert.equal(isValidActionName("single"), false)
  assert.equal(isValidActionName("Bad.Case"), false)
  assert.equal(isValidActionName("has space.x"), false)
})
