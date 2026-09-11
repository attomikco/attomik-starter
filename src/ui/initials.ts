// Relative .ts import keeps this module runnable under `node --test`.

/**
 * Two-letter person-name initials: the first letter of the first word plus
 * the first letter of the last word ("Pablo Rivera" -> PR, "Juan Carlos
 * Pérez" -> JP, never a middle word) — a single word falls back to its own
 * first two letters ("Ale" -> AL). The one place this is computed; any
 * avatar/disc that derives initials from a person's name reads through
 * this, never its own slice/split.
 */
export function nameInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ""
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
