/** Generic app-route skeleton: reserves header + content geometry. */
export default function AppLoading() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }} aria-busy="true">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "none" }}>
        <span className="sh-shimmer" style={{ width: 140, height: 10, borderRadius: 4, background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 260, height: 26, borderRadius: 8, background: "var(--shell)", display: "block" }} />
      </div>
      <span className="sh-shimmer" style={{ flex: "none", height: 140, borderRadius: "var(--r2)", background: "var(--shell)", display: "block" }} />
      <span className="sh-shimmer" style={{ flex: "none", height: 220, borderRadius: "var(--r2)", background: "var(--shell)", display: "block" }} />
    </div>
  )
}
