-- Asserts that rewriting SELECT policies from the per-row
-- `is_workspace_member(workspace_id)` to `workspace_id IN (SELECT
-- private.member_workspace_ids())` (20260919120000) changed no access:
-- as the real `authenticated` role, a member reads exactly their
-- workspace's rows on every rewritten table, a non-member reads none, and
-- the set form agrees with the single-id form. Plain SQL, one rolled-back
-- transaction —
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/member_workspace_ids_rls.sql

begin;

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok: %', label;
end $$;

-- Fixtures (as the table owner): two workspaces, one member each, plus a
-- user who belongs to neither.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'one@test'),
  ('00000000-0000-0000-0000-0000000000c2', 'two@test'),
  ('00000000-0000-0000-0000-0000000000c3', 'nobody@test');
insert into public.workspaces (id, name, slug, created_by) values
  ('00000000-0000-0000-0000-00000000d001', 'One', 'one-fixture', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-00000000d002', 'Two', 'two-fixture', '00000000-0000-0000-0000-0000000000c2');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000c1', 'member'),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-0000000000c2', 'member');
insert into public.workspace_settings (workspace_id, display_name, accent_hue, accent_chroma, neutral_hue, neutral_chroma, semantic_chroma, font_family, mono_font_family, weight_bold, weight_semibold) values
  ('00000000-0000-0000-0000-00000000d001', 'One', 250, 0.15, 250, 0.01, 0.15, 'sans', 'mono', 700, 600),
  ('00000000-0000-0000-0000-00000000d002', 'Two', 250, 0.15, 250, 0.01, 0.15, 'sans', 'mono', 700, 600);
insert into public.activity_events (workspace_id, action, resource_type) values
  ('00000000-0000-0000-0000-00000000d001', 'test.one', 'test'),
  ('00000000-0000-0000-0000-00000000d001', 'test.one', 'test'),
  ('00000000-0000-0000-0000-00000000d002', 'test.two', 'test');

-- Member of One: exactly One's rows, nothing of Two's.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check((select count(*) from public.workspaces where id in ('00000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d002')) = 1
  and (select count(*) from public.workspaces where id = '00000000-0000-0000-0000-00000000d001') = 1, 'workspaces: a member sees only their own workspace');
select pg_temp.check((select count(*) from public.workspace_members where workspace_id = '00000000-0000-0000-0000-00000000d001') = 1
  and (select count(*) from public.workspace_members where workspace_id = '00000000-0000-0000-0000-00000000d002') = 0, 'workspace_members: a member sees only their own workspace''s members');
select pg_temp.check((select count(*) from public.workspace_settings where workspace_id = '00000000-0000-0000-0000-00000000d001') = 1
  and (select count(*) from public.workspace_settings where workspace_id = '00000000-0000-0000-0000-00000000d002') = 0, 'workspace_settings: a member sees only their own workspace''s settings');
-- (the audit triggers add their own events for the fixture inserts, so count only ours)
select pg_temp.check((select count(*) from public.activity_events where action = 'test.one') = 2
  and (select count(*) from public.activity_events where action = 'test.two') = 0, 'activity_events: a member sees only their own workspace''s events');

-- The set form and the single-id form agree, for a member and a non-member.
-- `private` is not exposed to `authenticated` (no schema USAGE on a fresh stack;
-- policies still evaluate the function), so call it as the owner with the
-- member's claim set: auth.uid() reads the claim, which is all it looks at.
reset role;
select pg_temp.check(
  (select array_agg(w order by w) from private.member_workspace_ids() w) = array['00000000-0000-0000-0000-00000000d001'::uuid]
  and private.is_workspace_member('00000000-0000-0000-0000-00000000d001')
  and not private.is_workspace_member('00000000-0000-0000-0000-00000000d002'),
  'member_workspace_ids() matches is_workspace_member() for a member');

-- Belongs to neither workspace: sees nothing anywhere.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select pg_temp.check((select count(*) from public.workspace_members) = 0
  and (select count(*) from public.workspace_settings) = 0
  and (select count(*) from public.activity_events) = 0
  and (select count(*) from public.workspaces where id in ('00000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d002')) = 0,
  'a non-member reads zero rows on every rewritten table');
reset role;   -- the non-member's claim stays set
select pg_temp.check(not exists (select 1 from private.member_workspace_ids()) and not private.is_workspace_member('00000000-0000-0000-0000-00000000d001'),
  'member_workspace_ids() is empty for a non-member, like is_workspace_member()');

-- No session at all (no uid): nothing.
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.check(not exists (select 1 from private.member_workspace_ids()), 'member_workspace_ids() is empty without an authenticated user');

-- The function is not callable by anon.
reset role;
select pg_temp.check(not has_function_privilege('anon', 'private.member_workspace_ids()', 'execute'), 'anon cannot execute member_workspace_ids()');
select pg_temp.check(has_function_privilege('authenticated', 'private.member_workspace_ids()', 'execute'), 'authenticated can execute member_workspace_ids()');

-- The rewrite left no SELECT policy on the per-row form.
select pg_temp.check(not exists (
  select 1 from pg_policies where schemaname = 'public' and cmd = 'SELECT' and qual like '%private.is_workspace_member(%'
), 'no public SELECT policy still calls is_workspace_member() per row');

rollback;
