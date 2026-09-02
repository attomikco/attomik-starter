/**
 * The canonical capability model. Authorization comes from the actor's
 * workspace_members row; these pure helpers define what each role may do,
 * mirrored exactly by the RLS policies in the team_invitations migration —
 * UI visibility is convenience, the database is the boundary. Pure and
 * node-testable; never scatter `role === "owner"` checks through components.
 */

export type Role = "owner" | "admin" | "member" | "viewer"

/** Every role, in rank order. On-screen names and meanings live in the
    dictionary (`copy.roles`) — render those, never the identifier. */
export const ROLES: readonly Role[] = ["owner", "admin", "member", "viewer"]

export function isAdminLike(role: Role): boolean {
  return role === "owner" || role === "admin"
}

/** Roles the actor may assign — on invitations and on role changes. */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "owner") return ["admin", "member", "viewer"]
  if (actor === "admin") return ["member", "viewer"]
  return []
}

/** May the actor change/remove a member currently holding targetRole?
 *  Owner rows are managed by nobody — the owner invariant. */
export function canManageTarget(actor: Role, targetRole: Role): boolean {
  if (targetRole === "owner") return false
  if (actor === "owner") return true
  if (actor === "admin") return targetRole === "member" || targetRole === "viewer"
  return false
}

export function canInvite(actor: Role): boolean {
  return assignableRoles(actor).length > 0
}

/** Rank order used for "at least this role" checks. */
const RANK: Record<Role, number> = { viewer: 0, member: 1, admin: 2, owner: 3 }

export function hasRank(actor: Role, atLeast: Role): boolean {
  return RANK[actor] >= RANK[atLeast]
}

/**
 * May the actor author custom activity events (recordActivity)? Viewers are
 * read-only and never mutate, so they never audit — the database enforces
 * the same rule inside record_activity(). Trigger-written events are not
 * affected: a viewer cannot perform the mutations those triggers audit.
 */
export function canRecordActivity(actor: Role): boolean {
  return hasRank(actor, "member")
}

export function isValidRole(value: string): value is Role {
  return value === "owner" || value === "admin" || value === "member" || value === "viewer"
}

/** Normalized form used everywhere an email is stored or compared. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}
