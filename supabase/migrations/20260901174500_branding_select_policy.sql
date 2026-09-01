-- Fix 006.1: storage upsert (replace an existing logo) performs an
-- UPDATE, which needs SELECT to find the row. Without this policy the
-- first re-upload of an asset failed with 403 AccessDenied. Read stays
-- workspace-scoped for the API; public URL delivery is unaffected.
create policy "branding_select_member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'branding'
    and private.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
