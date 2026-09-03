import { test } from "node:test"
import assert from "node:assert/strict"
import { LOCALES } from "../i18n/locales.ts"
import { invitationEmail } from "../team/invitation-email.ts"
import { emailPalettes } from "./palette.ts"
import { emailTemplates, renderTemplate } from "./templates.ts"

const palettes = emailPalettes()
const ctxFor = (locale: (typeof LOCALES)[number]) => ({
  locale,
  brandName: "Attomik HQ",
  logoUrl: null,
  palettes,
})

test("every template renders in every locale with a subject and a preview line", () => {
  for (const locale of LOCALES) {
    for (const def of emailTemplates) {
      const out = renderTemplate(def, def.previewVars, ctxFor(locale))
      assert.ok(out.subject.length > 0, `${def.id}/${locale}: no subject`)
      assert.ok(out.preheader.length > 0, `${def.id}/${locale}: no preview line`)
      assert.match(out.html, /^<!doctype html>/)
      assert.match(out.html, new RegExp(`<html lang="${locale}"`))
    }
  }
})

test("reference rule 05: literal hex only — no custom properties, no oklch", () => {
  for (const def of emailTemplates) {
    const { html } = renderTemplate(def, def.previewVars, ctxFor("en"))
    assert.equal(html.includes("var(--"), false, `${def.id}: leaked a custom property`)
    assert.equal(html.includes("oklch("), false, `${def.id}: leaked an oklch() colour`)
  }
})

test("reference rule 03: every button ships the same URL as plain text", () => {
  for (const def of emailTemplates) {
    const out = renderTemplate(def, def.previewVars, ctxFor("en"))
    const built = def.build(def.previewVars, ctxFor("en"))
    for (const block of built.blocks) {
      if (block.type !== "button") continue
      assert.ok(out.text.includes(block.href), `${def.id}: ${block.href} missing from the text part`)
      assert.ok(out.html.includes(block.href), `${def.id}: ${block.href} missing from the HTML`)
    }
  }
})

test("reference rule 04: every email says why it was received", () => {
  for (const def of emailTemplates) {
    const built = def.build(def.previewVars, ctxFor("en"))
    assert.ok(built.footer.why.trim().length > 0, `${def.id}: empty footer`)
  }
})

test("dark mode ships as a media query on sends, and is inlined only for previews", () => {
  const def = emailTemplates[0]
  const sent = renderTemplate(def, def.previewVars, ctxFor("en"))
  assert.ok(sent.html.includes("@media (prefers-color-scheme: dark)"))

  const preview = renderTemplate(def, def.previewVars, ctxFor("en"), "dark")
  assert.equal(preview.html.includes("prefers-color-scheme: dark"), false)
  assert.ok(preview.html.includes("#14171b"), "preview did not inline the dark ground")
})

test("Supabase placeholders survive rendering unescaped", () => {
  const def = emailTemplates.find((t) => t.delivery === "supabase")
  assert.ok(def?.supabaseVars, "no supabase-delivered template")
  const { html } = renderTemplate(def, def.supabaseVars, ctxFor("en"))
  assert.ok(html.includes("{{ .ConfirmationURL }}"))
})

test("the invitation send is the catalog render, not a second template", () => {
  const direct = renderTemplate(
    emailTemplates.find((t) => t.id === "invitation")!,
    { inviterEmail: "ana@example.com", role: "Member", acceptUrl: "https://x.test/i/abc", expiresInDays: "7" },
    { locale: "en", brandName: "Attomik HQ", logoUrl: null, palettes },
  )
  const sent = invitationEmail({
    workspaceName: "Attomik HQ",
    inviterEmail: "ana@example.com",
    role: "Member",
    acceptUrl: "https://x.test/i/abc",
    expiresInDays: 7,
    locale: "en",
  })
  assert.equal(sent.subject, direct.subject)
  assert.equal(sent.html, direct.html)
  assert.equal(sent.text, direct.text)
})

test("recipient-supplied values are escaped, never injected as markup", () => {
  const out = invitationEmail({
    workspaceName: '<script>alert(1)</script>',
    inviterEmail: 'a"b@example.com',
    role: "Member",
    acceptUrl: "https://x.test/i/abc",
    expiresInDays: 7,
    locale: "en",
  })
  assert.equal(out.html.includes("<script>"), false)
  assert.ok(out.html.includes("&lt;script&gt;"))
})
