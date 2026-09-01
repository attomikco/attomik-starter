import type { Metadata } from "next"
import type { ReactNode } from "react"
import { projectConfig } from "@/config/project"
import { defaultSkin, skinStylesheet } from "@/core/branding"

export const metadata: Metadata = {
  title: projectConfig.name,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // suppressHydrationWarning is scoped to <html> only: the pre-paint theme
  // resolver necessarily sets data-theme before hydration, and the server
  // cannot know the browser's prefers-color-scheme or localStorage. This is
  // the one sanctioned attribute mismatch; children are still verified.
  return (
    <html lang="en" suppressHydrationWarning>
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
        {/* Replays an explicit stored theme choice before paint (no flash). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("attomik-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}',
          }}
        />
        {children}
      </body>
    </html>
  )
}
