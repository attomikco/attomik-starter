import { requireModule } from "@/core/modules"
import EmailsModule from "@/modules/settings/emails"

export default function EmailsPage() {
  requireModule("settings")

  return <EmailsModule />
}
