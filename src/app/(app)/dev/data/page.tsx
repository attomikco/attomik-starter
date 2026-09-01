import { requireDevelopment } from "@/core/dev"
import { ItemsDemo } from "./items-demo"

/** Development-only demo of the canonical data primitives. Not in navigation. */
export default function DevDataPage() {
  requireDevelopment()

  return <ItemsDemo />
}
