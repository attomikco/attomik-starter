import Link from "next/link"
import { getCopy } from "@/core/i18n/server"
import { requireModule } from "@/core/modules"
import { requireWorkspace } from "@/core/workspace"

/**
 * Overview — the neutral starter landing. Real modules replace this with
 * their own dashboards; until then it orients a fresh workspace without
 * inventing fake data. Copy comes from the shell dictionary (`overview`).
 */
export default async function OverviewPage() {
  requireModule("overview")
  const [{ workspace, settings }, copy] = await Promise.all([requireWorkspace(), getCopy()])

  const links = (["appearance", "team", "activity"] as const).map((key) => ({
    href: `/settings/${key}`,
    ...copy.overview.links[key],
  }))

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }}>{copy.overview.eyebrow}</div>
      <h1 style={{ fontSize: 28, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.035em", margin: "6px 0 8px" }}>
        {settings.display_name || workspace.name}
      </h1>
      <p style={{ fontSize: 14.5, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 24px", maxWidth: 560 }}>
        {copy.overview.intro}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, maxWidth: 900 }}>
        {links.map(({ title, href, body }) => (
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
