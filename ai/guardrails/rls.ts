// RLS coverage guardrail (verify:db). After a local reset has applied every
// migration, asks the catalog — not a migration parser — for public-schema
// tables with row level security disabled, and fails on any that is not in
// ai/guardrails/rls-allowlist.json (each entry needs a written reason).
//
// Local stack only, like scripts/run-db-tests.sh: the database is DATABASE_URL
// or the local stack's DB_URL, and anything that is not loopback is refused.
// Needs `psql`, or falls back to the local Postgres container.
//
// Control plane (ai/AGENT_CONTRACT.md): autonomous agents never edit this file
// or the allowlist.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

export type AllowlistEntry = { table: string; reason: string }

const ALLOWLIST_PATH = new URL("./rls-allowlist.json", import.meta.url)

// Ordinary and partitioned tables in `public` (the Data API schema). Views,
// materialized views and foreign tables cannot carry RLS and are out of scope.
const QUERY = `select format('%I.%I', n.nspname, c.relname)
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  order by 1`

/** Validates the allowlist's shape; every entry names a table and says why. */
export function parseAllowlist(json: string): AllowlistEntry[] {
  const data = JSON.parse(json) as { tables?: unknown }
  if (!Array.isArray(data.tables)) throw new Error("rls-allowlist.json: expected { \"tables\": [...] }")
  return data.tables.map((e, i) => {
    const entry = e as Partial<AllowlistEntry>
    if (typeof entry.table !== "string" || !/^public\.[a-z_][a-z0-9_]*$/.test(entry.table)) throw new Error(`rls-allowlist.json: entry ${i} needs "table": "public.<name>"`)
    if (typeof entry.reason !== "string" || entry.reason.trim().length < 10) throw new Error(`rls-allowlist.json: ${entry.table} needs a written "reason"`)
    return { table: entry.table, reason: entry.reason }
  })
}

/** Tables without RLS that the allowlist does not excuse, plus stale allowlist entries. */
export function evaluate(withoutRls: string[], allowlist: AllowlistEntry[]) {
  const allowed = new Set(allowlist.map((e) => e.table))
  const present = new Set(withoutRls)
  return {
    violations: withoutRls.filter((t) => !allowed.has(t)),
    stale: allowlist.filter((e) => !present.has(e.table)).map((e) => e.table),
  }
}

function databaseUrl(): string {
  let url = process.env.DATABASE_URL?.trim() ?? ""
  if (!url) {
    try {
      const env = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      url = env.match(/^DB_URL="(.*)"$/m)?.[1] ?? ""
    } catch {
      /* reported below */
    }
  }
  if (!url) throw new Error("No local database. Run `supabase start` first, or set DATABASE_URL to a local stack.")
  if (!/@(127\.0\.0\.1|localhost|\[::1\]):/.test(url)) throw new Error("Refusing a non-local database: the RLS guardrail runs against a local stack only.")
  return url
}

function query(url: string, sql: string): string {
  const args = ["-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql]
  try {
    execFileSync("psql", ["--version"], { stdio: "ignore" })
    return execFileSync("psql", [url, ...args], { encoding: "utf8" })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  const port = url.match(/:(\d+)\/[^/]*$/)?.[1]
  const container = execFileSync("docker", ["ps", "--filter", `publish=${port}`, "--format", "{{.Names}}"], { encoding: "utf8" }).split("\n")[0]
  if (!container) throw new Error(`psql is not installed and no container publishes port ${port}.`)
  return execFileSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", ...args], { encoding: "utf8" })
}

if (import.meta.main) {
  try {
    const allowlist = parseAllowlist(readFileSync(ALLOWLIST_PATH, "utf8"))
    const withoutRls = query(databaseUrl(), QUERY).split("\n").map((s) => s.trim()).filter(Boolean)
    const { violations, stale } = evaluate(withoutRls, allowlist)
    for (const t of stale) console.log(`rls: note — allowlisted ${t} no longer exists or now has RLS; remove the entry.`)
    if (violations.length > 0) {
      for (const t of violations) console.log(`rls: ${t} has row level security DISABLED`)
      console.log("rls: enable RLS in the migration that creates each table (docs/SUPABASE.md). Allowlisting needs a human decision with a written reason.")
      process.exitCode = 1
    } else {
      console.log(`rls: ok — every public table has row level security enabled${allowlist.length ? ` (${allowlist.length} allowlisted)` : ""}`)
    }
  } catch (error) {
    console.log(`rls: ${(error as Error).message}`)
    process.exitCode = 1
  }
}
