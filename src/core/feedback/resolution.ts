/**
 * Pure rules for resolving feedback (no I/O, relative imports only, so it
 * runs under `node --test`). Resolution itself is a row in
 * `feedback_resolutions` — see supabase/migrations/20260918211707_feedback_resolutions.sql.
 */

/** Mirrors the `resolution_note` check constraint. */
export const RESOLUTION_NOTE_MAX = 2000

/** How much of the feedback text leads the email subject. */
export const SUBJECT_SNIPPET_LENGTH = 60

/**
 * The first 60 characters of a feedback message, for the email subject.
 * Whitespace (including newlines) collapses to single spaces so the subject
 * stays one line; counted in code points so an emoji is never cut in half.
 */
export function feedbackSnippet(message: string): string {
  const flat = message.replace(/\s+/g, " ").trim()
  return Array.from(flat).slice(0, SUBJECT_SNIPPET_LENGTH).join("").trimEnd()
}

/** Blank notes are stored as null, never as an empty string. */
export function normalizeNote(raw: string | null | undefined): string | null {
  const note = (raw ?? "").trim()
  return note ? note : null
}

export interface RecipientCandidate {
  userId: string
  email: string
  displayName: string | null
}

/**
 * Who actually gets notified: the selected ids that are current members
 * WITH an email, de-duplicated, in member order. An id that is not a member
 * (stale checkbox, forged request) is dropped rather than trusted — the
 * `notified_user_ids` array cannot carry a foreign key, so this is the
 * only place that keeps it honest.
 */
export function resolveRecipients(members: readonly RecipientCandidate[], selectedIds: readonly string[]): RecipientCandidate[] {
  const wanted = new Set(selectedIds)
  const seen = new Set<string>()
  const out: RecipientCandidate[] = []
  for (const m of members) {
    if (!wanted.has(m.userId) || !m.email || seen.has(m.userId)) continue
    seen.add(m.userId)
    out.push(m)
  }
  return out
}

/**
 * "Ana García (ana@example.com)"; just the name or just the email when only
 * one is known; "" when neither is (a member with no profile row yet), so
 * the caller can substitute its own "unknown" wording.
 */
export function personLabel(person: { displayName: string | null; email: string }): string {
  const name = person.displayName?.trim()
  const email = person.email?.trim()
  if (name && email) return `${name} (${email})`
  return name || email || ""
}
