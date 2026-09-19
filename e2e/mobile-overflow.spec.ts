import { mkdirSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { expect, test, type Browser, type Page } from "@playwright/test"
import { loginAsNewUser } from "./support/login"
import { formatReport, measureOverflow } from "./support/overflow"
import { appRoutes, concretePath } from "./support/routes"
import { seedWorkspace, type SeedIds } from "./support/seed"
import { resolveE2eTarget } from "./support/target"

/**
 * Permanent mobile guard: every page route of the app, at an iPhone width,
 * must not overflow horizontally. Fails if the document is wider than the
 * viewport or any visible element's right edge is past it (see
 * support/overflow.ts for why the element check is the one that matters).
 *
 * The route list is read from src/app/**\/page.tsx, so a new screen is
 * covered automatically; a new [param] route must get a seeded value in
 * support/routes.ts. Real login, seeded workspace, no clicks or form input:
 * navigation and measurement only.
 *
 * E2E_SCREENSHOTS=1 additionally writes a viewport shot and, for tall pages,
 * a full-length shot of every route to e2e/screenshots/ (gitignored).
 */

const VIEWPORT = { width: 390, height: 844 }
const SHOTS = process.env.E2E_SCREENSHOTS === "1"
const SHOT_DIR = "e2e/screenshots"

// One test walks every route (a failing test restarts Playwright's worker, and
// serial mode would skip the rest): all failures come back in one report.
test.setTimeout(900_000)

let ids: SeedIds
let signedIn: Page
let signedOut: Page
let cleanup: () => Promise<void>

const newMobilePage = async (browser: Browser): Promise<Page> => {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-MX" })
  const page = await context.newPage()
  // A route that never settles must FAIL with its name, not hang the suite.
  page.setDefaultTimeout(30_000)
  page.setDefaultNavigationTimeout(45_000)
  return page
}

test.beforeAll(async ({ browser }) => {
  signedIn = await newMobilePage(browser)
  signedOut = await newMobilePage(browser)

  const session = await loginAsNewUser(signedIn)
  cleanup = session.cleanup
  const { url, serviceRoleKey } = resolveE2eTarget()
  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // First app load bootstraps the workspace, exactly as for a real new user.
  await signedIn.goto("/")
  const { data: ws, error } = await admin.from("workspaces").select("id").eq("created_by", session.userId).order("created_at").limit(1).single()
  if (error || !ws) throw new Error(`no workspace for the e2e user: ${error?.message}`)
  ids = await seedWorkspace(admin, ws.id as string, session.userId)
})

test.afterAll(async () => {
  await cleanup?.()
})

const slug = (s: string) => (s === "/" ? "home" : s.replace(/^\//, "").replace(/\[([^\]]+)\]/g, "$1").replace(/\//g, "_"))

async function shoot(page: Page, name: string) {
  mkdirSync(SHOT_DIR, { recursive: true })
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png` })
  // Screens scroll inside .sh-scroll, so a full-page shot would be one viewport;
  // grow the viewport to the content instead (layout stays at 390px wide).
  const height = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, ...Array.from(document.querySelectorAll(".sh-scroll")).map((e) => e.scrollHeight)))
  if (height > VIEWPORT.height + 8) {
    await page.setViewportSize({ width: VIEWPORT.width, height: Math.min(height + 40, 7000) })
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SHOT_DIR}/${name}.full.png` })
    await page.setViewportSize(VIEWPORT)
  }
}

async function measure(page: Page, path: string, name: string): Promise<string | null> {
  await page.goto(path, { waitUntil: "load" })
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(450) // entrance animations (sh-rise) settle
  const report = await measureOverflow(page)
  if (SHOTS) await shoot(page, name)
  const tooWide = report.scrollWidth > report.viewportWidth
  return tooWide || report.offenders.length > 0 ? `${path}\n${formatReport(report)}` : null
}

test(`every route fits a ${VIEWPORT.width}px viewport`, async () => {
  // E2E_ROUTES=/volumenes,/cobranza limits the pass to routes containing any of these (debugging).
  const only = (process.env.E2E_ROUTES ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  const targets = [
    ...appRoutes().map((route) => ({ page: route.auth ? signedOut : signedIn, path: concretePath(route.pattern, ids), name: slug(route.pattern) })),
    { page: signedIn, path: "/esta-ruta-no-existe", name: "not-found" },
  ]
  const failures: string[] = []
  for (const t of targets.filter((t) => only.length === 0 || only.some((o) => t.path.includes(o)))) {
    await test.step(t.path, async () => {
      try {
        const failure = await measure(t.page, t.path, t.name)
        if (failure) failures.push(failure)
      } catch (error) {
        failures.push(`${t.path}\n  could not be measured: ${(error as Error).message.split("\n")[0]}`)
      }
    })
  }
  expect(failures, `${failures.length} of ${targets.length} routes overflow ${VIEWPORT.width}px:\n\n${failures.join("\n\n")}`).toEqual([])
})
