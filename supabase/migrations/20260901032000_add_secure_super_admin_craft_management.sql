create table if not exists private.craft_management_history (
  id bigint generated always as identity primary key,
  craft_id uuid,
  action text not null check (action in ('created','updated','deleted')),
  old_data jsonb,
  new_data jsonb,
  changed_by_user_id uuid not null references auth.users(id),
  reason text,
  changed_at timestamptz not null default now(),
  check (old_data is null or jsonb_typeof(old_data) = 'object'),
  check (new_data is null or jsonb_typeof(new_data) = 'object')
);

create index if not exists craft_management_history_craft_changed_idx
  on private.craft_management_history(craft_id, changed_at desc, id desc);
create index if not exists craft_management_history_admin_idx
  on private.craft_management_history(changed_by_user_id);

create or replace function public.create_admin_craft(
  p_slug text,
  p_name_ar text,
  p_name_en text,
  p_icon text,
  p_admin_user_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text := lower(trim(p_slug));
  v_name_ar text := trim(p_name_ar);
  v_name_en text := trim(p_name_en);
  v_icon text := nullif(trim(coalesce(p_icon,'')), '');
begin
  perform private.require_super_admin_user(p_admin_user_id);

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(v_slug) > 80 then
    raise exception 'invalid_craft_slug';
  end if;
  if v_name_ar = '' or length(v_name_ar) > 120 or v_name_en = '' or length(v_name_en) > 120 then
    raise exception 'invalid_craft_name';
  end if;
  if v_icon is not null and length(v_icon) > 32 then
    raise exception 'invalid_craft_icon';
  end if;
  if p_reason is not null and length(trim(p_reason)) > 1000 then
    raise exception 'invalid_reason';
  end if;

  if exists(select 1 from public.crafts where slug = v_slug) then
    raise exception 'craft_slug_exists';
  end if;

  insert into public.crafts(slug, name_ar, name_en, icon, is_active, created_at, updated_at)
  values (v_slug, v_name_ar, v_name_en, v_icon, true, now(), now())
  returning id into v_id;

  insert into private.craft_management_history(craft_id, action, old_data, new_data, changed_by_user_id, reason)
  select c.id, 'created', null,
    jsonb_build_object('slug',c.slug,'nameAr',c.name_ar,'nameEn',c.name_en,'icon',c.icon,'isActive',c.is_active),
    p_admin_user_id, nullif(trim(coalesce(p_reason,'')), '')
  from public.crafts c where c.id = v_id;

  return v_id;
end;
$$;

create or replace function public.update_admin_craft(
  p_craft_id uuid,
  p_name_ar text,
  p_name_en text,
  p_icon text,
  p_admin_user_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.crafts%rowtype;
  v_new public.crafts%rowtype;
  v_name_ar text := trim(p_name_ar);
  v_name_en text := trim(p_name_en);
  v_icon text := nullif(trim(coalesce(p_icon,'')), '');
begin
  perform private.require_super_admin_user(p_admin_user_id);

  if v_name_ar = '' or length(v_name_ar) > 120 or v_name_en = '' or length(v_name_en) > 120 then
    raise exception 'invalid_craft_name';
  end if;
  if v_icon is not null and length(v_icon) > 32 then
    raise exception 'invalid_craft_icon';
  end if;
  if p_reason is not null and length(trim(p_reason)) > 1000 then
    raise exception 'invalid_reason';
  end if;

  select * into v_old from public.crafts where id = p_craft_id for update;
  if not found then raise exception 'craft_not_found'; end if;

  update public.crafts
  set name_ar = v_name_ar,
      name_en = v_name_en,
      icon = v_icon,
      updated_at = now()
  where id = p_craft_id
  returning * into v_new;

  insert into private.craft_management_history(craft_id, action, old_data, new_data, changed_by_user_id, reason)
  values (
    p_craft_id, 'updated',
    jsonb_build_object('slug',v_old.slug,'nameAr',v_old.name_ar,'nameEn',v_old.name_en,'icon',v_old.icon,'isActive',v_old.is_active),
    jsonb_build_object('slug',v_new.slug,'nameAr',v_new.name_ar,'nameEn',v_new.name_en,'icon',v_new.icon,'isActive',v_new.is_active),
    p_admin_user_id, nullif(trim(coalesce(p_reason,'')), '')
  );
end;
$$;

create or replace function public.delete_admin_unused_craft(
  p_craft_id uuid,
  p_admin_user_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.crafts%rowtype;
begin
  perform private.require_super_admin_user(p_admin_user_id);

  if p_reason is not null and length(trim(p_reason)) > 1000 then
    raise exception 'invalid_reason';
  end if;

  select * into v_old from public.crafts where id = p_craft_id for update;
  if not found then raise exception 'craft_not_found'; end if;

  if exists(select 1 from public.artisan_profiles where primary_craft_id = p_craft_id)
     or exists(select 1 from public.products where primary_craft_id = p_craft_id)
     or exists(select 1 from public.craft_commission_rates where craft_id = p_craft_id) then
    raise exception 'craft_has_history';
  end if;

  insert into private.craft_management_history(craft_id, action, old_data, new_data, changed_by_user_id, reason)
  values (
    p_craft_id, 'deleted',
    jsonb_build_object('slug',v_old.slug,'nameAr',v_old.name_ar,'nameEn',v_old.name_en,'icon',v_old.icon,'isActive',v_old.is_active),
    null, p_admin_user_id, nullif(trim(coalesce(p_reason,'')), '')
  );

  delete from public.crafts where id = p_craft_id;
end;
$$;

revoke all on function public.create_admin_craft(text,text,text,text,uuid,text) from public, anon, authenticated;
revoke all on function public.update_admin_craft(uuid,text,text,text,uuid,text) from public, anon, authenticated;
revoke all on function public.delete_admin_unused_craft(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.create_admin_craft(text,text,text,text,uuid,text) to service_role;
grant execute on function public.update_admin_craft(uuid,text,text,text,uuid,text) to service_role;
grant execute on function public.delete_admin_unused_craft(uuid,uuid,text) to service_role;
revoke all on private.craft_management_history from anon, authenticated;
