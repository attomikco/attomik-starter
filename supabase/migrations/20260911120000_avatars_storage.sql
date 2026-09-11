-- Settings → Profile: a person's own avatar photo.
--
-- Public-read bucket, same reasoning as branding: an avatar renders in a
-- plain <img> across the app (sidebar, command bar, Team's member list)
-- without signing. Unlike branding (workspace-admin-scoped), writes here
-- are scoped to the uploader's own folder — every member manages their
-- own avatar regardless of workspace role:
--   avatars/{user_id}/avatar.{ext}

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_write_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Mirrors branding_select_member (20260901174500): an upsert (replacing an
-- existing avatar) performs an UPDATE, which needs SELECT to find the row.
create policy "avatars_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
