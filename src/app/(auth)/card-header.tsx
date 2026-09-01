/** Shared card header: logo slot + step label (identical across states). */
export function AuthCardHeader({ stepLabel }: { stepLabel: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flex: "none" }}>
      <span style={{ height: 34, width: "100%", maxWidth: 176, border: "1px dashed var(--line-2)", borderRadius: "var(--r3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxSizing: "border-box" }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--line-2)", display: "block", flex: "none" }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--txt-4)" }}>Logo</span>
      </span>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)" }}>{stepLabel}</span>
    </div>
  )
}
