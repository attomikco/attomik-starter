import { requireModule } from "@/core/modules"
import GeneralModule from "@/modules/settings/general"

export default function GeneralPage() {
  requireModule("settings")

  return <GeneralModule />
}
