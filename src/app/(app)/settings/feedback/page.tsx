import { requireFeature } from "@/core/config/features"
import { requireModule } from "@/core/modules"
import FeedbackModule from "@/modules/settings/feedback"

export default function FeedbackPage() {
  requireModule("settings")
  requireFeature("feedbackWidget")

  return <FeedbackModule />
}
