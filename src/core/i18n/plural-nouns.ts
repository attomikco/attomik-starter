/**
 * Count nouns the starter renders, in their plural form, in both locales.
 * Two rules use them: the runtime audit fails on "1 <plural>" in visible
 * text, and the static test fails on a raw plural built next to a count in
 * source. A list, not `\w+s`: "1 mes" and "1 lunes" are correct Spanish and
 * "1 status" is correct English. A project extends this list with its own
 * domain nouns.
 */
export const PLURAL_NOUNS = [
  // en
  "members", "admins", "invitations", "people", "persons", "items", "rows", "columns", "records", "files", "days", "characters", "changes", "notes", "comments", "results", "options", "values",
  // es-MX
  "miembros", "administradores", "invitaciones", "personas", "elementos", "filas", "columnas", "registros", "archivos", "días", "caracteres", "cambios", "notas", "comentarios", "resultados", "opciones", "valores",
] as const

/** "1 members" / "1 miembros" anywhere in a text: a count of one followed by a plural from the list. */
export const ONE_PLURAL_RE = new RegExp(`(?:^|[^\\d.,])1\\s+(?:${PLURAL_NOUNS.join("|")})\\b`, "u")

/** Raw markdown markers that must never reach rendered text. */
export const MARKDOWN_RE = /\*\*[^*]+\*\*|(?:^|\n)\s*#{1,6}\s+\S|`[^`\n]+`/u
