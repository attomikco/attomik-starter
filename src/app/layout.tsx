import type { Metadata } from "next"
import type { ReactNode } from "react"
import { projectConfig } from "@/config/project"
import { LocaleProvider } from "@/core/i18n/client"
import { getLocale, getTimeZone } from "@/core/i18n/server"
import { defaultSkin, skinStylesheet } from "@/core/branding"

export const metadata: Metadata = {
  title: projectConfig.name,
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The active locale is resolved once per request (profile → workspace
  // default → project default) and applied server-first: <html lang> and
  // the provider every client component reads copy through.
  const [locale, timeZone] = await Promise.all([getLocale(), getTimeZone()])

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
        {/* iOS Safari rubber-bands (and can drag the whole page sideways) when
            html/body are left as the document's default scroll container.
            Each route pins its own content to the viewport and scrolls
            internally instead (AppShellClient, the auth layout) — this is
            the shared backstop: no bounce past an edge, no horizontal
            drift from a stray wide element. */}
        <style dangerouslySetInnerHTML={{ __html: "html,body{overscroll-behavior:none;overflow-x:hidden}" }} />
        {/* Server-resolved skin: correct palette on first paint, both themes. */}
        <style dangerouslySetInnerHTML={{ __html: skinStylesheet(defaultSkin) }} />
        {/* Replays an explicit stored theme choice before paint (no flash). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("attomik-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}',
          }}
        />
        <LocaleProvider locale={locale} timeZone={timeZone}>{children}</LocaleProvider>
      </body>
    </html>
  )
}
