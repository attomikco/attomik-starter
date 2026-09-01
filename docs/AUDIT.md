# Activity / audit

One canonical event model: `activity_events` — workspace-scoped,
append-only, generic (no customer/order semantics baked in).

## Schema

`id · workspace_id · actor_user_id (nullable → System/former member) ·
action · resource_type · resource_id · resource_label · metadata jsonb ·
before_data / after_data jsonb · created_at`, indexed on
(workspace_id, created_at desc), (workspace_id, action), and
(workspace_id, resource_type).

## Event naming

Dot-separated lowercase snake segments, verb last:
`workspace.settings.updated`, `workspace.member.role_changed`,
`workspace.invitation.revoked`, future `media.file.uploaded`. The database
enforces `^[a-z0-9_]+(\.[a-z0-9_]+)+$` for custom events;
`isValidActionName` in `src/core/audit/summaries.ts` mirrors it.

## Write model — how events get in

1. **Database triggers** (the critical paths): workspace creation,
   settings/branding updates (changed canonical fields only, split into
   `settings.updated` vs `branding.updated`), member added/role_changed/
   removed, invitation created/resent/revoked/accepted. Triggers run in the
   SAME TRANSACTION as the mutation — audit and mutation cannot diverge —
   and there is no client insert path at all, so rows cannot be forged.
   Actor is `auth.uid()` at mutation time (null for service/system paths).
2. **`recordActivity()`** (`src/core/audit`) for future module events that
   are not table-shaped. It wraps the `record_activity` RPC: actor is
   FORCED to the verified caller (never a parameter), **member rank or
   above is enforced** (viewers are read-only and never author events —
   `canRecordActivity()` in `src/core/permissions` mirrors the rule for
   UI), the action name is validated. Best-effort by default
   (failure logged, mutation proceeds); pass `required: true` when a module
   decides its mutation must not proceed unaudited. This is the documented
   failure-semantics rule.

Never write secrets, tokens, credentials, or raw auth material into any
event field — the invitation triggers deliberately never touch
`token_hash`.

## Diffs

`before_data`/`after_data` hold only the changed fields (e.g. role change:
`{role: "viewer"} → {role: "member"}`; settings: just the edited columns).
No full-row snapshots.

## RLS / immutability

Members SELECT their workspaces' events (`private.is_workspace_member`).
There are NO insert/update/delete policies for regular roles — append-only,
verified live (owner's direct insert → 403; update/delete → zero rows).
The trigger functions and RPC follow the hardened SECURITY DEFINER pattern
(private schema for triggers, pinned search_path, explicit checks;
`record_activity` is intentionally RPC-exposed — accepted advisor warning).

## Rendering

The database stores structured machine events; prose is rendered centrally
by `summarizeEvent(event, actor, copy.audit)` — "pablo changed ana's role
from viewer to member", never `workspace.member.role_changed` in the UI.
The words come from the project locale (`src/core/i18n`, docs/SHELL.md
§Locale); the summarizer itself stays pure. Unknown module actions use the
locale's `fallback`: English reads the identifier as words
("media file uploaded"), es-MX shows the identifier as-is, since English
identifier words are not Spanish prose. Verb chips and tones come from
`eventVerb`/`eventTone` (red = destructive only). Actor identity uses the
co-member profile visibility model; null actors render as System.

## Activity page

`/settings/activity` (registry-driven settings subnav): Task 007 DataTable
+ SearchInput + pagination, with a right-side detail drawer (what changed
before→after, metadata, context). Search, action/actor filters and
pagination are SERVER-SIDE — the URL carries the query; the full history is
never loaded client-side.

## Retention

The starter retains audit events indefinitely; projects override this
themselves (no purge/retention jobs exist, and no regulatory/compliance
retention is claimed).
