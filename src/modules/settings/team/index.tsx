import type { Role } from "@/core/permissions"
import { isAdminLike } from "@/core/permissions"
import { listMembers, listPendingInvitations } from "@/core/team"
import { requireWorkspace } from "@/core/workspace"
import { TeamScreen } from "./team-screen"

/** Server entry: canonical workspace resolution + RLS-scoped team reads. */
export default async function TeamModule() {
  const { user, workspace, settings } = await requireWorkspace()
  const role = workspace.role as Role
  const [members, invitations] = await Promise.all([
    listMembers(workspace.id),
    isAdminLike(role) ? listPendingInvitations(workspace.id) : Promise.resolve([]),
  ])

  return <TeamScreen actorRole={role} actorId={user.id} members={members} invitations={invitations} defaultRole={settings.default_member_role} />
}
