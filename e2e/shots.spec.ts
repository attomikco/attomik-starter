import { mkdirSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { test, type BrowserContext } from "@playwright/test"
import { loginAsNewUser } from "./support/login"
import { concretePath } from "./support/routes"
import { seedWorkspace, type SeedIds } from "./support/seed"
import { resolveE2eTarget } from "./support/target"

/**
 * Ad-hoc screenshots of a handful of routes at one width — the before/after
 * evidence for a layout change (a DataTable fix, a migration onto a
 * primitive) without running the whole audit. No clicks.
 *
 *   E2E_ROUTES    comma-separated route patterns, [param] filled from the seed
 *                 (e.g. "/settings/equipo,/cobranza/facturas/[id]")
 *   E2E_WIDTHS    comma-separated viewport widths (default 1440)
 *   E2E_THEME     light | dark (default light)
 *   E2E_SHOT_DIR  output folder (default e2e/screenshots/shots)
 */

const ROUTES = (process.env.E2E_ROUTES ?? "").split(",").map((s) => s.trim()).filter(Boolean)
const WIDTHS = (process.env.E2E_WIDTHS ?? process.env.E2E_WIDTH ?? "1440").split(",").map(Number)
const THEME = process.env.E2E_THEME === "dark" ? "dark" : "light"
const SHOT_DIR = process.env.E2E_SHOT_DIR ?? "e2e/screenshots/shots"

test.setTimeout(600_000)

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

test.afterAll(async () => { for (const c of contexts) await c.close().catch(() => {}); await cleanup?.() })

const slug = (p: string) => p.replace(/^\//, "").replace(/\[([^\]]+)\]/g, "$1").replace(/[/?=&]+/g, "_") || "home"

test(`screenshots of ${ROUTES.length} routes at ${WIDTHS.join("/")}px ${THEME}`, async ({ browser }) => {
  mkdirSync(SHOT_DIR, { recursive: true })
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, locale: "es-MX", isMobile: width < 600, hasTouch: width < 600 })
    await context.addInitScript((t) => { try { localStorage.setItem("attomik-theme", t) } catch {} }, THEME)
    await context.addCookies(await owner.cookies())
    contexts.push(context)
    const page = await context.newPage()
    page.setDefaultTimeout(30_000)
    page.setDefaultNavigationTimeout(45_000)
    for (const pattern of ROUTES) {
      const path = concretePath(pattern, ids)
      await test.step(`${path} ${width}`, async () => {
        await page.goto(path, { waitUntil: "load" })
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {})
        await page.waitForTimeout(450)
        await page.screenshot({ path: `${SHOT_DIR}/${slug(pattern)}_${width}_${THEME}.png` })
      })
    }
  }
})
