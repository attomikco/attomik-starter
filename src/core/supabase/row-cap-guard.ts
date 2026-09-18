/**
 * Runtime guard for PostgREST's 1,000-row cap.
 *
 * A plain select returns at most 1,000 rows and says nothing about the rest:
 * no error, no flag. Code that treats such a result as "all the rows" is
 * silently wrong. The canonical fix is to page with `fetchAllRows`
 * (src/core/supabase/paginate.ts), which sends an explicit `limit`/`offset`;
 * a caller who really wants N rows sends `.limit(N)`.
 *
 * So a READ that comes back with exactly 1,000 rows and carried NO `limit`
 * param is a truncated result nobody asked for, and this catches it on the
 * shared clients (server.ts and client.ts) at the moment it happens:
 *
 *   development / test   throws, so it cannot be missed
 *   production           logs a warning with the query and returns the rows
 *                        (a user-facing page must not break over it)
 *
 * It fires only when the data actually reaches the cap — the reads it cannot
 * see are the ones that have not grown into it yet. A table that happens to
 * hold exactly 1,000 rows is a false positive; the message says how to
 * silence it (page the read or `.limit()` it), which is the right change anyway.
 *
 * Pure of Next and of Supabase types (a Proxy over whatever client it is
 * given), relative imports only, so it runs under `node --test`.
 */

/** PostgREST's default `max-rows`: the most a request without a limit returns. */
export const ROW_CAP = 1000

export type RowCapMode = "throw" | "warn"

/** Warn in production, throw everywhere else (development, test, scripts). */
export function rowCapModeFor(nodeEnv: string | undefined): RowCapMode {
  return nodeEnv === "production" ? "warn" : "throw"
}

const isRead = (method: string, path: string) => method === "GET" || (method === "POST" && path.includes("/rest/v1/rpc/"))

/**
 * The problem with a finished request, or null when it is fine. Fine means:
 * not a read (writes are not capped), an error, not exactly ROW_CAP rows, or
 * an explicit `limit` on the request (what `.range()`, `.limit()` and
 * `fetchAllRows` all set).
 */
export function assessRowCap(input: { method: string; url: URL; data: unknown; error?: unknown }): string | null {
  if (input.error || !isRead(input.method, input.url.pathname)) return null
  if (!Array.isArray(input.data) || input.data.length !== ROW_CAP) return null
  if (input.url.searchParams.has("limit")) return null
  const query = `${input.method} ${input.url.pathname.replace("/rest/v1/", "")}${input.url.search}`
  return (
    `Row cap: a read returned exactly ${ROW_CAP} rows with no limit or range. PostgREST truncates a plain select at ${ROW_CAP} rows ` +
    `without any error, so this result is probably incomplete. Page it with fetchAllRows (src/core/supabase/paginate.ts) ` +
    `or bound it with .limit(). Query: ${query.length > 400 ? `${query.slice(0, 400)}…` : query}`
  )
}

type Thenable = { then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => PromiseLike<unknown> }
type BuilderLike = Thenable & { url?: URL; method?: string }

const isThenable = (value: unknown): value is BuilderLike =>
  typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function"

function guardBuilder<B extends object>(builder: B, mode: RowCapMode, warn: (message: string) => void): B {
  const target = builder as unknown as BuilderLike
  const inspect = (result: unknown) => {
    const r = result as { data?: unknown; error?: unknown } | null
    const problem = target.url ? assessRowCap({ method: target.method ?? "GET", url: target.url, data: r?.data, error: r?.error }) : null
    if (problem) {
      if (mode === "throw") throw new Error(problem)
      warn(problem)
    }
    return result
  }
  const proxy: B = new Proxy(builder, {
    get(t, prop) {
      // Awaiting the builder runs the request; check what comes back.
      if (prop === "then") {
        return (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => Promise.resolve(target.then(inspect)).then(onFulfilled, onRejected)
      }
      const value = Reflect.get(t, prop, t)
      if (typeof value !== "function") return value
      // Chained calls (.eq, .order, .range, .select …) hand back a builder: keep guarding it.
      return (...args: unknown[]) => {
        const out = value.apply(t, args)
        return isThenable(out) ? guardBuilder(out as object, mode, warn) : out
      }
    },
  })
  return proxy
}

/**
 * Wraps a Supabase client so every `from(...)`, `rpc(...)` and `schema(...)`
 * read is checked (see the file header). Everything else on the client
 * (`auth`, `storage`, …) passes through untouched.
 */
export function guardRowCap<C extends object>(client: C, options: { mode?: RowCapMode; warn?: (message: string) => void } = {}): C {
  const mode = options.mode ?? rowCapModeFor(process.env.NODE_ENV)
  const warn = options.warn ?? ((message: string) => console.warn(`[supabase] ${message}`))
  return new Proxy(client, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target)
      if (prop === "from" || prop === "rpc") {
        return (...args: unknown[]) => guardBuilder((value as (...a: unknown[]) => object).apply(target, args), mode, warn)
      }
      if (prop === "schema") {
        return (...args: unknown[]) => guardRowCap((value as (...a: unknown[]) => object).apply(target, args), { mode, warn })
      }
      return value
    },
  })
}
