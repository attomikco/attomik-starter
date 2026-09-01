/** Pure predicate for the dev-tooling gate (node-testable). */
export function devToolsEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production"
}
