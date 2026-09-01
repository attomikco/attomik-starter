/**
 * Post-login redirect safety. Only same-app paths are allowed — no external
 * URLs, protocol-relative URLs, schemes, or backslash tricks.
 */
export const DEFAULT_NEXT_PATH = "/"

export function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_NEXT_PATH
  const value = raw.trim()
  if (!value.startsWith("/")) return DEFAULT_NEXT_PATH
  if (value.startsWith("//")) return DEFAULT_NEXT_PATH
  if (value.includes("\\")) return DEFAULT_NEXT_PATH
  if (value.includes("://")) return DEFAULT_NEXT_PATH
  // Never bounce back into the auth surface itself.
  if (value === "/login" || value.startsWith("/login/") || value.startsWith("/auth/")) {
    return DEFAULT_NEXT_PATH
  }
  return value
}
