create or replace function private.inspect_return_request(p_return_request_id uuid, p_items jsonb, p_note text default null)
returns table(return_request_id uuid, status text, changed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_status text;
  v_item jsonb;
  v_return_item_id uuid;
  v_restockable integer;
  v_qty integer;
  v_expected integer;
  v_seen integer := 0;
  v_now timestamptz := now();
begin
  if v_user_id is null or not (select private.is_super_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  select rr.status into v_status from private.return_requests rr where rr.id=p_return_request_id for update;
  if not found then raise exception 'return_request_not_found'; end if;
  if v_status = 'inspected' then return query select p_return_request_id,v_status,false; return; end if;
  if v_status <> 'received' then raise exception 'invalid_return_inspection_state'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'invalid_inspection_items'; end if;

  select count(*) into v_expected
  from private.return_request_items ri_expected
  where ri_expected.return_request_id=p_return_request_id;
  if jsonb_array_length(p_items) <> v_expected then raise exception 'inspection_must_cover_all_return_items'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_return_item_id := nullif(trim(v_item->>'returnItemId'),'')::uuid;
      v_restockable := (v_item->>'restockableQuantity')::integer;
    exception when others then raise exception 'invalid_inspection_item'; end;

    select ri.quantity into v_qty from private.return_request_items ri
    where ri.id=v_return_item_id and ri.return_request_id=p_return_request_id for update;
    if not found or v_restockable is null or v_restockable < 0 or v_restockable > v_qty then
      raise exception 'invalid_inspection_item';
    end if;
    if (select ri_existing.restockable_quantity from private.return_request_items ri_existing where ri_existing.id=v_return_item_id) is not null then
      raise exception 'duplicate_inspection_item';
    end if;
    update private.return_request_items ri_update
    set restockable_quantity=v_restockable,updated_at=v_now
    where ri_update.id=v_return_item_id;
    v_seen := v_seen + 1;
  end loop;

  if v_seen <> v_expected then raise exception 'inspection_must_cover_all_return_items'; end if;
  update private.return_requests rr_update
  set status='inspected',inspected_at=v_now,inspection_note=nullif(trim(p_note),''),updated_at=v_now
  where rr_update.id=p_return_request_id;
  insert into private.return_request_events(return_request_id,event_type,event_source,source_key,actor_user_id,metadata)
  values(p_return_request_id,'return_inspected','admin','return-inspected:'||p_return_request_id::text,v_user_id,jsonb_build_object('item_count',v_seen));
  return query select p_return_request_id,'inspected'::text,true;
end;
$$;
revoke all on function private.inspect_return_request(uuid,jsonb,text) from public, anon, authenticated, service_role;