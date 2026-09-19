-- Fails on any public table or view that the Data API roles cannot use.
--
-- A stack from a recent Supabase CLI grants nothing on new tables, so a migration
-- that forgets `select private.expose_table('public.<name>')` yields a database
-- where every query on that table fails with "permission denied". Run this on a
-- FRESH local stack (every migration applied by `supabase start` / `db reset`);
-- on an old hosted project the implicit default grants would mask a missing call.
--
--   pnpm test:db          (or: psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/table_grants.sql)
--
-- One transaction, rolled back: the self-check below creates a probe table.

begin;

create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok: %', label;
end $$;

-- One row per (relation, role, privilege) the Data API roles are missing.
create function pg_temp.missing_grants() returns table (rel text, role_name text, priv text) language sql as $$
  select format('%I.%I', ns.nspname, c.relname), r.rolname::text, p.priv
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace ns on ns.oid = c.relnamespace
  cross join (values ('authenticated'), ('service_role')) as r(rolname)
  cross join lateral (
    select unnest(case when c.relkind in ('r', 'p') then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array['SELECT'] end) as priv
  ) p
  where ns.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm')
    and not has_table_privilege(r.rolname, c.oid, p.priv)
$$;

-- 1. The schema as migrated: nothing is missing.
do $$
declare
  bad text;
begin
  select string_agg(distinct rel, ', ' order by rel) into bad from pg_temp.missing_grants();
  if bad is not null then
    raise exception 'FAILED: public tables/views without Data API grants: %. Add `select private.expose_table(''public.<name>'');` to the migration that creates each (docs/SUPABASE.md).', bad;
  end if;
  raise notice 'ok: every public table and view is granted to authenticated and service_role';
end $$;

-- 2. Nothing is exposed without RLS.
select pg_temp.check(not exists (
  select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
), 'every public table has row level security enabled');

-- 3. The helper is for migrations only.
select pg_temp.check(not has_function_privilege('authenticated', 'private.expose_table(regclass)', 'execute')
  and not has_function_privilege('anon', 'private.expose_table(regclass)', 'execute'), 'authenticated and anon cannot execute expose_table()');

-- 4. Self-check: this test would fail on a table that forgot the call.
create table public._grants_probe (id int);
select pg_temp.check(exists (select 1 from pg_temp.missing_grants() where rel = 'public._grants_probe'), 'self-check: a table without grants is detected');

do $$
begin
  perform private.expose_table('public._grants_probe');
  raise exception 'FAILED: expose_table() accepted a table with row level security disabled';
exception when raise_exception then
  if sqlerrm like 'FAILED:%' then raise; end if;
  raise notice 'ok: expose_table() refuses a table without row level security';
end $$;

alter table public._grants_probe enable row level security;
select private.expose_table('public._grants_probe');
select pg_temp.check(not exists (select 1 from pg_temp.missing_grants() where rel = 'public._grants_probe'), 'self-check: expose_table() closes the gap');

rollback;
