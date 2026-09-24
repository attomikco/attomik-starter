import { mkdirSync, writeFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { MARKDOWN_RE, ONE_PLURAL_RE } from "../src/core/i18n/plural-nouns"
import { layoutChecks, type LayoutReport } from "./support/layout-checks"
import { loginAsNewUser } from "./support/login"
import { formatReport, measureOverflow } from "./support/overflow"
import { appRoutes, concretePath } from "./support/routes"
import { seedWorkspace, type SeedIds } from "./support/seed"
import { resolveE2eTarget } from "./support/target"

/**
 * `pnpm ui:audit` (docs/UI_AUDIT.md): every page route at 390, 1440 and
 * 2560px, light and dark — screenshot each, and fail on: horizontal
 * overflow of the page body; overlapping text; clipped text without
 * truncation+title; main content narrower than 90% of the screen host at
 * 1440 and wider; "1 <plural>" or raw markdown in visible text; a
 * segmented control whose options wrap. Writes a contact sheet of every
 * route × width × appearance to e2e/screenshots/contact-sheet.html and the
 * findings to e2e/screenshots/audit-report.json. No clicks. Local Supabase
 * only, real login, seeded workspace, like mobile-overflow.spec.ts.
 *
 *   E2E_ROUTES=/cobranza,/flota   limit to routes containing any of these
 *   E2E_WIDTHS=390,1440           override the widths
 */

const WIDTHS = (process.env.E2E_WIDTHS ?? "390,1440,2560").split(",").map(Number)
const THEMES = ["light", "dark"] as const
const OUT = "e2e/screenshots"
const SHOTS = `${OUT}/audit`
const MIN_CONTENT_RATIO = 0.9

test.setTimeout(3_600_000)

interface Finding { route: string; width: number; theme: string; problems: string[]; shot: string }

let ids: SeedIds
let owner: BrowserContext
let cleanup: () => Promise<void>
const contexts: BrowserContext[] = []

test.beforeAll(async ({ browser }) => {
  owner = await browser.newContext({ locale: "es-MX" })
  contexts.push(owner)
  const page = await owner.newPage()
  const session = await loginAsNewUser(page)
  cleanup = session.cleanup
  const { url, serviceRoleKey } = resolveE2eTarget()
  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  await page.goto("/")
  const { data: ws, error } = await admin.from("workspaces").select("id").eq("created_by", session.userId).order("created_at").limit(1).single()
  if (error || !ws) throw new Error(`no workspace for the e2e user: ${error?.message}`)
  ids = await seedWorkspace(admin, ws.id as string, session.userId)
})

test.afterAll(async () => {
  for (const c of contexts) await c.close().catch(() => {})
  await cleanup?.()
})

async function pageFor(browser: Browser, width: number, theme: string, signedIn: boolean): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, deviceScaleFactor: 1, locale: "es-MX", isMobile: width < 600, hasTouch: width < 600 })
  await context.addInitScript((t) => { try { localStorage.setItem("attomik-theme", t) } catch {} }, theme)
  if (signedIn) await context.addCookies(await owner.cookies())
  contexts.push(context)
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  page.setDefaultNavigationTimeout(45_000)
  return page
}

const slug = (s: string) => (s === "/" ? "home" : s.replace(/^\//, "").replace(/\[([^\]]+)\]/g, "$1").replace(/[/?=&]+/g, "_"))

async function audit(page: Page, path: string, width: number, theme: string, shot: string): Promise<string[]> {
  await page.goto(path, { waitUntil: "load" })
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(450)
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${shot}.png` })
  const problems: string[] = []
  const overflow = await measureOverflow(page)
  if (overflow.scrollWidth > overflow.viewportWidth || overflow.offenders.length > 0) problems.push(`overflow: ${formatReport(overflow).replace(/\n/g, " · ")}`)
  const layout: LayoutReport = await page.evaluate(layoutChecks, { checkContentWidth: width >= 1440, minContentRatio: MIN_CONTENT_RATIO, onePluralSource: ONE_PLURAL_RE.source, markdownSource: MARKDOWN_RE.source })
  for (const o of layout.overlaps.slice(0, 6)) problems.push(`overlap: ${o}`)
  for (const c of layout.clipped.slice(0, 6)) problems.push(`clipped: ${c}`)
  if (layout.narrowContent) problems.push(`narrow: ${layout.narrowContent}`)
  for (const s of layout.badStrings) problems.push(`text: ${s}`)
  for (const s of layout.segmentedWraps) problems.push(`segmented: ${s}`)
  return problems
}

function contactSheet(findings: Finding[], routes: string[]): string {
  const cell = (f: Finding | undefined) => f
    ? `<a href="audit/${f.shot}.png" target="_blank"><img src="audit/${f.shot}.png" loading="lazy" alt="${f.shot}"></a>${f.problems.length ? `<ul>${f.problems.map((p) => `<li>${p.replace(/</g, "&lt;")}</li>`).join("")}</ul>` : `<div class="ok">OK</div>`}`
    : "<div class='ok'>—</div>"
  const cols = WIDTHS.flatMap((w) => THEMES.map((t) => `${w} ${t}`))
  const rows = routes.map((r) => `<tr><th>${r}</th>${WIDTHS.flatMap((w) => THEMES.map((t) => `<td>${cell(findings.find((f) => f.route === r && f.width === w && f.theme === t))}</td>`)).join("")}</tr>`).join("\n")
  const bad = findings.filter((f) => f.problems.length).length
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>UI audit contact sheet</title>
<style>body{font:13px system-ui;margin:20px;background:#f6f6f4;color:#111}table{border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;vertical-align:top;text-align:left}th{background:#eee;position:sticky;top:0}td img{width:220px;display:block;border:1px solid #ccc}ul{margin:6px 0 0;padding-left:16px;color:#a33;font-size:11px}.ok{color:#393;font-size:11px}</style></head>
<body><h1>UI audit — ${new Date().toISOString().slice(0, 16)} · ${findings.length} cells · ${bad} with findings</h1>
<table><thead><tr><th>route</th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></body></html>`
}

test("ui audit: every route at every width and appearance", async ({ browser }) => {
  const only = (process.env.E2E_ROUTES ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  const targets = appRoutes()
    .map((r) => ({ auth: r.auth, pattern: r.pattern, path: concretePath(r.pattern, ids) }))
    .filter((t) => only.length === 0 || only.some((o) => t.path.includes(o)))
  const findings: Finding[] = []
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const signedIn = await pageFor(browser, width, theme, true)
      const signedOut = await pageFor(browser, width, theme, false)
      for (const t of targets) {
        const shot = `${slug(t.pattern)}_${width}_${theme}`
        await test.step(`${t.path} ${width} ${theme}`, async () => {
          try {
            const problems = await audit(t.auth ? signedOut : signedIn, t.path, width, theme, shot)
            findings.push({ route: t.pattern, width, theme, problems, shot })
          } catch (error) {
            findings.push({ route: t.pattern, width, theme, problems: [`could not be audited: ${(error as Error).message.split("\n")[0]}`], shot })
          }
        })
      }
      await signedIn.context().close()
      await signedOut.context().close()
    }
  }
  mkdirSync(OUT, { recursive: true })
  writeFileSync(`${OUT}/contact-sheet.html`, contactSheet(findings, targets.map((t) => t.pattern)))
  writeFileSync(`${OUT}/audit-report.json`, JSON.stringify(findings.filter((f) => f.problems.length), null, 2))
  const failures = findings.filter((f) => f.problems.length).map((f) => `${f.route} @${f.width} ${f.theme}\n  ${f.problems.join("\n  ")}`)
  expect(failures, `${failures.length} of ${findings.length} route×width×appearance cells have findings (see ${OUT}/contact-sheet.html):\n\n${failures.join("\n\n")}`).toEqual([])
})
