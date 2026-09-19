/**
 * Canonical feedback types, mirroring the `feedback.type` check constraint
 * (supabase/migrations/20260914215102_feedback_capture.sql). English
 * identifiers in code and the database; on-screen labels live in
 * `copy.feedback.types` (core/i18n) for every locale.
 */
export const FEEDBACK_TYPES = ["broken", "unclear", "should_change", "idea"] as const

export type FeedbackType = (typeof FEEDBACK_TYPES)[number]

export interface FeedbackRow {
  id: string
  workspaceId: string
  userId: string
  type: FeedbackType
  message: string
  route: string
  userAgent: string
  viewportW: number
  viewportH: number
  createdAt: string
}

/**
 * A resolution, as read from `feedback_resolutions`. "Resolved" is derived
 * from a row existing for the feedback id — there is no status column.
 * `resolvedBy` is null once the resolver's account is gone.
 */
export interface FeedbackResolutionRow {
  feedbackId: string
  resolvedBy: string | null
  note: string | null
  /** Who the resolver chose to notify — intent, not a delivery receipt. */
  notifiedUserIds: string[]
  createdAt: string
}
