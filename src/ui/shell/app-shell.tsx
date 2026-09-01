import Link from "next/link"
import type { ReactNode } from "react"
import { projectConfig } from "@/config/project"
import { getEnabledNavigation } from "@/core/navigation"

/**
 * Structural app shell for Task 001. Navigation is generated from the module
 * registry — no hardcoded entries. The real design system replaces the inline
 * styles in a later task.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const navigation = getEnabledNavigation()

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <aside
        style={{
          width: 244,
          flexShrink: 0,
          borderRight: "1px solid #ddd",
          padding: "16px 12px",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 24, padding: "0 8px" }}>
          {projectConfig.name}
        </div>

        <nav>
          {navigation.map(({ group, items }) => (
            <div key={group} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  opacity: 0.6,
                  padding: "0 8px",
                  marginBottom: 6,
                }}
              >
                {group}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {items.map((item) => (
                  <li key={item.moduleId}>
                    <Link
                      href={item.href}
                      style={{
                        display: "block",
                        padding: "6px 8px",
                        borderRadius: 6,
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  )
}
