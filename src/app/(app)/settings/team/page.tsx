import { requireModule } from "@/core/modules"
import TeamModule from "@/modules/settings/team"

export default function TeamPage() {
  requireModule("settings")

  return <TeamModule />
}
