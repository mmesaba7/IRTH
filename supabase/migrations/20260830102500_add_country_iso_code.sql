-- S15.2 — Country ISO code foundation for market detection
--
-- Stores the ISO 3166-1 alpha-2 country code on the Country entity itself.
-- This gives Market Detection, Shipping, Addresses, and future integrations
-- one canonical country identifier without duplicating mappings in app code.

alter table public.countries
  add column iso_code text;

update public.countries
set iso_code = case slug
  when 'egypt' then 'EG'
  when 'jordan' then 'JO'
  when 'morocco' then 'MA'
  when 'saudi-arabia' then 'SA'
  when 'uae' then 'AE'
  else iso_code
end;

do $$
begin
  if exists (
    select 1
    from public.countries
    where iso_code is null
  ) then
    raise exception 'Every country must have an ISO 3166-1 alpha-2 code before iso_code can become required';
  end if;
end;
$$;

alter table public.countries
  alter column iso_code set not null;

alter table public.countries
  add constraint countries_iso_code_format_check
  check (iso_code ~ '^[A-Z]{2}$');

alter table public.countries
  add constraint countries_iso_code_key
  unique (iso_code);
