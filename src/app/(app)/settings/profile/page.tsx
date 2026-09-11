import { requireModule } from "@/core/modules"
import ProfileModule from "@/modules/settings/profile"

export default function ProfilePage() {
  requireModule("settings")

  return <ProfileModule />
}
