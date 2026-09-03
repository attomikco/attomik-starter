/**
 * Dev helper: renders every catalog email to a single side-by-side HTML
 * page (light and dark, desktop and mobile) so the output can be eyeballed
 * without running the app. Not part of the product surface.
 *
 *   node scripts/preview-emails.ts [outfile]
 */
import { writeFileSync } from "node:fs"
import { projectConfig } from "../src/config/project.ts"
import { emailBrand } from "../src/core/branding/email.ts"
import { skins } from "../src/core/branding/skins.ts"
import { emailPalettes, emailTemplates, renderTemplate } from "../src/core/email/index.ts"

const out = process.argv[2] ?? "email-previews.html"
const skin = skins[projectConfig.skin]
const palettes = emailPalettes({ light: emailBrand(skin, "light"), dark: emailBrand(skin, "dark") })

const cards = emailTemplates.flatMap((def) =>
  (["light", "dark"] as const).map((mode) => {
    const r = renderTemplate(def, def.previewVars, {
      locale: projectConfig.locale,
      brandName: projectConfig.name,
      logoUrl: null,
      palettes,
    }, mode)
    return `<section>
      <h2>${def.id} · ${mode}</h2>
      <p><b>Subject:</b> ${r.subject}<br><b>Preview line:</b> ${r.preheader}</p>
      <iframe sandbox="" srcdoc="${r.html.replace(/"/g, "&quot;")}"></iframe>
    </section>`
  }),
)

writeFileSync(
  out,
  `<!doctype html><meta charset="utf-8"><title>Email previews</title>
<style>
  body { margin:0; padding:24px; font:14px/1.5 system-ui; background:#f4f5f7; color:#111; }
  section { margin-bottom:32px; }
  h2 { font:600 13px/1 ui-monospace,monospace; letter-spacing:.08em; text-transform:uppercase; color:#555; }
  iframe { width:100%; max-width:760px; height:760px; border:1px solid #ddd; border-radius:10px; background:#fff; }
</style>
${cards.join("\n")}`,
  "utf8",
)
console.log(`wrote ${out}`)
