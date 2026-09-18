const PAGE_SIZE = 1000

type Page<T> = { data: T[] | null; error: { message: string } | null }
type Pageable<T> = { range: (from: number, to: number) => PromiseLike<Page<T>> }

/**
 * Supabase/PostgREST caps a plain select at 1,000 rows — silently, with no
 * error and no signal in the response. Any unranged read of a table that
 * can grow past that (an audit log, an import resolver's reference table, a
 * list screen backing a filter/export) would see an arbitrary truncated
 * slice instead of the whole table once a workspace crosses it. This pages
 * with `.range()` until a page comes back short of PAGE_SIZE, so the
 * caller always gets every row.
 *
 * ALWAYS order the query (by a unique column, or a tie-break that ends in one):
 * pages are separate requests, and without a stable order Postgres may skip or
 * repeat a row across a page boundary. Its `.range()` also sends the explicit
 * `limit` that the runtime row-cap guard (row-cap-guard.ts, on the shared
 * Supabase clients) treats as "these rows were asked for".
 *
 * `buildQuery` must return a FRESH query each call (e.g. a closure over
 * `supabase.from(...).select(...).eq(...)`), not a query already awaited —
 * `.range()` is applied to each page's query independently.
 */
export async function fetchAllRows<T>(buildQuery: () => Pageable<T>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}
