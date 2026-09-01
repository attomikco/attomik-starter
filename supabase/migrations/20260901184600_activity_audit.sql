-- Task 009: canonical workspace activity/audit events.
--
-- Capture model:
--  * Critical starter events (settings/branding, membership, invitations,
--    workspace creation) are written by DATABASE TRIGGERS — same
--    transaction as the mutation (mutation and audit cannot diverge) and
--    with no client-facing insert path (rows cannot be forged).
--  * Future module events use public.record_activity(): actor is FORCED to
--    auth.uid(), workspace membership is enforced, and the action name is
--    validated — a browser can only record truthful-actor events in its own
--    workspace.
--  * Append-only: members may SELECT their workspace's events; no
--    insert/update/delete policies exist for regular roles.
-- Event naming: dot-separated segments, lowercase snake per segment:
--   workspace.settings.updated · workspace.member.role_changed · …

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  resource_label text,
  metadata jsonb not null default '{}'::jsonb,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_workspace_created_idx
  on public.activity_events (workspace_id, created_at desc);
create index activity_events_workspace_action_idx
  on public.activity_events (workspace_id, action);
create index activity_events_workspace_resource_idx
  on public.activity_events (workspace_id, resource_type);

alter table public.activity_events enable row level security;

create policy "activity_select_member" on public.activity_events
  for select to authenticated
  using (private.is_workspace_member(workspace_id));
-- deliberately NO insert/update/delete policies: append-only via triggers/RPC.

-- ------------------------------------------------------------ trigger fns
-- SECURITY DEFINER is required: with no INSERT policy, only definer-owned
-- functions can append. Hardened: private schema, pinned search_path, no
-- EXECUTE needed by callers (trigger context). Token hashes are never
-- written anywhere.

create or replace function private.log_event(
  ws uuid, act text, rtype text, rid text, rlabel text,
  meta jsonb, before_d jsonb, after_d jsonb
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_events
    (workspace_id, actor_user_id, action, resource_type, resource_id, resource_label, metadata, before_data, after_data)
  values
    (ws, (select auth.uid()), act, rtype, rid, rlabel, coalesce(meta, '{}'::jsonb), before_d, after_d);
$$;

create or replace function private.member_email(uid uuid) returns text
language sql security definer set search_path = '' stable
as $$ select email from public.profiles where id = uid $$;

-- workspaces: creation
create or replace function private.trg_workspaces_audit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.log_event(new.id, 'workspace.created', 'workspace', new.id::text, new.name, '{}'::jsonb, null, null);
  return new;
end $$;
create trigger workspaces_audit after insert on public.workspaces
  for each row execute function private.trg_workspaces_audit();

-- workspace_settings: settings vs branding updates, changed fields only
create or replace function private.trg_settings_audit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  before_j jsonb := '{}'::jsonb;
  after_j jsonb := '{}'::jsonb;
  oldj jsonb := to_jsonb(old);
  newj jsonb := to_jsonb(new);
  k text;
  branding_keys text[] := array['logo_light_path', 'logo_dark_path', 'favicon_path'];
  tracked text[] := array[
    'display_name', 'default_appearance',
    'accent_hue', 'accent_chroma', 'neutral_hue', 'neutral_chroma', 'semantic_chroma',
    'font_family', 'mono_font_family', 'weight_bold', 'weight_semibold',
    'accent_lightness', 'accent_lightness_dark', 'accent_ink_lightness',
    'radius_large', 'radius_medium', 'radius_small',
    'logo_light_path', 'logo_dark_path', 'favicon_path'
  ];
  only_branding boolean := true;
  changed boolean := false;
begin
  foreach k in array tracked loop
    if oldj -> k is distinct from newj -> k then
      changed := true;
      before_j := before_j || jsonb_build_object(k, oldj -> k);
      after_j := after_j || jsonb_build_object(k, newj -> k);
      if not (k = any (branding_keys)) then only_branding := false; end if;
    end if;
  end loop;
  if changed then
    perform private.log_event(
      new.workspace_id,
      case when only_branding then 'workspace.branding.updated' else 'workspace.settings.updated' end,
      'workspace_settings', new.workspace_id::text, new.display_name,
      '{}'::jsonb, before_j, after_j
    );
  end if;
  return new;
end $$;
create trigger settings_audit after update on public.workspace_settings
  for each row execute function private.trg_settings_audit();

-- workspace_members: added / role changed / removed
create or replace function private.trg_members_audit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_event(new.workspace_id, 'workspace.member.added', 'member',
      new.user_id::text, private.member_email(new.user_id),
      jsonb_build_object('role', new.role), null, jsonb_build_object('role', new.role));
    return new;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      perform private.log_event(new.workspace_id, 'workspace.member.role_changed', 'member',
        new.user_id::text, private.member_email(new.user_id),
        '{}'::jsonb, jsonb_build_object('role', old.role), jsonb_build_object('role', new.role));
    end if;
    return new;
  else
    perform private.log_event(old.workspace_id, 'workspace.member.removed', 'member',
      old.user_id::text, private.member_email(old.user_id),
      '{}'::jsonb, jsonb_build_object('role', old.role), null);
    return old;
  end if;
end $$;
create trigger members_audit after insert or update or delete on public.workspace_members
  for each row execute function private.trg_members_audit();

-- workspace_invitations: created / resent / revoked / accepted.
-- NEVER logs token_hash.
create or replace function private.trg_invitations_audit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_event(new.workspace_id, 'workspace.invitation.created', 'invitation',
      new.id::text, new.email, jsonb_build_object('role', new.role), null, jsonb_build_object('role', new.role));
    return new;
  end if;
  if old.status = 'pending' and new.status = 'revoked' then
    perform private.log_event(new.workspace_id, 'workspace.invitation.revoked', 'invitation',
      new.id::text, new.email, jsonb_build_object('role', new.role), null, null);
  elsif old.status = 'pending' and new.status = 'accepted' then
    perform private.log_event(new.workspace_id, 'workspace.invitation.accepted', 'invitation',
      new.id::text, new.email, jsonb_build_object('role', new.role), null, null);
  elsif new.status = 'pending' and new.token_hash is distinct from old.token_hash then
    perform private.log_event(new.workspace_id, 'workspace.invitation.resent', 'invitation',
      new.id::text, new.email, jsonb_build_object('role', new.role), null, null);
  end if;
  return new;
end $$;
create trigger invitations_audit after insert or update on public.workspace_invitations
  for each row execute function private.trg_invitations_audit();

-- --------------------------------------------- custom events (future use)
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
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  if not private.is_workspace_member(workspace) then
    raise exception 'not a member of this workspace';
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

revoke execute on function public.record_activity (uuid, text, text, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.record_activity (uuid, text, text, text, text, jsonb, jsonb, jsonb) to authenticated;
