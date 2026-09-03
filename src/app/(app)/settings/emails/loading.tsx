/**
 * Emails destination skeleton: reserves the template list, the preview
 * stage, and the meta column while the server renders every template.
 */
export default function EmailsLoading() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }} aria-busy="true">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "none" }}>
        <span className="sh-shimmer" style={{ width: 210, height: 10, borderRadius: 4, background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 150, height: 26, borderRadius: 8, background: "var(--shell)", display: "block" }} />
        <span className="sh-shimmer" style={{ width: 420, height: 11, borderRadius: 4, background: "var(--shell)", display: "block" }} />
      </div>
      <div className="sh-workbench" style={{ flex: 1, minHeight: 0 }}>
        <span className="sh-shimmer" style={{ height: 190, borderRadius: "var(--r2)", background: "var(--shell)", display: "block" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <span className="sh-shimmer" style={{ height: 86, borderRadius: "var(--r2)", background: "var(--shell)", display: "block" }} />
          <span className="sh-shimmer" style={{ height: 460, borderRadius: "var(--r2)", background: "var(--shell)", display: "block" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {[210, 120, 260].map((h, i) => (
            <span key={i} className="sh-shimmer" style={{ height: h, borderRadius: "var(--r2)", background: "var(--shell)", display: "block" }} />
          ))}
        </div>
      </div>
    </div>
  )
}
