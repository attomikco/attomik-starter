import { listActivity } from "@/core/audit"
import { listMembers } from "@/core/team"
import { requireWorkspace } from "@/core/workspace"
import { ActivityScreen } from "./activity-screen"

const PAGE_SIZE = 25

/** Server entry: URL-driven, server-paginated activity query. */
export default async function ActivityModule({
  searchParams,
}: {
  searchParams: { q?: string; action?: string; actor?: string; page?: string }
}) {
  const { workspace } = await requireWorkspace()
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1)
  const filters = {
    q: searchParams.q ?? "",
    action: searchParams.action ?? "",
    actor: searchParams.actor ?? "",
  }

  const [activity, members] = await Promise.all([
    listActivity(workspace.id, {
      page,
      pageSize: PAGE_SIZE,
      q: filters.q || undefined,
      action: filters.action || undefined,
      actorUserId: filters.actor || undefined,
    }),
    listMembers(workspace.id),
  ])

  return (
    <ActivityScreen
      events={activity.events}
      total={activity.total}
      page={page}
      pageSize={PAGE_SIZE}
      actorEmails={activity.actorEmails}
      members={members.map((m) => ({ userId: m.userId, email: m.email }))}
      filters={filters}
    />
  )
}
