-- Feedback resolutions: marking a feedback row "resolved" is a NEW ROW in
-- this table, never an update to public.feedback (which stays one-way and
-- append-only — see 20260914215102_feedback_capture.sql). "Resolved" is
-- derived from the existence of a row here; there is no status column.
--
-- Like feedback itself this table is append-only: no update or delete
-- policy exists, so a resolution can be neither edited nor undone through
-- the API. Only workspace owners/admins can write or read it.
--
-- Every column besides resolution_note/notified_user_ids is attached
-- server-side (the resolve action), never typed by the caller:
-- resolved_by is forced to the verified actor by the insert policy.

create table public.feedback_resolutions (
  id uuid primary key default gen_random_uuid(),
  -- unique: a feedback row is resolved at most once.
  feedback_id uuid not null unique references public.feedback (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- set null (not cascade): removing an auth account must not silently turn
  -- the feedback row back into "pending". The UI renders a null resolver as
  -- a former member. This is the only FK action that touches the row after
  -- insert, and it bypasses RLS by design.
  resolved_by uuid references auth.users (id) on delete set null,
  resolution_note text check (resolution_note is null or char_length(resolution_note) between 1 and 2000),
  -- The members the resolver chose to notify at resolve time (intent, not a
  -- delivery receipt — the email is sent after this row exists and the row
  -- cannot be updated afterwards). uuid[] cannot carry a foreign key; the
  -- server action only ever writes ids of current workspace members.
  notified_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index feedback_resolutions_workspace_created_idx
  on public.feedback_resolutions (workspace_id, created_at desc);

alter table public.feedback_resolutions enable row level security;

-- Owner/admin only, as themselves, and only for a feedback row that
-- belongs to the SAME workspace the resolution claims. The exists() also
-- runs under feedback's own select policy, so an admin can never resolve
-- (or probe) another workspace's feedback by guessing its id.
create policy "feedback_resolutions_insert_admin" on public.feedback_resolutions
  for insert to authenticated
  with check (
    resolved_by = (select auth.uid())
    and private.is_workspace_member(workspace_id)
    and private.workspace_role(workspace_id) in ('owner', 'admin')
    and exists (
      select 1
      from public.feedback f
      where f.id = feedback_resolutions.feedback_id
        and f.workspace_id = feedback_resolutions.workspace_id
    )
  );

-- Only owner/admin may read resolutions back — the same audience as the
-- feedback mailbox itself.
create policy "feedback_resolutions_select_admin" on public.feedback_resolutions
  for select to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'));

-- deliberately no update/delete policies: append-only.
