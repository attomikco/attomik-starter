/**
 * Pre-push guard: production must never fall behind the migrations the
 * pushed code depends on (a migration landing after the code that needs it
 * breaks the deploy in between). `supabase db push` must land before, or in
 * the same step as, the push — this is the last-line automated check that a
 * `git push` can't silently skip that rule. Ported from Arghos, where
 * production once fell four migrations behind local.
 *
 * Installed as the repo's pre-push hook (.githooks/pre-push, activated with
 * `pnpm hooks:install`). Opt-in: it compares local migration versions with
 * the linked project's, so it only makes sense once they are in sync.
 *
 * Usage: node scripts/check-migrations-pushed.ts
 * Exit 0: every local migration file is already applied to the linked
 * Supabase project (or the check itself couldn't run — see below).
 * Exit 1: at least one local migration is missing on the remote,
 * printing which — the push must be blocked.
 */
import { execFileSync } from "node:child_process"
import { pathToFileURL } from "node:url"

/** One row of `supabase migration list --output-format json`'s own shape — `remote` is empty/absent exactly when that local migration has never been applied to the linked project. */
export interface MigrationListRow {
  local?: string
  remote?: string
}

/** Pure: the local migration timestamps with no matching remote row — never guesses at WHY (unlinked project, network failure, a genuinely unpushed file all look identical from this function's own input; only the caller's own exit code decides whether "couldn't determine" should block a push). */
export function findMissingMigrations(rows: MigrationListRow[]): string[] {
  return rows.filter((r) => r.local && !r.remote).map((r) => r.local!)
}

function main(): void {
  let stdout: string
  try {
    stdout = execFileSync("supabase", ["migration", "list", "--linked", "--output-format", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  } catch (err) {
    // supabase CLI missing, project not linked, or a network hiccup — never
    // block a push over an environment problem this check can't diagnose;
    // it degrades to a warning, not a silent pass with no trace at all.
    console.warn("⚠️  pre-push: could not run `supabase migration list` (CLI missing, project not linked, or unreachable) — skipping the migration check. This push is NOT verified against production.")
    console.warn(err instanceof Error ? err.message : String(err))
    return
  }

  let rows: MigrationListRow[]
  try {
    rows = (JSON.parse(stdout).migrations ?? []) as MigrationListRow[]
  } catch {
    console.warn("⚠️  pre-push: could not parse `supabase migration list` output — skipping the migration check.")
    return
  }

  const missing = findMissingMigrations(rows)
  if (missing.length === 0) return

  console.error("")
  console.error("❌ pre-push blocked: the following migration(s) exist locally but are NOT applied to the linked Supabase project:")
  for (const m of missing) console.error(`   - ${m}`)
  console.error("")
  console.error("   Run `supabase db push` first (docs/SUPABASE.md), verify it lands in the Dashboard's Database → Migrations page, then push again.")
  process.exit(1)
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main()
}
