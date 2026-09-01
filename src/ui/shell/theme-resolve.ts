/**
 * The canonical theme resolution chain. Pure and node-tested; the
 * ThemeProvider, the pre-paint script, and the Appearance preview all
 * follow exactly this logic:
 *
 *   preference = user's local toggle (light|dark) ?? workspace default
 *   resolved   = preference === "system" ? OS prefers-color-scheme : preference
 *
 * The PREFERENCE persists as light|dark|system (localStorage for the local
 * toggle, workspace_settings.default_appearance for the workspace);
 * "system" is never rewritten to a concrete theme. Only the RESOLVED value
 * (light|dark) is applied to <html data-theme>.
 */

export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

/** Local toggle wins when explicit; "system" defers to the workspace. */
export function effectivePreference(
  local: ThemePreference,
  workspaceDefault: ThemePreference,
): ThemePreference {
  return local === "system" ? workspaceDefault : local
}

export function resolveTheme(
  local: ThemePreference,
  workspaceDefault: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  const pref = effectivePreference(local, workspaceDefault)
  if (pref === "system") return systemPrefersDark ? "dark" : "light"
  return pref
}
