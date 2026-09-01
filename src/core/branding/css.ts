import { resolveSkin } from "./derive.ts"
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
  return skinStylesheetWithDefault(input, "system", geometry)
}

/**
 * Skin stylesheet honoring a workspace's default appearance as the
 * no-explicit-choice baseline. An explicit `data-theme` on <html> (the
 * user's toggle) always wins; "system" defers to prefers-color-scheme.
 * Selector specificity is kept at 0-1-1 so a later stylesheet of the same
 * shape (the workspace override injected by the app layout) beats the
 * base-skin stylesheet from the root layout.
 */
export function skinStylesheetWithDefault(
  input: SkinInput,
  defaultAppearance: "light" | "dark" | "system",
  geometry?: ProductGeometry,
): string {
  return themedDeclarations(
    defaultAppearance,
    tokensToDeclarations(resolveSkin(input, "light", geometry)),
    tokensToDeclarations(resolveSkin(input, "dark", geometry)),
  )
}

/** Wraps light/dark declaration strings in the theme-state selectors. */
export function themedDeclarations(
  defaultAppearance: "light" | "dark" | "system",
  light: string,
  dark: string,
): string {
  if (defaultAppearance === "light") {
    return [
      `:root:not([data-theme="dark"]) { ${light} }`,
      `:root[data-theme="dark"] { ${dark} }`,
    ].join("\n")
  }
  if (defaultAppearance === "dark") {
    return [
      `:root:not([data-theme="light"]) { ${dark} }`,
      `:root[data-theme="light"] { ${light} }`,
    ].join("\n")
  }
  return [
    `:root:not([data-theme="dark"]) { ${light} }`,
    `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${dark} } }`,
    `:root[data-theme="dark"] { ${dark} }`,
  ].join("\n")
}
