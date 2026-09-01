import type { Metadata } from "next"
import type { ReactNode } from "react"
import { projectConfig } from "@/config/project"
import { defaultSkin, skinStylesheet } from "@/core/branding"

export const metadata: Metadata = {
  title: projectConfig.name,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "var(--bg)",
          color: "var(--txt)",
          fontFamily: "var(--font)",
        }}
      >
        {/* Server-resolved skin: correct palette on first paint, both themes. */}
        <style dangerouslySetInnerHTML={{ __html: skinStylesheet(defaultSkin) }} />
        {children}
      </body>
    </html>
  )
}
