import { redirect } from "next/navigation"
import { requireModule } from "@/core/modules"

export default function SettingsPage() {
  requireModule("settings")
  redirect("/settings/general")
}
