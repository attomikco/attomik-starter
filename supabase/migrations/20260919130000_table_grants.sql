-- Explicit Data API grants for tables and views.
--
-- Why: a Supabase project or local stack from a recent CLI no longer grants
-- select/insert/update/delete on new `public` tables to `authenticated` and
-- `service_role` (the old implicit defaults are gone; the hosted projects that
-- predate the change still have them). Migrations that only `create table` +
-- `enable row level security` therefore produce a database where EVERY query
-- fails with "permission denied for table ...": the next project deployed from
-- this starter would be dead on arrival. Grants must be explicit.
--
-- Convention (docs/SUPABASE.md): after creating a table or view, call
--
--   select private.expose_table('public.<name>');
--
-- in the same migration. It grants select/insert/update/delete (tables) or
-- select (views) to `authenticated` and `service_role`, NOT to `anon`: RLS then
-- decides what a caller may read or write. Something intentionally public gets
-- its own explicit `grant ... to anon` next to its policy, with a comment saying
-- why. supabase/tests/table_grants.sql fails on any public table or view without
-- the grants, so a forgotten call is caught on a fresh stack before deploy.
--
-- The helper REFUSES a table with row level security disabled: a grant without
-- RLS would expose every row to every signed-in user.
--
-- Additive and idempotent: projects that still have the old implicit grants keep
-- them, and running this again changes nothing.

create or replace function private.expose_table(rel regclass)
returns void
language plpgsql
set search_path = ''
as $$
declare
  kind "char";
  rls boolean;
begin
  select c.relkind, c.relrowsecurity into kind, rls from pg_catalog.pg_class c where c.oid = rel;

  if kind in ('r', 'p') then
    if not rls then
      raise exception 'private.expose_table: % has row level security disabled; run `alter table ... enable row level security` (and add its policies) before exposing it', rel;
    end if;
    execute format('grant select, insert, update, delete on %s to authenticated, service_role', rel);
  elsif kind in ('v', 'm', 'f') then
    -- Views run with the caller's rights when created `with (security_invoker = true)`
    -- (the starter's convention), so the underlying tables' RLS still applies.
    execute format('grant select on %s to authenticated, service_role', rel);
  else
    raise exception 'private.expose_table: % is not a table or view', rel;
  end if;
end $$;

-- Only migrations (running as the owner) call it.
revoke execute on function private.expose_table(regclass) from public, anon, authenticated;

-- Retrofit: every table and view that exists in `public` when this runs.
do $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select c.oid::regclass as rel
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
    order by c.relname
  loop
    perform private.expose_table(r.rel);
    n := n + 1;
  end loop;
  raise notice 'table_grants: exposed % relation(s) to authenticated and service_role', n;
end $$;
