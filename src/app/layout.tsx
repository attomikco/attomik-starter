import type { Metadata } from "next"
import type { ReactNode } from "react"
import { projectConfig } from "@/config/project"
import { LocaleProvider } from "@/core/i18n/client"
import { getLocale } from "@/core/i18n/server"
import { defaultSkin, skinStylesheet } from "@/core/branding"

export const metadata: Metadata = {
  title: projectConfig.name,
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The active locale is resolved once per request (profile → workspace
  // default → project default) and applied server-first: <html lang> and
  // the provider every client component reads copy through.
  const locale = await getLocale()

  // suppressHydrationWarning is scoped to <html> only: the pre-paint theme
  // resolver necessarily sets data-theme before hydration, and the server
  // cannot know the browser's prefers-color-scheme or localStorage. This is
  // the one sanctioned attribute mismatch; children are still verified.
  return (
    <html lang={locale} suppressHydrationWarning>
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
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  )
}
