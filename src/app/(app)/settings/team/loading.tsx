import { TableLoading } from "@/ui/data/data-states"

/**
 * Team destination skeleton: reserves the header, action, member table,
 * and roles-section geometry while the server resolves workspace + team
 * data. Renders immediately on navigation (route loading boundary).
 */
export default function TeamLoading() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }} aria-busy="true">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flex: "none" }}>
        <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="sh-shimmer" style={{ width: 132, height: 10, borderRadius: 4, background: "var(--shell)", display: "block" }} />
          <span className="sh-shimmer" style={{ width: 268, height: 26, borderRadius: 8, background: "var(--shell)", display: "block" }} />
          <span className="sh-shimmer" style={{ width: 320, height: 11, borderRadius: 4, background: "var(--shell)", display: "block" }} />
        </div>
        <span className="sh-shimmer" style={{ width: 148, height: 42, borderRadius: 999, background: "var(--lead)", display: "block", flex: "none" }} />
      </div>

      <div style={{ flex: "none", border: "1px solid var(--line)", borderRadius: "var(--r2)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", background: "var(--shell)", borderBottom: "1px solid var(--line)" }}>
          <span className="sh-shimmer" style={{ width: 74, height: 9, borderRadius: 3, background: "var(--line-2)", display: "block" }} />
          <span className="sh-shimmer" style={{ width: 52, height: 9, borderRadius: 3, background: "var(--line-2)", display: "block" }} />
          <div style={{ flex: 1 }} />
          <span className="sh-shimmer" style={{ width: 60, height: 9, borderRadius: 3, background: "var(--line-2)", display: "block" }} />
        </div>
        <TableLoading rowCount={4} />
      </div>

      <div className="sh-shimmer" style={{ flex: "none", height: 148, borderRadius: "var(--r2)", background: "var(--shell)" }} />
    </div>
  )
}
