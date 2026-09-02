/**
 * Server-side diagnostics for failed writes. PostgREST errors carry a code
 * (42703 missing column, 42501 RLS, 23505 duplicate…) and a message that
 * names the object involved — safe to log, never returned to the browser.
 * A write that RLS filters to zero rows raises no error at all; callers
 * read the row back (`.select()`) and report that as a distinct failure.
 */
export interface DbFailure {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

export function logDbFailure(scope: string, failure: DbFailure | null, note?: string): void {
  if (failure) {
    console.error(`[${scope}] write failed: ${failure.code ?? "?"} ${failure.message ?? ""}${failure.hint ? ` (hint: ${failure.hint})` : ""}`)
  } else {
    console.error(`[${scope}] write affected no rows${note ? `: ${note}` : ""}`)
  }
}
