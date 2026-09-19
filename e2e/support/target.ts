import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * Where the e2e suite is allowed to point: a LOCAL Supabase stack, never the
 * hosted project. Every spec creates real auth users, workspaces and rows,
 * and the first runs of this suite did exactly that against production data
 * (four stray `e2e-*@attomik.test` workspaces, 2026-09-14). This module is
 * the single place that decides the target, and it decides by ALLOWLIST —
 * the URL's host must be loopback — rather than by trying to recognise the
 * hosted project, so a new or renamed hosted project cannot slip through.
 * The hosted ref (from supabase/config.toml) and `*.supabase.co` are still
 * rejected by name, purely to give a clearer message and as a second net.
 *
 * Pure of Playwright, so it runs under `node --test` and is shared by
 * playwright.config.ts and e2e/support/login.ts.
 */

export interface E2eTarget {
  url: string
  publishableKey: string
  serviceRoleKey: string
}

export const DEFAULT_LOCAL_URL = "http://127.0.0.1:54321"

const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"])
/** Ambient variables that, if set to a non-local host, mean the shell is pointed at real data. */
const AMBIENT_URL_VARS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"] as const

const HOWTO = [
  "The e2e suite only runs against a local Supabase stack:",
  "  supabase start",
  "  supabase status -o env      # API_URL, ANON_KEY (or PUBLISHABLE_KEY), SERVICE_ROLE_KEY (or SECRET_KEY)",
  "  E2E_SUPABASE_URL=<API_URL> E2E_SUPABASE_PUBLISHABLE_KEY=<anon/publishable> E2E_SUPABASE_SERVICE_ROLE_KEY=<service/secret> pnpm e2e",
].join("\n")

/** Project refs of hosted projects this repo is linked to (supabase/config.toml `project_id`). */
export function readHostedRefs(configPath = resolve(process.cwd(), "supabase", "config.toml")): string[] {
  try {
    const match = readFileSync(configPath, "utf8").match(/^\s*project_id\s*=\s*"([^"]+)"/m)
    return match ? [match[1]] : []
  } catch {
    return []
  }
}

function hostOf(raw: string): string | null {
  try {
    return new URL(raw).hostname
  } catch {
    return null
  }
}

function refClaimOf(key: string): string | null {
  const payload = key.split(".")[1]
  if (key.split(".").length !== 3 || !payload) return null
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { ref?: unknown }
    return typeof claims.ref === "string" ? claims.ref : null
  } catch {
    return null
  }
}

/** Throws unless `raw` is a loopback URL that names no hosted project. */
export function assertLocalSupabaseUrl(raw: string, label: string, hostedRefs: readonly string[] = []): void {
  const host = hostOf(raw)
  if (!host) throw new Error(`e2e refused: ${label} is not a valid URL ("${raw}").\n${HOWTO}`)
  const looksHosted = /(^|\.)supabase\.(co|com|in)$/i.test(host) || hostedRefs.some((ref) => raw.includes(ref))
  if (looksHosted) {
    throw new Error(`e2e refused: ${label} (${host}) is a HOSTED Supabase project. The e2e suite creates and deletes real users and workspaces and must never touch it.\n${HOWTO}`)
  }
  if (!LOOPBACK_HOSTNAMES.has(host)) {
    throw new Error(`e2e refused: ${label} (${host}) is not a local address (127.0.0.1, localhost or [::1]).\n${HOWTO}`)
  }
}

export function resolveE2eTarget(
  env: Record<string, string | undefined> = process.env,
  hostedRefs: readonly string[] = readHostedRefs(),
): E2eTarget {
  // A hosted URL exported in the shell is a mistake to surface, not something
  // to silently override: whatever else in this process reads it would hit
  // real data.
  for (const name of AMBIENT_URL_VARS) {
    const ambient = env[name]?.trim()
    if (ambient) assertLocalSupabaseUrl(ambient, name, hostedRefs)
  }

  const url = (env.E2E_SUPABASE_URL?.trim() || DEFAULT_LOCAL_URL).replace(/\/+$/, "")
  assertLocalSupabaseUrl(url, "E2E_SUPABASE_URL", hostedRefs)

  const publishableKey = env.E2E_SUPABASE_PUBLISHABLE_KEY?.trim()
  const serviceRoleKey = env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!publishableKey || !serviceRoleKey) {
    throw new Error(`e2e refused: E2E_SUPABASE_PUBLISHABLE_KEY and E2E_SUPABASE_SERVICE_ROLE_KEY are required (the local stack's keys).\n${HOWTO}`)
  }

  // Hosted keys are JWTs carrying the project `ref`; local ones never do.
  for (const [label, key] of [["E2E_SUPABASE_PUBLISHABLE_KEY", publishableKey], ["E2E_SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey]] as const) {
    const ref = refClaimOf(key)
    if (ref) throw new Error(`e2e refused: ${label} is a key for the hosted project "${ref}", not the local stack.\n${HOWTO}`)
  }

  return { url, publishableKey, serviceRoleKey }
}
