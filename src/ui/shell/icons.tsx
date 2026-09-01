/**
 * Navigation icon paths, verbatim from design-reference/Starter Admin.dc.html
 * (navItem definitions). Keys match the `icon` strings in the module
 * registry. 24×24 viewBox, stroke-based, rendered at 17px in the rail.
 */
export const ICON_PATHS: Record<string, string> = {
  overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  analytics: "M4 21v-7M12 21V10M20 21v-5M1 14h6M9 10h6M17 16h6",
  orders: "M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM9 13h6M9 17h4",
  customers: "M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8",
  approvals: "m5 13 5 5L20 7",
  schedule: "M3 4h18v18H3zM3 10h18M8 2v4M16 2v4",
  inbox: "M3 5h18v14H3zM3 5l9 7 9-7",
  messages: "M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z",
  assistant: "M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2",
  wizard: "M4 6h16M4 12h10M4 18h7",
  import: "M12 16V4M7 9l5-5 5 5M4 20h16",
  media: "M3 4h18v16H3zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4M3 16l5-4 4 3 3-2 6 5",
  states: "M12 3a9 9 0 1 0 9 9M12 8v5M12 16h.01",
  settings:
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
}

export function NavIcon({ icon, stroke, size = 17 }: { icon: string; stroke: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none" }}
    >
      <path d={ICON_PATHS[icon] ?? ICON_PATHS.overview} />
    </svg>
  )
}
