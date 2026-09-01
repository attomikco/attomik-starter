import Link from "next/link"
import { requireModule } from "@/core/modules"
import { requireWorkspace } from "@/core/workspace"

/**
 * Overview — the neutral starter landing. Real modules replace this with
 * their own dashboards; until then it orients a fresh workspace without
 * inventing fake data.
 */
export default async function OverviewPage() {
  requireModule("overview")
  const { workspace, settings } = await requireWorkspace()

  const links: [string, string, string][] = [
    ["Appearance & brand", "/settings/appearance", "Set the accent, typefaces, logo, and default appearance."],
    ["Team & permissions", "/settings/team", "Invite people and manage their roles."],
    ["Activity", "/settings/activity", "See who changed what, and when."],
  ]

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }}>Workspace</div>
      <h1 style={{ fontSize: 28, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.035em", margin: "6px 0 8px" }}>
        {settings.display_name || workspace.name}
      </h1>
      <p style={{ fontSize: 14.5, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 24px", maxWidth: 560 }}>
        This workspace is ready. Product modules appear here as they are enabled in the project configuration.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, maxWidth: 900 }}>
        {links.map(([title, href, body]) => (
          <Link key={href} href={href} className="sh-row-hover"
            style={{ display: "block", background: "var(--shell)", borderRadius: "var(--r2)", padding: 20, textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 15, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.015em", marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.5 }}>{body}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
