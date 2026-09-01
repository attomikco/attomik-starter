/**
 * Human-readable rendering for activity events. The database stores
 * machine-oriented structured events (dot-separated actions + jsonb
 * diffs); prose is rendered here, centrally — never persisted. Pure and
 * node-testable.
 */

export interface EventShape {
  action: string
  resourceLabel: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

const str = (v: unknown) => (v === null || v === undefined ? "—" : String(v))

export function summarizeEvent(e: EventShape, actor: string): string {
  const label = e.resourceLabel ?? "—"
  switch (e.action) {
    case "workspace.created":
      return `${actor} created the workspace “${label}”`
    case "workspace.settings.updated": {
      const fields = Object.keys(e.after ?? e.before ?? {})
      return `${actor} updated workspace settings (${fields.length} field${fields.length === 1 ? "" : "s"})`
    }
    case "workspace.branding.updated":
      return `${actor} updated the workspace branding`
    case "workspace.member.added":
      return actor === label
        ? `${label} joined as ${str(e.after?.role)}`
        : `${actor} added ${label} as ${str(e.after?.role)}`
    case "workspace.member.role_changed":
      return `${actor} changed ${label}’s role from ${str(e.before?.role)} to ${str(e.after?.role)}`
    case "workspace.member.removed":
      return `${actor} removed ${label} from the workspace`
    case "workspace.invitation.created":
      return `${actor} invited ${label} as ${str(e.after?.role)}`
    case "workspace.invitation.resent":
      return `${actor} resent the invitation for ${label}`
    case "workspace.invitation.revoked":
      return `${actor} revoked the invitation for ${label}`
    case "workspace.invitation.accepted":
      return `${label} accepted their invitation`
    default: {
      // future module events: "media.file.uploaded" → "actor media file uploaded — label"
      const words = e.action.split(".").join(" ").split("_").join(" ")
      return `${actor} — ${words}${e.resourceLabel ? ` — ${e.resourceLabel}` : ""}`
    }
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
