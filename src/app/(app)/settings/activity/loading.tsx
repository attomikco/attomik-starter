import { TableLoading } from "@/ui/data/data-states"

/** Activity destination skeleton (route loading boundary). */
export default function ActivityLoading() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }} aria-busy="true">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "none" }}>
        <span className="sh-shimmer" style={{ width: 128, height: 10, borderRadius: 4, background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 180, height: 26, borderRadius: 8, background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 340, height: 11, borderRadius: 4, background: "var(--shell)", display: "block" }} />
      </div>
      <div style={{ display: "flex", gap: 10, flex: "none" }}>
        <span className="sh-shimmer" style={{ width: 220, height: 36, borderRadius: "var(--r3)", background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 150, height: 36, borderRadius: "var(--r3)", background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 150, height: 36, borderRadius: "var(--r3)", background: "var(--shell)", display: "block" }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, border: "1px solid var(--line)", borderRadius: "var(--r2)", overflow: "hidden" }}>
        <TableLoading rowCount={8} />
      </div>
    </div>
  )
}
