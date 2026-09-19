import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * A small workspace for the mobile layout pass: feedback rows (one with a
 * 1,500-character comment and a long resolution note) so long text shows up in
 * the tables that render it. Service-role inserts into the LOCAL e2e database
 * only (the admin client comes from resolveE2eTarget(), which refuses anything
 * that is not loopback). loginAsNewUser()'s cleanup removes the workspace and
 * everything below with it.
 *
 * The starter ships almost no data of its own: a project adds its module tables
 * here so its list and record routes render real content at 390px.
 */

export interface SeedIds {
  feedbackId: string
}

type Row = Record<string, unknown>

export async function seedWorkspace(admin: SupabaseClient, workspaceId: string, userId: string): Promise<SeedIds> {
  const insert = async (table: string, rows: Row[]): Promise<Row[]> => {
    const { data, error } = await admin.from(table).insert(rows.map((r) => ({ workspace_id: workspaceId, ...r })), { defaultToNull: false }).select()
    if (error) throw new Error(`seed ${table}: ${error.message}`)
    return (data ?? []) as Row[]
  }

  const long = "Necesito que la tabla permita filtrar por dos criterios a la vez y que el resumen no se corte en pantallas pequeñas. ".repeat(14).slice(0, 1500)
  const base = { user_id: userId, user_agent: "e2e", viewport_w: 390, viewport_h: 844 }
  const feedback = await insert("feedback", [
    { ...base, type: "idea", message: "Comentario corto de prueba.", route: "/" },
    { ...base, type: "broken", message: long, route: "/settings/general" },
    { ...base, type: "unclear", message: "Otro comentario ya resuelto.", route: "/settings/team" },
  ])
  await insert("feedback_resolutions", [{ feedback_id: feedback[2].id, resolved_by: userId, resolution_note: long, notified_user_ids: [userId] }])
  return { feedbackId: feedback[0].id as string }
}
