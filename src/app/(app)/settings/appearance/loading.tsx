/**
 * Appearance destination skeleton: reserves the header, lead panel, and
 * the editor's two-column card geometry while workspace settings resolve.
 */
export default function AppearanceLoading() {
  const card = (h: number, key: number, lead = false) => (
    <span key={key} className="sh-shimmer" style={{ height: h, borderRadius: "var(--r2)", background: lead ? "var(--lead)" : "var(--shell)", display: "block" }} />
  )
  return (
    <div style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }} aria-busy="true">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "none", marginBottom: 4 }}>
        <span className="sh-shimmer" style={{ width: 168, height: 10, borderRadius: 4, background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 300, height: 26, borderRadius: 8, background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 420, height: 11, borderRadius: 4, background: "var(--shell)", display: "block" }} />
      </div>
      {card(170, 0, true)}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 14, alignItems: "start", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>{[150, 260, 210, 160].map((h, i) => card(h, i))}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>{[280, 170, 200].map((h, i) => card(h, i, i === 0))}</div>
      </div>
    </div>
  )
}
