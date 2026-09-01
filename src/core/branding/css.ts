import { resolveSkin } from "./derive"
import type { ProductGeometry, SkinInput, SkinTokens } from "./types"

/** Serializes resolved tokens into CSS declarations. */
export function tokensToDeclarations(tokens: SkinTokens): string {
  return Object.entries(tokens)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ")
}

/**
 * Full skin stylesheet for a brand: light and dark as peer palettes,
 * rendered server-side so the first paint is already correct (no flash).
 *
 * Theme states:
 * - default: system preference via `prefers-color-scheme`
 * - explicit: `data-theme="light" | "dark"` on <html> wins in both
 *   directions (the future theme toggle sets this attribute)
 */
export function skinStylesheet(input: SkinInput, geometry?: ProductGeometry): string {
  const light = tokensToDeclarations(resolveSkin(input, "light", geometry))
  const dark = tokensToDeclarations(resolveSkin(input, "dark", geometry))

  return [
    `:root { ${light} }`,
    `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${dark} } }`,
    `:root[data-theme="dark"] { ${dark} }`,
  ].join("\n")
}
