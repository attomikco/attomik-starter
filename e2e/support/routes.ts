import { readdirSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import type { SeedIds } from "./seed"

/**
 * Every page route of the app, read from src/app/**\/page.tsx so a new screen
 * is picked up by the mobile overflow guard automatically. Route groups
 * ("(app)", "(auth)") are stripped from the URL; /dev/* is excluded (blocked
 * in production builds, which is what the e2e server runs). A dynamic segment
 * with no entry in `dynamicParam` throws, so adding a [param] route forces
 * adding its seeded value here.
 */

export interface AppRoute {
  /** Route pattern, e.g. "/servicios/[id]". */
  pattern: string
  /** Signed-out surface (the (auth) group); everything else needs a session. */
  auth: boolean
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (name === "page.tsx") out.push(full)
  }
  return out
}

export function appRoutes(root = resolve(process.cwd(), "src", "app")): AppRoute[] {
  const routes = walk(root).map((file) => {
    const segments = file.slice(root.length + 1).split("/").slice(0, -1)
    const auth = segments[0] === "(auth)"
    const url = "/" + segments.filter((s) => !/^\(.+\)$/.test(s)).join("/")
    return { pattern: url === "/" ? "/" : url.replace(/\/$/, ""), auth }
  })
  return routes.filter((r) => !r.pattern.startsWith("/dev/") && r.pattern !== "/dev").sort((a, b) => a.pattern.localeCompare(b.pattern))
}

/** One entry per dynamic route: a value the seeded workspace (or a made-up token) resolves. */
const dynamicParam = (pattern: string, _ids: SeedIds): string => {
  const table: Record<string, string> = {
    "/invite/[token]": "e2e-not-a-real-token",
  }
  const value = table[pattern]
  if (!value) throw new Error(`e2e/support/routes.ts: no seeded value for the dynamic route ${pattern}. Add it to dynamicParam().`)
  return value
}

export function concretePath(pattern: string, ids: SeedIds): string {
  return pattern.includes("[") ? pattern.replace(/\[[^\]]+\]/, dynamicParam(pattern, ids)) : pattern
}
