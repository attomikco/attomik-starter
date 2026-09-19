import { test } from "node:test"
import assert from "node:assert/strict"
import { LOCALES } from "../i18n/locales.ts"
import { feedbackResolvedEmail, type FeedbackResolvedEmailInput } from "./resolution-email.ts"

const base = (over: Partial<FeedbackResolvedEmailInput> = {}): FeedbackResolvedEmailInput => ({
  workspaceName: "Acme Ops",
  message: "The save button does nothing.\nI have to press it twice.",
  submittedBy: "Ana García (ana@example.com)",
  submittedAt: "2 Sep 2026, 14:05",
  resolvedBy: "Luis Ortega (luis@example.com)",
  note: "Fixed in today's release.",
  feedbackUrl: "https://app.example.com/settings/feedback",
  locale: "es-MX",
  ...over,
})

test("es-MX subject is 'Feedback resuelto: ' + the first 60 characters", () => {
  const long = "x".repeat(90)
  const { subject } = feedbackResolvedEmail(base({ message: long }))
  assert.equal(subject, `Feedback resuelto: ${"x".repeat(60)}`)
})

test("the body carries the original text, who filed it and when, who resolved it, the note, and the link", () => {
  for (const locale of LOCALES) {
    const out = feedbackResolvedEmail(base({ locale }))
    for (const part of ["The save button does nothing.", "I have to press it twice.", "Ana García (ana@example.com)", "2 Sep 2026, 14:05", "Luis Ortega (luis@example.com)", "Fixed in today's release.", "https://app.example.com/settings/feedback"]) {
      assert.ok(out.text.includes(part), `${locale}: text part is missing "${part}"`)
    }
    assert.ok(out.html.includes("https://app.example.com/settings/feedback"), `${locale}: link missing from the HTML`)
  }
})

test("the note section disappears when there is no note", () => {
  const withNote = feedbackResolvedEmail(base())
  const without = feedbackResolvedEmail(base({ note: null }))
  assert.ok(withNote.text.includes("Nota de resolución"))
  assert.equal(without.text.includes("Nota de resolución"), false)
})

test("user-authored text is escaped, and line breaks survive in both parts", () => {
  const out = feedbackResolvedEmail(base({ message: "<script>alert(1)</script>\nsecond line", note: "<b>x</b>" }))
  assert.equal(out.html.includes("<script>"), false)
  assert.ok(out.html.includes("&lt;script&gt;"))
  assert.equal(out.html.includes("<b>x</b>"), false)
  assert.ok(out.html.includes("<br>"))
  assert.ok(out.text.includes("<script>alert(1)</script>\nsecond line"))
})

test("a message full of whitespace still yields a one-line subject", () => {
  const { subject } = feedbackResolvedEmail(base({ message: "first\n\nsecond\tthird" }))
  assert.equal(subject, "Feedback resuelto: first second third")
})
