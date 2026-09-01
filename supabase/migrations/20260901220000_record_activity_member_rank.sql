-- Feedback: record_activity() let a viewer write activity events.
--
-- Viewers are the read-only baseline (docs/TEAM.md). Activity events are
-- the trace of a mutation, and a viewer has nothing to mutate — so a
-- viewer-authored event is by definition either a bug or noise, and the
-- log is append-only, so that noise would be permanent. Custom events now
-- require member rank or above (owner / admin / member); the trigger paths
-- are unaffected because a viewer cannot perform the mutations they audit.
-- Mirrored by canRecordActivity() in src/core/permissions.

create or replace function public.record_activity(
  workspace uuid,
  action text,
  resource_type text,
  resource_id text default null,
  resource_label text default null,
  metadata jsonb default '{}'::jsonb,
  before_data jsonb default null,
  after_data jsonb default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  actor_role := private.workspace_role(workspace);
  if actor_role is null then
    raise exception 'not a member of this workspace';
  end if;
  -- rank >= member: viewers are read-only and never author events
  if actor_role not in ('owner', 'admin', 'member') then
    raise exception 'viewers cannot record activity';
  end if;
  if action !~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$' then
    raise exception 'invalid action name';
  end if;
  if coalesce(trim(resource_type), '') = '' then
    raise exception 'resource_type is required';
  end if;
  -- actor is always the verified caller — never client-supplied
  insert into public.activity_events
    (workspace_id, actor_user_id, action, resource_type, resource_id, resource_label, metadata, before_data, after_data)
  values
    (workspace, (select auth.uid()), action, resource_type, resource_id, resource_label,
     coalesce(metadata, '{}'::jsonb), before_data, after_data);
end $$;

-- Grants are unchanged (revoked from public/anon, executable by
-- authenticated); restated so this migration is self-describing.
revoke execute on function public.record_activity (uuid, text, text, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.record_activity (uuid, text, text, text, text, jsonb, jsonb, jsonb) to authenticated;
