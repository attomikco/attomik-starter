import type { Metadata } from "next"
import type { CSSProperties, ReactNode } from "react"
import { resolveSkin } from "@/core/branding"
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
  const tokens = resolveSkin(branding.skin, branding.mode, branding.geometry) as CSSProperties

  return (
    <div
      className="sh-scroll"
      style={{ ...tokens, colorScheme: branding.mode, color: "var(--txt)", width: "100%", minHeight: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--shell)", padding: "26px 16px", gap: 4 }}
    >
      <div style={{ background: "var(--card)", borderRadius: "var(--r)", padding: 40, boxSizing: "border-box", width: "100%", maxWidth: 520, minHeight: 640, flex: "none", display: "flex", flexDirection: "column", gap: 4 }}>
        <AuthBrandingProvider value={{ name: branding.name, logoUrl: branding.logoUrl }}>
          {children}
        </AuthBrandingProvider>
      </div>

      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap", padding: "14px 0 4px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-4)" }}>
        <span>Single-use link</span>
        <span style={{ color: "var(--line-2)" }}>·</span>
        <span>Expires in 15 min</span>
        <span style={{ color: "var(--line-2)" }}>·</span>
        <span>Session 30 days</span>
        <span style={{ color: "var(--line-2)" }}>·</span>
        <span>Every sign-in logged</span>
      </div>
    </div>
  )
}
