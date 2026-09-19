import { notFound } from "next/navigation"
import type { FeedbackResolutionRow, FeedbackRow, FeedbackType } from "@/core/feedback"
import { isAdminLike, type Role } from "@/core/permissions"
import { fetchAllRows } from "@/core/supabase/paginate"
import { createClient } from "@/core/supabase/server"
import { listMembers } from "@/core/team"
import { requireWorkspace } from "@/core/workspace"
import { FeedbackScreen, type FeedbackMember } from "./feedback-screen"

interface Row {
  id: string
  workspace_id: string
  user_id: string
  type: FeedbackType
  message: string
  route: string
  user_agent: string
  viewport_w: number
  viewport_h: number
  created_at: string
}

interface ResolutionDbRow {
  feedback_id: string
  resolved_by: string | null
  resolution_note: string | null
  notified_user_ids: string[]
  created_at: string
}

/**
 * Server entry for Settings → Feedback. Owner/admin only, enforced here
 * (the nav row is merely hidden) — the same matrix the `feedback_select_admin`
 * and `feedback_resolutions_select_admin` RLS policies enforce independently.
 * "Resolved" is derived from a feedback_resolutions row existing.
 */
export default async function FeedbackModule() {
  const { workspace } = await requireWorkspace()
  const role = workspace.role as Role
  if (!isAdminLike(role)) notFound()

  const supabase = await createClient()
  const [rows, resolutionRows, members] = await Promise.all([
    fetchAllRows<Row>(() =>
      supabase.from("feedback").select("id, workspace_id, user_id, type, message, route, user_agent, viewport_w, viewport_h, created_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
    ),
    fetchAllRows<ResolutionDbRow>(() =>
      supabase.from("feedback_resolutions").select("feedback_id, resolved_by, resolution_note, notified_user_ids, created_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
    ),
    listMembers(workspace.id),
  ])

  const resolutions: FeedbackResolutionRow[] = resolutionRows.map((r) => ({
    feedbackId: r.feedback_id,
    resolvedBy: r.resolved_by,
    note: r.resolution_note,
    notifiedUserIds: r.notified_user_ids ?? [],
    createdAt: r.created_at,
  }))
  const people: FeedbackMember[] = members.map((m) => ({ userId: m.userId, email: m.email, displayName: m.displayName, role: m.role }))
  const feedback: FeedbackRow[] = rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    userId: r.user_id,
    type: r.type,
    message: r.message,
    route: r.route,
    userAgent: r.user_agent,
    viewportW: r.viewport_w,
    viewportH: r.viewport_h,
    createdAt: r.created_at,
  }))

  return <FeedbackScreen rows={feedback} resolutions={resolutions} members={people} />
}
