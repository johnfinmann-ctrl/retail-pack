-- ============================================================================
-- 0003_storage_policies.sql
-- Storage-policies (PRS §13). Følger samme sti-mønster som
-- @platform/auth's buildStoragePath(): {company_id}/{app_key}/{entity_type}/{entity_id}/{filnavn}
--
-- Bucket "platform-files" oprettes én gang og deles af alle apps —
-- isolationen sker via stien, ikke via separate buckets pr. tenant.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('platform-files', 'platform-files', false)
on conflict (id) do nothing;

-- Første sti-segment SKAL matche brugerens company_id fra JWT'et.
create policy storage_tenant_isolation_select on storage.objects
  for select
  using (
    bucket_id = 'platform-files'
    and (storage.foldername(name))[1] = platform_jwt_company_id()::text
  );

create policy storage_tenant_isolation_insert on storage.objects
  for insert
  with check (
    bucket_id = 'platform-files'
    and (storage.foldername(name))[1] = platform_jwt_company_id()::text
  );

create policy storage_tenant_isolation_delete on storage.objects
  for delete
  using (
    bucket_id = 'platform-files'
    and (storage.foldername(name))[1] = platform_jwt_company_id()::text
    and platform_jwt_role() in ('admin', 'superadmin')
  );
