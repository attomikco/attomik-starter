import type { AuditCopy } from "@/core/i18n/copy"

/**
 * Human-readable rendering for activity events. The database stores
 * machine-oriented structured events (dot-separated actions + jsonb
 * diffs); prose is rendered here, centrally — never persisted. The words
 * come from the locale dictionary (`copy.audit` in src/core/i18n), passed
 * in explicitly so this module stays pure and node-testable.
 */

export interface EventShape {
  action: string
  resourceLabel: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

const str = (v: unknown) => (v === null || v === undefined ? "—" : String(v))

export function summarizeEvent(e: EventShape, actor: string, t: AuditCopy): string {
  const label = e.resourceLabel ?? "—"
  switch (e.action) {
    case "workspace.created":
      return t.workspaceCreated(actor, label)
    case "workspace.settings.updated":
      return t.settingsUpdated(actor, Object.keys(e.after ?? e.before ?? {}).length)
    case "workspace.branding.updated":
      return t.brandingUpdated(actor)
    case "workspace.member.added":
      return actor === label ? t.memberJoined(label, str(e.after?.role)) : t.memberAdded(actor, label, str(e.after?.role))
    case "workspace.member.role_changed":
      return t.roleChanged(actor, label, str(e.before?.role), str(e.after?.role))
    case "workspace.member.removed":
      return t.memberRemoved(actor, label)
    case "workspace.invitation.created":
      return t.invited(actor, label, str(e.after?.role))
    case "workspace.invitation.resent":
      return t.invitationResent(actor, label)
    case "workspace.invitation.revoked":
      return t.invitationRevoked(actor, label)
    case "workspace.invitation.accepted":
      return t.invitationAccepted(label)
    default:
      // future module events: the locale decides how a raw action reads
      return t.fallback(actor, e.action, e.resourceLabel)
  }
}

export type EventTone = "ok" | "warn" | "bad" | "neutral"

/** Chip tone by verb: additive → ok, destructive → bad, else neutral. */
export function eventTone(action: string): EventTone {
  const verb = action.split(".").pop() ?? ""
  if (["created", "added", "accepted", "uploaded"].includes(verb)) return "ok"
  if (["removed", "revoked", "deleted", "failed"].includes(verb)) return "bad"
  if (["resent"].includes(verb)) return "warn"
  return "neutral"
}

/** Short chip label: the verb segment. */
export function eventVerb(action: string): string {
  return (action.split(".").pop() ?? action).replace(/_/g, " ")
}

/** The event naming rule enforced by record_activity() in the database. */
export function isValidActionName(action: string): boolean {
  return /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(action)
}
