-- Workspace foundation: profiles, workspaces, membership, settings, branding
-- storage. RLS enforces workspace membership everywhere; roles come from
-- workspace_members, never user_metadata.

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

-- Persists ONLY canonical SkinInput values plus workspace branding assets.
-- Column ↔ SkinInput mapping (src/core/branding/persistence.ts):
--   accent_hue→ah  accent_chroma→ac  neutral_hue→nh  neutral_chroma→nc
--   semantic_chroma→sc  font_family→font  mono_font_family→mono
--   weight_bold→wb  weight_semibold→ws  accent_lightness→al
--   accent_lightness_dark→alDark  accent_ink_lightness→ink
-- Resolved CSS variables and product geometry (radii) are never stored.
create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  display_name text not null,
  logo_light_path text,
  logo_dark_path text,
  favicon_path text,
  accent_hue numeric not null,
  accent_chroma numeric not null,
  neutral_hue numeric not null,
  neutral_chroma numeric not null,
  semantic_chroma numeric not null,
  font_family text not null,
  mono_font_family text not null,
  weight_bold integer not null,
  weight_semibold integer not null,
  accent_lightness numeric,
  accent_lightness_dark numeric,
  accent_ink_lightness numeric,
  default_appearance text not null default 'light'
    check (default_appearance in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------- membership helpers
-- SECURITY DEFINER is required here, not convenience: policies on
-- workspace_members cannot query workspace_members without infinite
-- recursion. Both functions are STABLE, pin search_path, read a single
-- indexed table, and are executable by authenticated users only.

create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.workspace_role(ws uuid)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select m.role from public.workspace_members m
  where m.workspace_id = ws and m.user_id = (select auth.uid());
$$;

revoke execute on function public.is_workspace_member (uuid) from public, anon;
revoke execute on function public.workspace_role (uuid) from public, anon;
grant execute on function public.is_workspace_member (uuid) to authenticated;
grant execute on function public.workspace_role (uuid) to authenticated;

-- ------------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_settings enable row level security;

-- profiles: a user manages only their own row.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- workspaces: visible to members; any authenticated user may create one
-- (bootstrap); only owner/admin may update.
create policy "workspaces_select_member" on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy "workspaces_insert_creator" on public.workspaces
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "workspaces_update_admin" on public.workspaces
  for update to authenticated
  using (public.workspace_role(id) in ('owner', 'admin'))
  with check (public.workspace_role(id) in ('owner', 'admin'));

-- workspace_members: members can see membership of their workspaces. The
-- only self-service insert is the creator claiming the owner seat of a
-- workspace they created (bootstrap); invitations arrive in a later task.
create policy "members_select_member" on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members_insert_creator_owner" on public.workspace_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.created_by = (select auth.uid())
    )
  );

-- workspace_settings: members read; owner/admin write.
create policy "settings_select_member" on public.workspace_settings
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "settings_insert_admin" on public.workspace_settings
  for insert to authenticated
  with check (public.workspace_role(workspace_id) in ('owner', 'admin'));
create policy "settings_update_admin" on public.workspace_settings
  for update to authenticated
  using (public.workspace_role(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'admin'));

-- ------------------------------------------------------- branding storage
-- Public-read bucket: logos and favicons are not secrets and must render
-- in plain <img>/<link> tags without signing. Writes are restricted to
-- owner/admin of the workspace whose id is the first path segment:
--   branding/{workspace_id}/logo-light.svg …

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "branding_write_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'branding'
    and public.workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
  );

create policy "branding_update_admin" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'branding'
    and public.workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
  );

create policy "branding_delete_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'branding'
    and public.workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
  );
