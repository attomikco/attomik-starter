import { requireDevelopment } from "@/core/dev"
import { ShellDemo } from "./shell-demo"

/** Development-only shell validation page. Blocked in production. */
export default function DevShellPage() {
  requireDevelopment()

  return <ShellDemo />
}
