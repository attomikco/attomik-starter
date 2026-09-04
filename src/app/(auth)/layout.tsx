import type { Metadata } from "next"
import type { CSSProperties, ReactNode } from "react"
import { resolveSkin } from "@/core/branding"
import { getCopy } from "@/core/i18n/server"
import { getAuthBranding } from "@/core/workspace"
import { AuthBrandingProvider } from "./branding"
import "@/ui/shell/shell.css"

// Auth renders the WORKSPACE identity, server-first (no flash): skin,
// radii, logo, and name come from the intentionally public
// get_auth_branding() RPC, falling back to the neutral starter defaults on
// a fresh deployment. The ground follows the workspace's default
// appearance — light or dark; "system" renders light because the server
// cannot know the visitor's OS preference without a flash. The visitor's
// in-app theme toggle does not apply here (tokens are re-declared on this
// subtree), matching the appearance the workspace chose for first contact.

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getAuthBranding()
  return {
    title: branding.name,
    ...(branding.faviconUrl ? { icons: { icon: branding.faviconUrl } } : {}),
  }
}

/**
 * Auth frame: edge-to-edge background, the reference's sign-in card
 * centered in the viewport, security facts below it. Only the design
 * artifact's outer rounded panel was removed (Task 005.6) — the card keeps
 * its reference width, radius, padding, and spacing.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const branding = await getAuthBranding()
  const copy = await getCopy()
  const tokens = resolveSkin(branding.skin, branding.mode, branding.geometry) as CSSProperties

  return (
    // Pinned to the viewport (100dvh) and the ONLY scroll container here —
    // html/body never scroll, matching the app shell. Vertical centering
    // uses margin:auto on the group below, not justify-content:center on
    // this scrolling flex container: centering the container itself is a
    // known cross-browser bug — once content overflows, the start of that
    // overflow becomes unreachable by scroll. auto margins collapse to 0
    // instead, so a card taller than the viewport just scrolls normally.
    <div
      className="sh-scroll"
      style={{ ...tokens, colorScheme: branding.mode, color: "var(--txt)", width: "100%", height: "100dvh", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", background: "var(--shell)", padding: "26px 16px", overflowWrap: "anywhere" }}
    >
      <div style={{ margin: "auto 0", minHeight: "min-content", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ background: "var(--card)", borderRadius: "var(--r)", padding: 40, boxSizing: "border-box", width: "100%", maxWidth: 520, minHeight: 640, flex: "none", display: "flex", flexDirection: "column", gap: 4 }}>
          <AuthBrandingProvider value={{ name: branding.name, logoUrl: branding.logoUrl }}>
            {children}
          </AuthBrandingProvider>
        </div>

        <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap", padding: "14px 0 4px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-4)" }}>
          <span>{copy.auth.facts.singleUse}</span>
          <span style={{ color: "var(--line-2)" }}>·</span>
          <span>{copy.auth.facts.expires}</span>
          <span style={{ color: "var(--line-2)" }}>·</span>
          <span>{copy.auth.facts.session}</span>
          <span style={{ color: "var(--line-2)" }}>·</span>
          <span>{copy.auth.facts.logged}</span>
        </div>
      </div>
    </div>
  )
}
