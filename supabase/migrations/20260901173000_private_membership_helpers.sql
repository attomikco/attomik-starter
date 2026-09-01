-- Advisor 0029: membership helpers must not be RPC-callable via the
-- exposed public schema. Policies reference the functions by OID, so the
-- schema move keeps every policy working unchanged.
create schema if not exists private;
alter function public.is_workspace_member (uuid) set schema private;
alter function public.workspace_role (uuid) set schema private;
