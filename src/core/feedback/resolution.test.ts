import { test } from "node:test"
import assert from "node:assert/strict"
import { RESOLUTION_NOTE_MAX, feedbackSnippet, normalizeNote, personLabel, resolveRecipients } from "./resolution.ts"

test("the subject snippet is the first 60 characters, on one line", () => {
  assert.equal(feedbackSnippet("a".repeat(100)), "a".repeat(60))
  assert.equal(feedbackSnippet("short note"), "short note")
  assert.equal(feedbackSnippet("  line one\n\nline   two\t end  "), "line one line two end")
})

test("the snippet counts code points, so an emoji is never split", () => {
  const out = feedbackSnippet("😀".repeat(80))
  assert.equal(Array.from(out).length, 60)
  assert.equal(out, "😀".repeat(60))
})

test("the snippet never ends on the whitespace it collapsed", () => {
  assert.equal(feedbackSnippet(`${"a".repeat(59)} ${"b".repeat(20)}`), "a".repeat(59))
})

test("a blank note is stored as null, a real one is trimmed", () => {
  assert.equal(normalizeNote(""), null)
  assert.equal(normalizeNote("   \n "), null)
  assert.equal(normalizeNote(null), null)
  assert.equal(normalizeNote(undefined), null)
  assert.equal(normalizeNote("  fixed in v2 "), "fixed in v2")
})

test("the note limit mirrors the database check", () => {
  assert.equal(RESOLUTION_NOTE_MAX, 2000)
})

const members = [
  { userId: "u1", email: "ana@example.com", displayName: "Ana" },
  { userId: "u2", email: "luis@example.com", displayName: null },
  { userId: "u3", email: "", displayName: "No Email" },
]

test("recipients are the selected CURRENT members with an email", () => {
  const out = resolveRecipients(members, ["u2", "u1", "u3", "ghost"])
  assert.deepEqual(out.map((m) => m.userId), ["u1", "u2"])
})

test("a repeated or forged id never doubles or invents a recipient", () => {
  assert.deepEqual(resolveRecipients(members, ["u1", "u1", "u1"]).map((m) => m.userId), ["u1"])
  assert.deepEqual(resolveRecipients(members, ["ghost"]), [])
  assert.deepEqual(resolveRecipients(members, []), [])
})

test("a person reads as name (email), or just the email without a name", () => {
  assert.equal(personLabel({ displayName: "Ana García", email: "ana@example.com" }), "Ana García (ana@example.com)")
  assert.equal(personLabel({ displayName: "  ", email: "ana@example.com" }), "ana@example.com")
  assert.equal(personLabel({ displayName: null, email: "ana@example.com" }), "ana@example.com")
})

test("a person with no email still reads as their name, and with neither reads as empty", () => {
  assert.equal(personLabel({ displayName: "Ana", email: "" }), "Ana")
  assert.equal(personLabel({ displayName: null, email: "" }), "")
})
