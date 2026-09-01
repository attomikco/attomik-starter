import { requireModule } from "@/core/modules"

export default function OverviewPage() {
  requireModule("overview")

  return (
    <div style={{ padding: 26 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em" }}>Overview</h1>
      <p style={{ color: "var(--txt-2)", fontSize: 14 }}>Placeholder — the real overview ports in a later task.</p>
    </div>
  )
}
