-- Wholesale MVP: simple IRTH-only request intake. Customer contact remains private.

create table private.wholesale_requests (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('general','product')),
  product_id uuid references public.products(id) on delete set null,
  craft_id uuid references public.crafts(id) on delete set null,
  customer_user_id uuid references auth.users(id) on delete set null,
  requester_name text not null check (char_length(trim(requester_name)) between 2 and 160),
  company_name text,
  country_name text not null check (char_length(trim(country_name)) between 2 and 120),
  contact_details text not null check (char_length(trim(contact_details)) between 3 and 500),
  requested_product_or_craft text not null check (char_length(trim(requested_product_or_craft)) between 2 and 500),
  quantity integer not null check (quantity > 0),
  destination text,
  notes text,
  is_closed boolean not null default false,
  admin_note text,
  closed_at timestamptz,
  closed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_type <> 'product' or product_id is not null),
  check (company_name is null or char_length(trim(company_name)) between 1 and 200),
  check (destination is null or char_length(trim(destination)) <= 500),
  check (notes is null or char_length(trim(notes)) <= 4000),
  check (admin_note is null or char_length(trim(admin_note)) <= 4000)
);

create index wholesale_requests_open_created_idx on private.wholesale_requests(is_closed,created_at desc);
create index wholesale_requests_product_idx on private.wholesale_requests(product_id,created_at desc) where product_id is not null;
revoke all on table private.wholesale_requests from public,anon,authenticated,service_role;

create or replace function private.create_wholesale_request(p_source_type text,p_product_id uuid,p_craft_id uuid,p_customer_user_id uuid,p_requester_name text,p_company_name text,p_country_name text,p_contact_details text,p_requested_product_or_craft text,p_quantity integer,p_destination text,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_source_type not in ('general','product') then raise exception 'invalid_wholesale_source'; end if;
  if p_source_type='product' and p_product_id is null then raise exception 'wholesale_product_required'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'invalid_wholesale_quantity'; end if;
  if char_length(trim(coalesce(p_requester_name,''))) not between 2 and 160 then raise exception 'invalid_wholesale_name'; end if;
  if char_length(trim(coalesce(p_country_name,''))) not between 2 and 120 then raise exception 'invalid_wholesale_country'; end if;
  if char_length(trim(coalesce(p_contact_details,''))) not between 3 and 500 then raise exception 'invalid_wholesale_contact'; end if;
  if char_length(trim(coalesce(p_requested_product_or_craft,''))) not between 2 and 500 then raise exception 'invalid_wholesale_request'; end if;
  insert into private.wholesale_requests(source_type,product_id,craft_id,customer_user_id,requester_name,company_name,country_name,contact_details,requested_product_or_craft,quantity,destination,notes)
  values(p_source_type,p_product_id,p_craft_id,p_customer_user_id,trim(p_requester_name),nullif(trim(coalesce(p_company_name,'')),''),trim(p_country_name),trim(p_contact_details),trim(p_requested_product_or_craft),p_quantity,nullif(trim(coalesce(p_destination,'')),''),nullif(trim(coalesce(p_notes,'')),'')) returning id into v_id;
  return v_id;
end;$$;

create or replace function public.create_wholesale_request(p_source_type text,p_product_id uuid,p_craft_id uuid,p_customer_user_id uuid,p_requester_name text,p_company_name text,p_country_name text,p_contact_details text,p_requested_product_or_craft text,p_quantity integer,p_destination text,p_notes text)
returns uuid language sql security definer set search_path='' as $$ select private.create_wholesale_request($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12); $$;
revoke all on function public.create_wholesale_request(text,uuid,uuid,uuid,text,text,text,text,text,integer,text,text) from public,anon,authenticated,service_role;
grant execute on function public.create_wholesale_request(text,uuid,uuid,uuid,text,text,text,text,text,integer,text,text) to service_role;

create or replace function public.get_wholesale_requests_for_admin(p_admin_user_id uuid,p_include_closed boolean default false)
returns table(id uuid,source_type text,product_id uuid,craft_id uuid,customer_user_id uuid,requester_name text,company_name text,country_name text,contact_details text,requested_product_or_craft text,quantity integer,destination text,notes text,is_closed boolean,admin_note text,created_at timestamptz,closed_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  return query select w.id,w.source_type,w.product_id,w.craft_id,w.customer_user_id,w.requester_name,w.company_name,w.country_name,w.contact_details,w.requested_product_or_craft,w.quantity,w.destination,w.notes,w.is_closed,w.admin_note,w.created_at,w.closed_at
  from private.wholesale_requests w where p_include_closed or not w.is_closed order by w.created_at desc;
end;$$;
revoke all on function public.get_wholesale_requests_for_admin(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.get_wholesale_requests_for_admin(uuid,boolean) to service_role;

create or replace function public.set_wholesale_request_closed(p_request_id uuid,p_admin_user_id uuid,p_closed boolean,p_admin_note text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  update private.wholesale_requests set is_closed=p_closed,admin_note=nullif(trim(coalesce(p_admin_note,'')),''),closed_at=case when p_closed then now() else null end,closed_by_user_id=case when p_closed then p_admin_user_id else null end,updated_at=now() where id=p_request_id;
  if not found then raise exception 'wholesale_request_not_found'; end if;
end;$$;
revoke all on function public.set_wholesale_request_closed(uuid,uuid,boolean,text) from public,anon,authenticated,service_role;
grant execute on function public.set_wholesale_request_closed(uuid,uuid,boolean,text) to service_role;

create or replace function private.notify_admin_wholesale_request()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_admin record;
begin
  for v_admin in select distinct ur.user_id from public.user_roles ur join public.roles r on r.id=ur.role_id where r.code='super_admin' loop
    perform private.emit_notification(v_admin.user_id,'wholesale_request_received','طلب جملة جديد','New wholesale request','يوجد طلب جملة جديد يحتاج مراجعة من IRTH.','A new wholesale request needs IRTH review.','/dashboard-admin/wholesale','wholesale_request',new.id,format('inapp:admin:%s:wholesale:%s',v_admin.user_id,new.id));
  end loop;
  return new;
end;$$;
revoke all on function private.notify_admin_wholesale_request() from public,anon,authenticated,service_role;

drop trigger if exists wholesale_request_admin_notification_trigger on private.wholesale_requests;
create trigger wholesale_request_admin_notification_trigger after insert on private.wholesale_requests
for each row execute function private.notify_admin_wholesale_request();
