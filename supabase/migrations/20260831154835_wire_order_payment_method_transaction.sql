-- M2.2 — Atomic Order + Payment Method wiring
-- Approved Payment methods for the MVP core: COD and Online.

create or replace function private.create_order_with_payment_transaction(
  p_order jsonb,
  p_customer jsonb,
  p_items jsonb,
  p_idempotency_scope text,
  p_idempotency_key text,
  p_payment_method text,
  p_guest_access_token_hash text default null
)
returns table(order_id uuid, order_number text, payment_method text, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result record;
  v_payment private.payments%rowtype;
  v_order public.orders%rowtype;
  v_market public.markets%rowtype;
  v_method text := lower(trim(coalesce(p_payment_method, '')));
begin
  if v_method not in ('cod', 'online') then
    raise exception 'invalid_payment_method';
  end if;

  select * into v_result
  from public.create_order_transaction(
    p_order,
    p_customer,
    p_items,
    p_idempotency_scope,
    p_idempotency_key,
    p_guest_access_token_hash
  );

  if v_result.order_id is null then
    raise exception 'order_transaction_missing_result';
  end if;

  select * into v_order
  from public.orders
  where id = v_result.order_id
  for update;

  if not found then
    raise exception 'payment_order_missing';
  end if;

  select * into v_payment
  from private.payments
  where order_id = v_order.id
  for update;

  if found then
    if v_payment.method is null then
      if v_result.reused then
        raise exception 'payment_method_unknown_for_reused_order';
      end if;

      update private.payments
      set method = v_method,
          updated_at = now()
      where id = v_payment.id
      returning * into v_payment;
    elsif v_payment.method <> v_method then
      raise exception 'payment_method_mismatch';
    end if;
  else
    if v_result.reused then
      raise exception 'payment_record_missing_for_reused_order';
    end if;

    select * into v_market
    from public.markets
    where id = v_order.market_id;

    if not found or v_market.currency_minor_unit_scale is null then
      raise exception 'payment_currency_configuration_missing';
    end if;

    insert into private.payments (
      order_id,
      method,
      status,
      amount,
      currency_code,
      currency_minor_unit_scale,
      created_at,
      updated_at
    ) values (
      v_order.id,
      v_method,
      v_order.payment_status,
      v_order.final_total,
      v_order.currency_code,
      v_market.currency_minor_unit_scale,
      v_order.created_at,
      now()
    )
    returning * into v_payment;
  end if;

  insert into private.payment_events (
    payment_id,
    event_type,
    event_source,
    source_key,
    amount,
    currency_code,
    metadata
  ) values (
    v_payment.id,
    'payment_initialized',
    'system',
    'payment-init:' || v_order.id::text,
    v_payment.amount,
    v_payment.currency_code,
    jsonb_build_object('method', v_method, 'order_payment_status', v_order.payment_status)
  )
  on conflict (source_key) do nothing;

  return query
  select v_order.id, v_order.order_number, v_method, coalesce(v_result.reused, false);
end;
$$;

revoke all on function private.create_order_with_payment_transaction(jsonb, jsonb, jsonb, text, text, text, text)
from public, anon, authenticated, service_role;

grant execute on function private.create_order_with_payment_transaction(jsonb, jsonb, jsonb, text, text, text, text)
to service_role;

create or replace function public.create_order_with_payment_transaction(
  p_order jsonb,
  p_customer jsonb,
  p_items jsonb,
  p_idempotency_scope text,
  p_idempotency_key text,
  p_payment_method text,
  p_guest_access_token_hash text default null
)
returns table(order_id uuid, order_number text, payment_method text, reused boolean)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.create_order_with_payment_transaction(
    p_order,
    p_customer,
    p_items,
    p_idempotency_scope,
    p_idempotency_key,
    p_payment_method,
    p_guest_access_token_hash
  );
$$;

revoke all on function public.create_order_with_payment_transaction(jsonb, jsonb, jsonb, text, text, text, text)
from public, anon, authenticated;

grant execute on function public.create_order_with_payment_transaction(jsonb, jsonb, jsonb, text, text, text, text)
to service_role;
