/**
 * First-sign-in workspace bootstrap algorithm. Pure orchestration with
 * injected data operations (no next/react imports) so the concurrency
 * paths — especially the racer that LOSES the workspace insert — are
 * testable without a database. The Supabase wiring lives in index.ts.
 *
 * Idempotent and race-safe by construction. Two requests for a brand-new
 * user can run this concurrently (any two requests that resolve the
 * workspace during the first page load after the magic-link callback), and
 * an earlier attempt may have died between steps. Every step therefore
 * tolerates "already done": an existing creator-owned workspace is reused,
 * a slug conflict adopts the concurrent winner's workspace instead of
 * giving up, and membership/settings are written as plain inserts whose
 * duplicate-key outcome (23505) counts as done, so both racers converge on
 * the same consistent rows. (ON CONFLICT DO NOTHING is deliberately not
 * used: its arbiter check evaluates the member-only SELECT policies before
 * the racer's membership exists and fails RLS for a first-time user.)
 */

export interface BootstrapDeps {
  /** Upsert the user's profile row (id + email); no-op when present. */
  ensureProfile(): Promise<void>
  /** Does the user already hold any workspace membership? */
  hasMembership(): Promise<boolean>
  /** Earliest workspace created by this user, readable via creator visibility. */
  findOwnWorkspace(): Promise<string | null>
  /** Insert the workspace row; "conflict" on slug unique_violation (23505). */
  insertWorkspace(ws: { id: string; name: string; slug: string }): Promise<"ok" | "conflict">
  /** Insert the owner membership; a duplicate-key result counts as done. */
  claimOwnerSeat(workspaceId: string): Promise<void>
  /** Insert the default settings row; a duplicate-key result counts as done. */
  ensureSettings(workspaceId: string): Promise<void>
}

/** Deterministic per-user slug: conflicts can only come from the same user. */
export function workspaceSlug(name: string, userId: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${userId.slice(0, 8)}`
}

export async function bootstrapWorkspace(
  deps: BootstrapDeps,
  { name, userId, newId = () => crypto.randomUUID() }: { name: string; userId: string; newId?: () => string },
): Promise<void> {
  await deps.ensureProfile()
  if (await deps.hasMembership()) return

  // A workspace this user already created — left by a concurrent request or
  // an earlier bootstrap that did not finish. The creator-visibility SELECT
  // policy makes it readable before any membership exists.
  let workspaceId = await deps.findOwnWorkspace()

  if (!workspaceId) {
    // The id is generated here, not RETURNING'd: the SELECT policy for
    // non-creators requires membership, which lands one step later.
    const candidateId = newId()
    const outcome = await deps.insertWorkspace({ id: candidateId, name, slug: workspaceSlug(name, userId) })
    if (outcome === "ok") {
      workspaceId = candidateId
    } else {
      // A concurrent request won the insert. Adopt its workspace rather than
      // returning early — the winner may not have written the membership row
      // yet, so waiting on that row instead is exactly the race.
      workspaceId = await deps.findOwnWorkspace()
      if (!workspaceId) {
        throw new Error("Workspace bootstrap failed: concurrent bootstrap left no readable workspace")
      }
    }
  }

  await deps.claimOwnerSeat(workspaceId)
  await deps.ensureSettings(workspaceId)
}
