-- Bootstrap fix: the members_insert_creator_owner policy checks the
-- workspaces table, which itself is RLS-guarded — a creator must be able to
-- see a workspace they created before their owner membership exists.
drop policy "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member_or_creator" on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id) or created_by = (select auth.uid()));
