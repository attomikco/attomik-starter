-- Task 008: team management + invitations.
-- Capability model (mirrored in src/core/permissions):
--   owner  -> manages admin/member/viewer rows, assigns admin/member/viewer
--   admin  -> manages member/viewer rows, assigns member/viewer
--   member/viewer -> no management
-- Owner rows are untouchable through the API (no update/delete policy path),
-- so a workspace can never lose its owner. Ownership transfer is future work.

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------ invitations

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member', 'viewer')),
  invited_by uuid not null references auth.users (id),
  -- sha256 hex of the single-use token; the raw token exists only in the email
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- one live invitation per address per workspace
create unique index workspace_invitations_pending_email_idx
  on public.workspace_invitations (workspace_id, lower(email))
  where status = 'pending';

alter table public.workspace_invitations enable row level security;

create policy "invitations_select_admin" on public.workspace_invitations
  for select to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'));

create policy "invitations_insert_admin" on public.workspace_invitations
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and (
      (private.workspace_role(workspace_id) = 'owner' and role in ('admin', 'member', 'viewer'))
      or (private.workspace_role(workspace_id) = 'admin' and role in ('member', 'viewer'))
    )
  );

create policy "invitations_update_admin" on public.workspace_invitations
  for update to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'))
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

create policy "invitations_delete_admin" on public.workspace_invitations
  for delete to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'));

-- ------------------------------------------------- member management RLS
-- Owner rows have no matching USING clause anywhere: nobody updates or
-- deletes an owner through the API. Admins reach only member/viewer rows.

create policy "members_update_managed" on public.workspace_members
  for update to authenticated
  using (
    role <> 'owner'
    and (
      private.workspace_role(workspace_id) = 'owner'
      or (private.workspace_role(workspace_id) = 'admin' and role in ('member', 'viewer'))
    )
  )
  with check (
    (private.workspace_role(workspace_id) = 'owner' and role in ('admin', 'member', 'viewer'))
    or (private.workspace_role(workspace_id) = 'admin' and role in ('member', 'viewer'))
  );

create policy "members_delete_managed" on public.workspace_members
  for delete to authenticated
  using (
    role <> 'owner'
    and (
      private.workspace_role(workspace_id) = 'owner'
      or (private.workspace_role(workspace_id) = 'admin' and role in ('member', 'viewer'))
    )
  );

-- ------------------------------------- profiles visible to co-members only
-- The Team screen shows co-members' identity. Scoped to shared workspaces —
-- profile privacy is not weakened globally.

create or replace function private.shares_workspace_with(profile_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = profile_id
  );
$$;

revoke execute on function private.shares_workspace_with (uuid) from public, anon;
grant execute on function private.shares_workspace_with (uuid) to authenticated;

create policy "profiles_select_shared_workspace" on public.profiles
  for select to authenticated
  using (private.shares_workspace_with(id));

-- --------------------------------------------------- invitation acceptance
-- SECURITY DEFINER is genuinely required: the invitee is not yet a member,
-- so RLS correctly hides the invitation from them. Both functions follow
-- the Task 006 hardened pattern (pinned search_path, explicit auth checks,
-- authenticated-only EXECUTE) and take the RAW token — possession of the
-- emailed secret plus a matching verified email is the authorization.
-- Acceptance is atomic: one transaction, row-locked against double accept.

create or replace function public.preview_workspace_invitation(raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  uid uuid;
  uemail text;
  inv record;
  ws_name text;
begin
  uid := (select auth.uid());
  if uid is null then
    return jsonb_build_object('code', 'unauthenticated');
  end if;
  select lower(email) into uemail from auth.users where id = uid;

  select i.*, w.name as workspace_name into inv
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  where i.token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex');

  if not found then return jsonb_build_object('code', 'invalid'); end if;
  if lower(inv.email) <> uemail then return jsonb_build_object('code', 'wrong_email'); end if;
  if inv.status = 'revoked' then return jsonb_build_object('code', 'revoked'); end if;
  if inv.status = 'accepted' then return jsonb_build_object('code', 'accepted'); end if;
  if inv.expires_at < now() then return jsonb_build_object('code', 'expired'); end if;

  return jsonb_build_object(
    'code', 'ok',
    'workspace_name', inv.workspace_name,
    'role', inv.role,
    'expires_at', inv.expires_at
  );
end;
$$;

create or replace function public.accept_workspace_invitation(raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
  uemail text;
  inv record;
begin
  uid := (select auth.uid());
  if uid is null then
    return jsonb_build_object('code', 'unauthenticated');
  end if;
  select lower(email) into uemail from auth.users where id = uid;

  select * into inv
  from public.workspace_invitations
  where token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
  for update;

  if not found then return jsonb_build_object('code', 'invalid'); end if;
  if lower(inv.email) <> uemail then return jsonb_build_object('code', 'wrong_email'); end if;
  if inv.status = 'revoked' then return jsonb_build_object('code', 'revoked'); end if;
  if inv.status = 'accepted' then return jsonb_build_object('code', 'accepted'); end if;
  if inv.expires_at < now() then return jsonb_build_object('code', 'expired'); end if;

  insert into public.profiles (id, email)
  values (uid, uemail)
  on conflict (id) do nothing;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, uid, inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations
  set status = 'accepted', accepted_at = now(), updated_at = now()
  where id = inv.id;

  return jsonb_build_object('code', 'ok', 'workspace_id', inv.workspace_id, 'role', inv.role);
end;
$$;

revoke execute on function public.preview_workspace_invitation (text) from public, anon;
revoke execute on function public.accept_workspace_invitation (text) from public, anon;
grant execute on function public.preview_workspace_invitation (text) to authenticated;
grant execute on function public.accept_workspace_invitation (text) to authenticated;
