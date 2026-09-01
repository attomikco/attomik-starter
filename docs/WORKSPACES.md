# Workspaces

All product data belongs to a workspace unless explicitly global.

## Schema (supabase/migrations)

- `profiles` — one row per auth user (email, optional display name/avatar).
  Never used for authorization.
- `workspaces` — id, name, unique slug, created_by.
- `workspace_members` — (workspace_id, user_id, role). Roles: `owner`,
  `admin`, `member`, `viewer`. This table is the ONLY source of
  authorization roles — never user_metadata.
- `workspace_settings` — one row per workspace: display name, branding
  asset paths, the canonical SkinInput columns, `default_appearance`
  (light | dark | system, new workspaces default to **light**).

## Resolution

One canonical access layer: `src/core/workspace`.
`requireWorkspace()` (request-cached) resolves user → workspace → settings,
bootstrapping on first sign-in: profile → workspace → owner membership →
default settings from the base skin. The `(app)` layout calls it and passes
only what the shell needs; modules use the same layer — never their own
queries against these tables. Multi-workspace switching is deliberately
deferred; the EARLIEST membership is the current workspace (`/invite/*`
lives outside the app group so invitees never trigger the bootstrap).
Team, roles, and invitations: docs/TEAM.md.

## RLS model

RLS is enabled on every table. Membership predicates come from
`private.is_workspace_member(ws)` / `private.workspace_role(ws)` —
SECURITY DEFINER by necessity (policies on workspace_members cannot query
workspace_members), hardened: pinned empty search_path, STABLE, single
indexed lookup, EXECUTE only for `authenticated`, and housed in the
non-exposed `private` schema so they are not RPC-callable.

- profiles: own row only (select/insert/update).
- workspaces: members read; creators also read their own (required for
  bootstrap ordering); any authenticated user may create; owner/admin update.
- workspace_members: members read their workspaces' rows; the only
  self-service insert is the creator claiming the owner seat of a workspace
  they created. Invitations come later.
- workspace_settings: members read; owner/admin insert/update.

Verified live with two users: cross-workspace reads return empty,
cross-workspace updates change zero rows, a `viewer` reads but cannot
write, and cross-workspace storage writes are rejected.

## Branding storage

Bucket `branding` (public-read — logos/favicons are not secrets and must
render in plain `<img>`/`<link>` tags without signing). Paths:
`{workspace_id}/logo-light.svg|png`, `logo-dark.*`, `favicon.*`.
Writes/updates/deletes require owner/admin of the workspace in the first
path segment, enforced by storage RLS.

## Rebranding a project

Change nothing in code: Settings → Appearance edits SkinInput values and
uploads artwork; everything persists in workspace_settings and renders
server-first. Code defaults (`defaultSkin`) apply only until the bootstrap
row exists.
