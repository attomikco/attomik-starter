-- RLS membership check as an uncorrelated, once-per-query set.
--
-- Ported from Arghos, where this was the root cause of a production
-- slowdown: every SELECT policy was `private.is_workspace_member(workspace_id)`
-- — a SECURITY DEFINER function the planner calls once PER ROW SCANNED.
-- RLS cost then scales with rows scanned (activity_events grows without
-- bound), not with membership, which is one row per user. Measured here on
-- 300k activity_events as an authenticated member: a workspace count(*)
-- went from ~800 ms to ~25 ms. supabase/tests/member_workspace_ids_rls.sql
-- proves access is unchanged.
--
-- Fix: private.member_workspace_ids() returns the caller's workspace ids
-- once, and each SELECT policy becomes
--   workspace_id IN (SELECT private.member_workspace_ids())
-- an UNCORRELATED subquery the planner evaluates once as a hashed SubPlan
-- and probes per row. Wrapping the old function in a select would stay
-- correlated (its argument is the row's column), so policies must call the
-- set-returning form.
--
-- Access is unchanged by construction: for any user and workspace,
-- `ws IN (SELECT member_workspace_ids())` = `is_workspace_member(ws)`.
-- is_workspace_member(uuid) stays for single-id callers (server code,
-- write-path helpers, INSERT checks). workspace_role() policies are
-- write-path or admin-only reads over small tables and are unchanged.
--
-- A project that adds its own SELECT policies should write them in the set
-- form from the start (docs/SUPABASE.md).

create or replace function private.member_workspace_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select m.workspace_id
  from public.workspace_members m
  where m.user_id = (select auth.uid());
$$;

-- Same grant shape as is_workspace_member: a policy's expression runs with
-- the caller's privileges, so `authenticated` needs EXECUTE; nothing else does.
revoke execute on function private.member_workspace_ids() from public, anon;
grant execute on function private.member_workspace_ids() to authenticated;

-- Rewrite every public-schema SELECT policy that calls
-- is_workspace_member(<column>) in place (ALTER POLICY keeps the command and
-- roles). Walking pg_policies rather than restating each policy means one
-- added since this was written cannot be missed, and the post-condition
-- aborts the whole migration (it runs in a transaction) if any reference is
-- left or nothing matched.
do $$
declare
  pol record;
  rewritten integer := 0;
  remaining integer;
  pattern constant text := 'private\.is_workspace_member\(([a-z_]+)\)';
  replacement constant text := '(\1 IN ( SELECT private.member_workspace_ids() AS member_workspace_ids))';
begin
  for pol in
    select schemaname, tablename, policyname, qual
    from pg_policies
    where schemaname = 'public'
      and cmd = 'SELECT'
      and coalesce(qual, '') like '%private.is_workspace_member(%'
  loop
    execute format(
      'alter policy %I on %I.%I using (%s)',
      pol.policyname, pol.schemaname, pol.tablename,
      regexp_replace(pol.qual, pattern, replacement, 'g')
    );
    rewritten := rewritten + 1;
  end loop;

  select count(*) into remaining
  from pg_policies
  where schemaname = 'public'
    and cmd = 'SELECT'
    and coalesce(qual, '') like '%private.is_workspace_member(%';
  if remaining <> 0 then
    raise exception 'rls_member_workspace_ids: % SELECT policy(ies) still call is_workspace_member() after the rewrite', remaining;
  end if;
  if rewritten < 1 then
    raise exception 'rls_member_workspace_ids: no policy was rewritten — the pattern did not match anything';
  end if;
  raise notice 'rls_member_workspace_ids: rewrote % policies', rewritten;
end $$;
