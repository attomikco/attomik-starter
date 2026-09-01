import { requireDevelopment } from "@/core/dev"
import { RecordDemo } from "./record-demo"

/** Development-only demo of RecordLayout + form primitives. Not in navigation. */
export default function DevRecordPage() {
  requireDevelopment()

  return <RecordDemo />
}
