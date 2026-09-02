import { requireModule } from "@/core/modules"
import LanguageModule from "@/modules/settings/language"

export default function LanguagePage() {
  requireModule("settings")

  return <LanguageModule />
}
