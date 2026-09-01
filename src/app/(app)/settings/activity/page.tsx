import { requireModule } from "@/core/modules"
import ActivityModule from "@/modules/settings/activity"

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; actor?: string; page?: string }>
}) {
  requireModule("settings")
  return <ActivityModule searchParams={await searchParams} />
}
