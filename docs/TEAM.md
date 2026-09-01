# Team, roles & invitations

## Roles and capabilities

Defined once in `src/core/permissions` (pure, tested) and mirrored exactly
by RLS — UI visibility is convenience, the database is the boundary.

| Role | Meaning | Manages | Can assign |
| --- | --- | --- | --- |
| owner | Full workspace control | admin, member, viewer | admin, member, viewer |
| admin | Operational administration | member, viewer | member, viewer |
| member | Normal product user | — | — |
| viewer | Read-only baseline | — | — |

**Owner invariant**: owner rows have no matching UPDATE/DELETE policy path —
nobody (including the owner) can demote or remove an owner through the API,
so a workspace can never end up ownerless. Ownership transfer is documented
future work, not implemented.

## Invitations

`workspace_invitations`: workspace_id, normalized email, role
(admin/member/viewer — never owner), invited_by, `token_hash` (sha256 of a
32-byte random token; the raw token exists only in the email), status
(pending/accepted/revoked), expires_at (7 days), accepted_at. A partial
unique index allows one live invitation per address per workspace.

**Token model**: single current token. Resend rotates the token and expiry —
the previously emailed link stops working. Revoke flips status. Tokens are
never trusted from client state; possession of the raw token plus a
matching verified email is the authorization.

## Acceptance

`/invite/[token]` lives OUTSIDE the (app) group so an invitee never
triggers the personal-workspace bootstrap. Signed-out visitors go through
the normal magic-link flow and return. The page previews via
`preview_workspace_invitation` and accepts via
`accept_workspace_invitation` on an explicit POST — never a GET side
effect. Both RPCs are hardened SECURITY DEFINER (genuinely required: the
invitee is not yet a member, so RLS correctly hides the row): pinned empty
search_path, explicit auth checks, authenticated-only EXECUTE, verified
email compared against auth.users. Acceptance is atomic — one transaction,
`FOR UPDATE` row lock — so double-accepts and races cannot duplicate
membership or reuse a token. Wrong-email, expired, revoked, consumed, and
invalid tokens each return a distinct safe code.

## Management

Server actions in `src/modules/settings/team/actions.ts` re-check
capability from the actor's workspace_members row and rely on RLS
underneath: role changes and removals are scoped by the matrix above;
removing a member deletes only the membership row — never their auth
account. Errors are specific (already a member, already invited,
unassignable role) where safe.

## Emails

Invitation emails send through Resend (server-only `RESEND_API_KEY`,
sending-only key) from `auth@email.attomik.co` — all app + auth email
comes from the `email.attomik.co` domain. Template:
`src/core/team/invitation-email.ts` (reference email rules: literal hex,
single column, URL fallback, why-received footer).

## Multi-workspace note

The schema supports many memberships per user; `requireWorkspace` resolves
the EARLIEST membership (`order by created_at`) as the current workspace.
A future workspace switcher replaces that selection (persisted choice or
URL scoping) — nothing else needs to change.

## Verified live

Owner invite → branded email → acceptance → membership; full capability
matrix across owner/admin/member/viewer/unrelated (36 checks) including
owner-invariant, wrong-email, expired, revoked, duplicate, and double-accept
rejections. Test data cleaned afterward.
