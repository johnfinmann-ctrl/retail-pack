-- Lokal udviklings-seed. ALDRIG kør denne mod et produktionsmiljø.
insert into companies (id, name, slug, status, locale_default)
values ('00000000-0000-0000-0000-000000000001', 'Carletti (dev)', 'carletti-dev', 'active', 'da')
on conflict (id) do nothing;

insert into app_registry (company_id, app_key, enabled)
values ('00000000-0000-0000-0000-000000000001', 'retailpackpro', true)
on conflict (company_id, app_key) do nothing;
