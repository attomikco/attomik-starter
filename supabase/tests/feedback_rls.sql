-- Feedback RLS, asserted as the real `authenticated` role (never the table
-- owner, which bypasses RLS). Plain SQL, no pgTAP: run against a database
-- with every migration applied —
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/feedback_rls.sql
--
-- Everything happens inside one transaction that is rolled back, so it
-- leaves nothing behind. Any failed assertion raises and aborts the run.

begin;

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.act_as_owner_of_db() returns void language plpgsql as $$
begin
  execute 'reset role';
end $$;

-- Runs a statement as the current role and reports whether it was denied by RLS.
create function pg_temp.denied(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when insufficient_privilege then
  return true;
end $$;

create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok: %', label;
end $$;

-- Fixtures (as the table owner) ---------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner1@test'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin1@test'),
  ('00000000-0000-0000-0000-0000000000a3', 'member1@test'),
  ('00000000-0000-0000-0000-0000000000a4', 'viewer1@test'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner2@test');
insert into public.workspaces (id, name, slug, created_by) values
  ('00000000-0000-0000-0000-00000000f001', 'WS1', 'ws1-fixture', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000f002', 'WS2', 'ws2-fixture', '00000000-0000-0000-0000-0000000000b1');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a2', 'admin'),
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a3', 'member'),
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a4', 'viewer'),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000b1', 'owner');

-- feedback -------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3');  -- member of WS1

select pg_temp.check(not pg_temp.denied($q$
  insert into public.feedback (id, workspace_id, user_id, type, message, route, user_agent, viewport_w, viewport_h)
  values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a3', 'idea', 'mine', '/x', 'ua', 1, 1)
$q$), 'a member can file feedback as themselves in their own workspace');

select pg_temp.check(pg_temp.denied($q$
  insert into public.feedback (workspace_id, user_id, type, message, route, user_agent, viewport_w, viewport_h)
  values ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', 'idea', 'forged', '/x', 'ua', 1, 1)
$q$), 'a member cannot file feedback in someone else''s name');

select pg_temp.check(pg_temp.denied($q$
  insert into public.feedback (workspace_id, user_id, type, message, route, user_agent, viewport_w, viewport_h)
  values ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000a3', 'idea', 'foreign', '/x', 'ua', 1, 1)
$q$), 'a member cannot file feedback into a workspace they do not belong to');

select pg_temp.check((select count(*) from public.feedback) = 0, 'a member cannot read the mailbox, not even their own note');

do $$ declare n int; begin
  update public.feedback set message = 'edited'; get diagnostics n = row_count;
  perform pg_temp.check(n = 0, 'feedback cannot be updated through the API');
  delete from public.feedback; get diagnostics n = row_count;
  perform pg_temp.check(n = 0, 'feedback cannot be deleted through the API');
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');  -- viewer
select pg_temp.check((select count(*) from public.feedback) = 0, 'a viewer cannot read the mailbox');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');  -- admin of WS1
select pg_temp.check((select count(*) from public.feedback) = 1, 'an admin reads the workspace''s feedback');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');  -- owner of WS2
select pg_temp.check((select count(*) from public.feedback) = 0, 'another workspace''s owner sees none of it');

-- feedback_resolutions --------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3');  -- member
select pg_temp.check(pg_temp.denied($q$
  insert into public.feedback_resolutions (feedback_id, workspace_id, resolved_by)
  values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a3')
$q$), 'a member cannot resolve feedback');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');  -- admin
select pg_temp.check(pg_temp.denied($q$
  insert into public.feedback_resolutions (feedback_id, workspace_id, resolved_by)
  values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1')
$q$), 'an admin cannot record a resolution as someone else');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');  -- owner of WS2
select pg_temp.check(pg_temp.denied($q$
  insert into public.feedback_resolutions (feedback_id, workspace_id, resolved_by)
  values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000b1')
$q$), 'an admin of another workspace cannot resolve (or probe) this feedback by id');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');  -- admin
select pg_temp.check(not pg_temp.denied($q$
  insert into public.feedback_resolutions (feedback_id, workspace_id, resolved_by, resolution_note, notified_user_ids)
  values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a2', 'done', '{}')
$q$), 'an admin can resolve as themselves');

do $$ begin
  begin
    insert into public.feedback_resolutions (feedback_id, workspace_id, resolved_by)
    values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a2');
    raise exception 'FAILED: a second resolution was accepted';
  exception when unique_violation then
    raise notice 'ok: a feedback row is resolved at most once';
  end;
end $$;

do $$ declare n int; begin
  update public.feedback_resolutions set resolution_note = 'edited'; get diagnostics n = row_count;
  perform pg_temp.check(n = 0, 'a resolution cannot be edited');
  delete from public.feedback_resolutions; get diagnostics n = row_count;
  perform pg_temp.check(n = 0, 'a resolution cannot be undone');
end $$;

select pg_temp.check((select count(*) from public.feedback_resolutions) = 1, 'an admin reads resolutions');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3');
select pg_temp.check((select count(*) from public.feedback_resolutions) = 0, 'a member cannot read resolutions');

rollback;
