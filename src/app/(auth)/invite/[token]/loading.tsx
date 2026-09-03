/** Invitation card skeleton while the preview RPC resolves. */
export default function InviteLoading() {
  return (
    <div style={{ padding: "26px 0 4px" }} aria-busy="true">
      <span className="sh-shimmer" style={{ width: 52, height: 52, borderRadius: "var(--r3)", background: "var(--shell)", display: "block", margin: "0 auto 22px" }} />
      <span className="sh-shimmer" style={{ width: "70%", height: 30, borderRadius: 8, background: "var(--shell)", display: "block", margin: "0 auto 14px" }} />
      <span className="sh-shimmer" style={{ width: "90%", height: 12, borderRadius: 4, background: "var(--shell)", display: "block", margin: "0 auto 26px" }} />
      <span className="sh-shimmer" style={{ width: "100%", height: 50, borderRadius: 999, background: "var(--shell)", display: "block" }} />
    </div>
  )
}
