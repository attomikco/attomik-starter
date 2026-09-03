/**
 * Renders the auth emails Supabase delivers into supabase/templates/, from
 * the SAME catalog Settings → Emails previews (src/core/email). Supabase
 * Auth mail is sent by GoTrue, not by app code, so it needs a static file
 * with Go placeholders — this script is what keeps that file from drifting
 * away from the template it was generated from.
 *
 * Run:   pnpm build:auth-emails
 * Push:  SMTP_PASS=<resend api key> supabase config push
 *
 * These emails carry the PROJECT skin and locale, never a workspace's:
 * at sign-in time there is no workspace, and the recipient may not belong
 * to one. Workspace-branded mail is sent from app code instead.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { projectConfig } from "../src/config/project.ts"
import { skins } from "../src/core/branding/skins.ts"
import { emailBrand } from "../src/core/branding/email.ts"
import { emailPalettes, emailTemplates, renderTemplate } from "../src/core/email/index.ts"

const CONFIG_PATH = "supabase/config.toml"

const skin = skins[projectConfig.skin]
const palettes = emailPalettes({
  light: emailBrand(skin, "light"),
  dark: emailBrand(skin, "dark"),
})

const expected: string[] = []
let wrote = 0

for (const def of emailTemplates) {
  if (def.delivery !== "supabase" || !def.supabaseVars) continue

  const { subject, html } = renderTemplate(def, def.supabaseVars, {
    locale: projectConfig.locale,
    brandName: projectConfig.name,
    // No logo: the file is static and a workspace logo URL would be wrong
    // for every other workspace. The project name renders instead.
    logoUrl: null,
    palettes,
  })

  const path = `supabase/templates/${def.id}.html`
  mkdirSync("supabase/templates", { recursive: true })
  writeFileSync(path, html, "utf8")
  wrote++
  console.log(`wrote ${path}  (${html.length} bytes)`)

  expected.push(
    [
      `[auth.email.template.${def.id}]`,
      `subject = ${JSON.stringify(subject)}`,
      `content_path = "./${path}"`,
    ].join("\n"),
  )
}

// One source of truth for the subject line: the dictionary. config.toml is
// hand-maintained, so verify rather than rewrite it — a silent mismatch
// would ship a subject nobody wrote.
const config = readFileSync(CONFIG_PATH, "utf8")
const missing = expected.filter((block) => !block.split("\n").every((line) => config.includes(line)))

if (missing.length > 0) {
  console.error(`\n${CONFIG_PATH} does not match the rendered templates. Expected:\n`)
  console.error(missing.join("\n\n") + "\n")
  process.exit(1)
}

console.log(`\n${wrote} template(s) rendered; ${CONFIG_PATH} is in sync.`)
