import { createClient } from "@/core/supabase/server"

/**
 * Canonical audit access. WRITE model:
 *  - Critical starter events are written by database triggers, atomically
 *    with the mutation itself — server actions do not (and cannot) insert
 *    into activity_events directly.
 *  - Future module events call recordActivity(), which wraps the
 *    constrained record_activity RPC (actor forced to the verified caller,
 *    member rank or above enforced — viewers are read-only and never
 *    author events — action name validated). Best-effort by default: a
 *    failure is logged, not thrown — pass { required: true } when a module
 *    decides its mutation must not proceed unaudited.
 * Reads are RLS-scoped to workspace members and paginated server-side.
 */

export interface ActivityEvent {
  id: string
  workspaceId: string
  actorUserId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  resourceLabel: string | null
  metadata: Record<string, unknown>
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  createdAt: string
}

export interface ActivityQuery {
  page: number
  pageSize: number
  q?: string
  action?: string
  resourceType?: string
  actorUserId?: string
}

export interface ActivityPage {
  events: ActivityEvent[]
  total: number
  /** actor id → email for every actor on this page (co-member visibility). */
  actorEmails: Record<string, string>
}

export async function listActivity(workspaceId: string, query: ActivityQuery): Promise<ActivityPage> {
  const supabase = await createClient()
  const from = (query.page - 1) * query.pageSize

  let req = supabase
    .from("activity_events")
    .select("id, workspace_id, actor_user_id, action, resource_type, resource_id, resource_label, metadata, before_data, after_data, created_at", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(from, from + query.pageSize - 1)

  if (query.action) req = req.eq("action", query.action)
  if (query.resourceType) req = req.eq("resource_type", query.resourceType)
  if (query.actorUserId) req = req.eq("actor_user_id", query.actorUserId)
  if (query.q?.trim()) {
    const q = query.q.trim().replace(/[%_,]/g, "")
    req = req.or(`resource_label.ilike.%${q}%,action.ilike.%${q}%`)
  }

  const { data, error, count } = await req
  if (error) throw new Error(`Could not load activity: ${error.message}`)

  const events: ActivityEvent[] = (data ?? []).map((r) => ({
    id: r.id as string,
    workspaceId: r.workspace_id as string,
    actorUserId: (r.actor_user_id as string | null) ?? null,
    action: r.action as string,
    resourceType: r.resource_type as string,
    resourceId: (r.resource_id as string | null) ?? null,
    resourceLabel: (r.resource_label as string | null) ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    before: (r.before_data as Record<string, unknown> | null) ?? null,
    after: (r.after_data as Record<string, unknown> | null) ?? null,
    createdAt: r.created_at as string,
  }))

  const actorIds = [...new Set(events.map((e) => e.actorUserId).filter((v): v is string => !!v))]
  const actorEmails: Record<string, string> = {}
  if (actorIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", actorIds)
    for (const p of profiles ?? []) actorEmails[p.id as string] = p.email as string
  }

  return { events, total: count ?? events.length, actorEmails }
}

/**
 * Custom event recorder for future modules — see the write model above.
 * Callers with a viewer actor get a logged failure (or a thrown error with
 * `required`); check canRecordActivity() first when the UI should not even
 * offer the mutation. The database is the boundary either way.
 */
export async function recordActivity(input: {
  workspaceId: string
  action: string
  resourceType: string
  resourceId?: string
  resourceLabel?: string
  metadata?: Record<string, unknown>
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  required?: boolean
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("record_activity", {
    workspace: input.workspaceId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    resource_label: input.resourceLabel ?? null,
    metadata: input.metadata ?? {},
    before_data: input.before ?? null,
    after_data: input.after ?? null,
  })
  if (error) {
    console.error("[audit] recordActivity failed:", input.action, error.code ?? error.message)
    if (input.required) throw new Error("The change could not be audited and was not applied.")
  }
}
