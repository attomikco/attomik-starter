import { requireModule } from "@/core/modules"
import MediaModule from "@/modules/media"

export default function MediaPage() {
  requireModule("media")

  return <MediaModule />
}
