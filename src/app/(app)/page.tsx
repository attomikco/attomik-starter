import { requireModule } from "@/core/modules"

export default function OverviewPage() {
  requireModule("overview")

  return <h1>Overview</h1>
}
