create table if not exists private.commission_configuration_history (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('craft','artisan')),
  craft_id uuid references public.crafts(id) on delete set null,
  artisan_id uuid references public.artisan_profiles(id) on delete set null,
  old_rate_percent numeric,
  new_rate_percent numeric,
  changed_by_user_id uuid not null references auth.users(id),
  reason text,
  changed_at timestamptz not null default now(),
  check ((scope_type='craft' and craft_id is not null and artisan_id is null) or (scope_type='artisan' and artisan_id is not null and craft_id is null)),
  check (old_rate_percent is null or (old_rate_percent >= 0 and old_rate_percent <= 100)),
  check (new_rate_percent is null or (new_rate_percent >= 0 and new_rate_percent <= 100))
);

create index if not exists commission_configuration_history_changed_idx
  on private.commission_configuration_history(changed_at desc);
create index if not exists commission_configuration_history_craft_idx
  on private.commission_configuration_history(craft_id,changed_at desc) where craft_id is not null;
create index if not exists commission_configuration_history_artisan_idx
  on private.commission_configuration_history(artisan_id,changed_at desc) where artisan_id is not null;
revoke all on table private.commission_configuration_history from public,anon,authenticated,service_role;

create or replace function public.get_admin_commission_configuration(p_admin_user_id uuid)
returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  return jsonb_build_object(
    'crafts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'craftId',c.id,
        'slug',c.slug,
        'nameAr',c.name_ar,
        'nameEn',c.name_en,
        'ratePercent',ccr.rate_percent,
        'updatedAt',ccr.updated_at
      ) order by c.name_en)
      from public.crafts c
      left join public.craft_commission_rates ccr on ccr.craft_id=c.id
      where c.is_active=true
    ),'[]'::jsonb),
    'artisans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'artisanId',a.id,
        'slug',a.slug,
        'nameAr',a.name_ar,
        'nameEn',a.name_en,
        'primaryCraftId',a.primary_craft_id,
        'primaryCraftNameEn',c.name_en,
        'craftRatePercent',ccr.rate_percent,
        'overrideRatePercent',aco.rate_percent,
        'effectiveRatePercent',coalesce(aco.rate_percent,ccr.rate_percent),
        'updatedAt',aco.updated_at
      ) order by a.name_en)
      from public.artisan_profiles a
      join public.crafts c on c.id=a.primary_craft_id
      left join public.craft_commission_rates ccr on ccr.craft_id=a.primary_craft_id
      left join public.artisan_commission_overrides aco on aco.artisan_id=a.id
      where a.status='active'
    ),'[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(row_data order by changed_at desc)
      from (
        select h.changed_at,
          jsonb_build_object(
            'id',h.id,
            'scopeType',h.scope_type,
            'craftId',h.craft_id,
            'artisanId',h.artisan_id,
            'oldRatePercent',h.old_rate_percent,
            'newRatePercent',h.new_rate_percent,
            'reason',h.reason,
            'changedAt',h.changed_at
          ) row_data
        from private.commission_configuration_history h
        order by h.changed_at desc
        limit 50
      ) q
    ),'[]'::jsonb)
  );
end;$$;
revoke all on function public.get_admin_commission_configuration(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_admin_commission_configuration(uuid) to service_role;

create or replace function public.set_admin_craft_commission_rate(
  p_craft_id uuid,
  p_rate_percent numeric,
  p_admin_user_id uuid,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path='' as $$
declare v_old numeric;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  if p_rate_percent is null or p_rate_percent < 0 or p_rate_percent > 100 then raise exception 'invalid_commission_rate'; end if;
  if not exists(select 1 from public.crafts where id=p_craft_id) then raise exception 'craft_not_found'; end if;

  select rate_percent into v_old from public.craft_commission_rates where craft_id=p_craft_id for update;
  if found and v_old is not distinct from p_rate_percent then return; end if;

  insert into public.craft_commission_rates(craft_id,rate_percent,updated_by)
  values(p_craft_id,p_rate_percent,p_admin_user_id)
  on conflict (craft_id) do update set rate_percent=excluded.rate_percent,updated_by=excluded.updated_by,updated_at=now();

  insert into private.commission_configuration_history(scope_type,craft_id,old_rate_percent,new_rate_percent,changed_by_user_id,reason)
  values('craft',p_craft_id,v_old,p_rate_percent,p_admin_user_id,nullif(trim(coalesce(p_reason,'')),''));
end;$$;
revoke all on function public.set_admin_craft_commission_rate(uuid,numeric,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.set_admin_craft_commission_rate(uuid,numeric,uuid,text) to service_role;

create or replace function public.set_admin_artisan_commission_override(
  p_artisan_id uuid,
  p_rate_percent numeric,
  p_admin_user_id uuid,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path='' as $$
declare v_old numeric;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  if p_rate_percent is null or p_rate_percent < 0 or p_rate_percent > 100 then raise exception 'invalid_commission_rate'; end if;
  if not exists(select 1 from public.artisan_profiles where id=p_artisan_id) then raise exception 'artisan_not_found'; end if;

  select rate_percent into v_old from public.artisan_commission_overrides where artisan_id=p_artisan_id for update;
  if found and v_old is not distinct from p_rate_percent then return; end if;

  insert into public.artisan_commission_overrides(artisan_id,rate_percent,updated_by)
  values(p_artisan_id,p_rate_percent,p_admin_user_id)
  on conflict (artisan_id) do update set rate_percent=excluded.rate_percent,updated_by=excluded.updated_by,updated_at=now();

  insert into private.commission_configuration_history(scope_type,artisan_id,old_rate_percent,new_rate_percent,changed_by_user_id,reason)
  values('artisan',p_artisan_id,v_old,p_rate_percent,p_admin_user_id,nullif(trim(coalesce(p_reason,'')),''));
end;$$;
revoke all on function public.set_admin_artisan_commission_override(uuid,numeric,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.set_admin_artisan_commission_override(uuid,numeric,uuid,text) to service_role;

create or replace function public.clear_admin_artisan_commission_override(
  p_artisan_id uuid,
  p_admin_user_id uuid,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path='' as $$
declare v_old numeric;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  select rate_percent into v_old from public.artisan_commission_overrides where artisan_id=p_artisan_id for update;
  if not found then return; end if;
  delete from public.artisan_commission_overrides where artisan_id=p_artisan_id;
  insert into private.commission_configuration_history(scope_type,artisan_id,old_rate_percent,new_rate_percent,changed_by_user_id,reason)
  values('artisan',p_artisan_id,v_old,null,p_admin_user_id,nullif(trim(coalesce(p_reason,'')),''));
end;$$;
revoke all on function public.clear_admin_artisan_commission_override(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.clear_admin_artisan_commission_override(uuid,uuid,text) to service_role;
