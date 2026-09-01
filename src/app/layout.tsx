import type { Metadata } from "next"
import type { ReactNode } from "react"
import { projectConfig } from "@/config/project"

export const metadata: Metadata = {
  title: projectConfig.name,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
