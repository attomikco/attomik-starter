import { requireModule } from "@/core/modules"
import AppearanceModule from "@/modules/settings/appearance"

export default function AppearancePage() {
  requireModule("settings")

  return <AppearanceModule />
}
