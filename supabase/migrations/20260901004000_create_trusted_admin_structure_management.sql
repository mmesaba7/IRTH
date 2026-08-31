create table if not exists private.admin_structure_status_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('artisan','craft','country')),
  entity_id uuid not null,
  old_status text not null,
  new_status text not null,
  changed_by_user_id uuid not null references auth.users(id),
  reason text,
  changed_at timestamptz not null default now()
);
create index if not exists admin_structure_status_history_entity_idx on private.admin_structure_status_history(entity_type,entity_id,changed_at desc);
create index if not exists admin_structure_status_history_changed_by_idx on private.admin_structure_status_history(changed_by_user_id);
revoke all on table private.admin_structure_status_history from public,anon,authenticated,service_role;

create or replace function public.get_admin_structure_overview(p_admin_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' stable as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  return jsonb_build_object(
    'artisans',coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'slug',a.slug,'nameAr',a.name_ar,'nameEn',a.name_en,'status',a.status,
      'countryId',a.country_id,'countryName',c.name_en,'primaryCraftId',a.primary_craft_id,'primaryCraftName',cr.name_en,
      'hasAuthAccount',a.auth_user_id is not null,'createdAt',a.created_at,
      'publishedProductCount',(select count(*) from public.products p where p.artisan_id=a.id and p.lifecycle_status='published')
    ) order by a.created_at desc) from public.artisan_profiles a join public.countries c on c.id=a.country_id join public.crafts cr on cr.id=a.primary_craft_id),'[]'::jsonb),
    'crafts',coalesce((select jsonb_agg(jsonb_build_object(
      'id',c.id,'slug',c.slug,'nameAr',c.name_ar,'nameEn',c.name_en,'icon',c.icon,'isActive',c.is_active,
      'artisanCount',(select count(*) from public.artisan_profiles a where a.primary_craft_id=c.id),
      'activeArtisanCount',(select count(*) from public.artisan_profiles a where a.primary_craft_id=c.id and a.status='active'),
      'publishedProductCount',(select count(*) from public.products p where p.primary_craft_id=c.id and p.lifecycle_status='published'),
      'commissionRate',(select rate_percent from public.craft_commission_rates r where r.craft_id=c.id),
      'createdAt',c.created_at
    ) order by c.name_en) from public.crafts c),'[]'::jsonb),
    'countries',coalesce((select jsonb_agg(jsonb_build_object(
      'id',c.id,'slug',c.slug,'isoCode',c.iso_code,'nameAr',c.name_ar,'nameEn',c.name_en,'isActive',c.is_active,
      'artisanCount',(select count(*) from public.artisan_profiles a where a.country_id=c.id),
      'activeArtisanCount',(select count(*) from public.artisan_profiles a where a.country_id=c.id and a.status='active'),
      'publishedProductCount',(select count(*) from public.products p join public.artisan_profiles a on a.id=p.artisan_id where a.country_id=c.id and p.lifecycle_status='published'),
      'activeMarketCount',(select count(*) from public.markets m where m.country_id=c.id and m.is_active),
      'createdAt',c.created_at
    ) order by c.name_en) from public.countries c),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(jsonb_build_object(
      'id',h.id,'entityType',h.entity_type,'entityId',h.entity_id,'oldStatus',h.old_status,'newStatus',h.new_status,'reason',h.reason,'changedAt',h.changed_at
    ) order by h.changed_at desc) from (select * from private.admin_structure_status_history order by changed_at desc limit 50) h),'[]'::jsonb)
  );
end;$$;
revoke all on function public.get_admin_structure_overview(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_admin_structure_overview(uuid) to service_role;

create or replace function public.set_admin_artisan_status(p_artisan_id uuid,p_status text,p_admin_user_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_old text;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  if p_status not in ('pending_verification','active','under_review','suspended','deactivated') then raise exception 'invalid_artisan_status'; end if;
  select status into v_old from public.artisan_profiles where id=p_artisan_id for update;
  if not found then raise exception 'artisan_not_found'; end if;
  if v_old=p_status then return; end if;
  update public.artisan_profiles set status=p_status,updated_at=now() where id=p_artisan_id;
  insert into private.admin_structure_status_history(entity_type,entity_id,old_status,new_status,changed_by_user_id,reason)
  values('artisan',p_artisan_id,v_old,p_status,p_admin_user_id,nullif(trim(coalesce(p_reason,'')),''));
end;$$;
revoke all on function public.set_admin_artisan_status(uuid,text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.set_admin_artisan_status(uuid,text,uuid,text) to service_role;

create or replace function public.set_admin_craft_active(p_craft_id uuid,p_active boolean,p_admin_user_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_old boolean;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  select is_active into v_old from public.crafts where id=p_craft_id for update;
  if not found then raise exception 'craft_not_found'; end if;
  if v_old=p_active then return; end if;
  if not p_active and (exists(select 1 from public.artisan_profiles where primary_craft_id=p_craft_id and status='active') or exists(select 1 from public.products where primary_craft_id=p_craft_id and lifecycle_status='published')) then raise exception 'craft_in_use'; end if;
  update public.crafts set is_active=p_active,updated_at=now() where id=p_craft_id;
  insert into private.admin_structure_status_history(entity_type,entity_id,old_status,new_status,changed_by_user_id,reason)
  values('craft',p_craft_id,case when v_old then 'active' else 'inactive' end,case when p_active then 'active' else 'inactive' end,p_admin_user_id,nullif(trim(coalesce(p_reason,'')),''));
end;$$;
revoke all on function public.set_admin_craft_active(uuid,boolean,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.set_admin_craft_active(uuid,boolean,uuid,text) to service_role;

create or replace function public.set_admin_country_active(p_country_id uuid,p_active boolean,p_admin_user_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_old boolean;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  select is_active into v_old from public.countries where id=p_country_id for update;
  if not found then raise exception 'country_not_found'; end if;
  if v_old=p_active then return; end if;
  if not p_active and (exists(select 1 from public.artisan_profiles where country_id=p_country_id and status='active') or exists(select 1 from public.markets where country_id=p_country_id and is_active)) then raise exception 'country_in_use'; end if;
  update public.countries set is_active=p_active,updated_at=now() where id=p_country_id;
  insert into private.admin_structure_status_history(entity_type,entity_id,old_status,new_status,changed_by_user_id,reason)
  values('country',p_country_id,case when v_old then 'active' else 'inactive' end,case when p_active then 'active' else 'inactive' end,p_admin_user_id,nullif(trim(coalesce(p_reason,'')),''));
end;$$;
revoke all on function public.set_admin_country_active(uuid,boolean,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.set_admin_country_active(uuid,boolean,uuid,text) to service_role;
