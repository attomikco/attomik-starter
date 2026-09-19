import { TableLoading } from "@/ui/data/data-states"

/** Feedback destination skeleton (route loading boundary). */
export default function FeedbackLoading() {
  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }} aria-busy="true">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "none" }}>
        <span className="sh-shimmer" style={{ width: 128, height: 10, borderRadius: 4, background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 180, height: 26, borderRadius: 8, background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 340, height: 11, borderRadius: 4, background: "var(--shell)", display: "block" }} />
      </div>
      <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r2)", overflow: "hidden" }}>
        <TableLoading rowCount={8} />
      </div>
    </div>
  )
}
