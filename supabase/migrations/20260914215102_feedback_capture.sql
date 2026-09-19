-- Core in-app feedback capture: one-way, append-only. A floating widget
-- (src/core/feedback) lets any workspace member drop a short note; only
-- workspace admins/owners read it back (Settings → Feedback). No replies,
-- no threads — this is a mailbox, not a conversation.
--
-- Every column besides type/message is attached server-side, never typed
-- by the caller: workspace_id and user_id are the verified actor's,
-- route/user_agent/viewport describe where the note was filed from.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('broken', 'unclear', 'should_change', 'idea')),
  message text not null check (char_length(message) between 1 and 2000),
  route text not null,
  user_agent text not null,
  viewport_w integer not null check (viewport_w > 0),
  viewport_h integer not null check (viewport_h > 0),
  created_at timestamptz not null default now()
);

create index feedback_workspace_created_idx
  on public.feedback (workspace_id, created_at desc);

alter table public.feedback enable row level security;

-- Any member may file their own note in a workspace they belong to.
create policy "feedback_insert_self" on public.feedback
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_workspace_member(workspace_id)
  );

-- Only owner/admin may read the mailbox back.
create policy "feedback_select_admin" on public.feedback
  for select to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'));

-- deliberately no update/delete policies: one-way, append-only capture.
