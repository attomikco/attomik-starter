-- Task 010 hardening: consolidate the two permissive SELECT policies on
-- profiles into one (advisor 0006) — same semantics, one evaluation.
drop policy "profiles_select_own" on public.profiles;
drop policy "profiles_select_shared_workspace" on public.profiles;
create policy "profiles_select_own_or_shared" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_workspace_with(id));
