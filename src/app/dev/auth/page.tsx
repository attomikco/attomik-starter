/**
 * Development review of the four auth states, side by side. End users never
 * see this — the auth routes themselves carry no switcher. Not linked from
 * any navigation.
 */
const STATES: [label: string, src: string][] = [
  ["Entry", "/login"],
  ["Sent", "/login?state=sent"],
  ["Verifying", "/verify"],
  ["Expired", "/expired"],
]

export default function DevAuthPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: 20, boxSizing: "border-box", fontFamily: "var(--font)", color: "var(--txt)" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: "var(--w-bold)" as never }}>Auth states review</h1>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--txt-2)" }}>Entry · Sent · Verifying · Expired, rendered live from their routes.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 16 }}>
        {STATES.map(([label, src]) => (
          <div key={label} style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 6 }}>{label}</div>
            <iframe src={src} title={label} style={{ width: "100%", height: 780, border: "1px solid var(--line-2)", borderRadius: "var(--r2)", background: "var(--shell)" }} />
          </div>
        ))}
      </div>
    </main>
  )
}
