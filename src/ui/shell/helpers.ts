/**
 * Pure shell logic, kept dependency-free so it runs under `node --test`.
 */

/** Active nav derives from the route: exact for "/", prefix for others. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

/** Reference rule: shortcuts are off while a text field has focus, except Escape. */
export function isTypingTarget(tagName: string, isContentEditable: boolean): boolean {
  const tag = tagName.toUpperCase()
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || isContentEditable
}

export interface PaletteItem {
  label: string
  hint?: string
  run: () => void
}

export interface PaletteGroup {
  label: string
  items: PaletteItem[]
}

/** Reference filter: case-insensitive substring on the label; empty groups drop. */
export function filterPaletteGroups(groups: PaletteGroup[], query: string): PaletteGroup[] {
  const q = query.trim().toLowerCase()
  return groups
    .map((g) => ({
      label: g.label,
      items: g.items.filter((i) => !q || i.label.toLowerCase().indexOf(q) >= 0),
    }))
    .filter((g) => g.items.length > 0)
}

/**
 * G-then-letter jump map from the reference host, expressed as module ids and
 * filtered to what is actually enabled and routed in this project.
 */
export const GO_LETTERS: Record<string, string> = {
  o: "overview",
  r: "orders",
  p: "approvals",
  m: "messages",
  a: "assistant",
}

export function buildGoMap(
  navItems: { moduleId: string; href: string; label: string }[],
): Record<string, { href: string; label: string }> {
  const byModule = new Map(navItems.map((i) => [i.moduleId, i]))
  const map: Record<string, { href: string; label: string }> = {}
  for (const [letter, moduleId] of Object.entries(GO_LETTERS)) {
    const item = byModule.get(moduleId)
    if (item) map[letter] = { href: item.href, label: item.label }
  }
  return map
}
