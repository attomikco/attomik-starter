/**
 * Picks the caller's OWN seat out of the workspace_members rows a query
 * returned. Pure and node-testable.
 *
 * Under RLS a member sees every seat of their workspaces (the Team screen
 * needs co-members), so a query that takes "the first membership row" hands
 * every user the earliest member's role — the owner's. The resolver both
 * filters the query by user_id and runs the rows through this helper, so the
 * invariant holds even if the query or the policy changes: authorization
 * comes from the actor's row, never another user's.
 */
export interface MembershipSeat {
  user_id: string
  role: string
  created_at?: string | null
}

/** The user's earliest seat, or null when none of the rows belongs to them. */
export function ownMembership<T extends MembershipSeat>(rows: readonly T[], userId: string): T | null {
  const own = rows.filter((r) => r.user_id === userId)
  own.sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
  return own[0] ?? null
}
