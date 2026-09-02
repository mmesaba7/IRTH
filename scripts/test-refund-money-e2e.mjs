import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";

function fail(message) {
  throw new Error(message);
}

function runCommandSync(command, args, options = {}) {
  if (isWindows) {
    const quoted = [command, ...args]
      .map((part) => (/\s/.test(part) ? `"${part.replaceAll('"', '\\"')}"` : part))
      .join(" ");
    return spawnSync("cmd.exe", ["/d", "/s", "/c", quoted], {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: false,
      ...options,
    });
  }
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    ...options,
  });
}

function ensureLocalSupabase() {
  const result = runCommandSync(isWindows ? "npx.cmd" : "npx", ["supabase", "status"]);
  if (result.error) fail(`Unable to read local Supabase status: ${result.error.message}`);
  if (result.status !== 0) fail(`Local Supabase is not ready.\n${result.stderr || result.stdout}`);
}

function sqlJson(sql) {
  const query = `select coalesce(json_agg(row_to_json(q)), '[]'::json)::text from (${sql}) q;`;
  const result = spawnSync(
    "docker",
    ["exec", "-i", "supabase_db_irth", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-v", "ON_ERROR_STOP=1"],
    { cwd: process.cwd(), encoding: "utf8", shell: false, input: `${query}\n` }
  );
  if (result.error) fail(`Unable to query local Postgres through Docker: ${result.error.message}`);
  if (result.status !== 0) fail(`Local Postgres query failed:\n${result.stderr || result.stdout}`);
  const output = result.stdout.trim();
  if (!output) return [];
  try { return JSON.parse(output); } catch { fail(`Unable to parse local Postgres JSON output: ${output}`); }
}

function runTransactionalSql(sql) {
  const result = spawnSync(
    "docker",
    ["exec", "-i", "supabase_db_irth", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { cwd: process.cwd(), encoding: "utf8", shell: false, input: sql }
  );
  if (result.error) fail(`Unable to run local Postgres Refund/Money E2E through Docker: ${result.error.message}`);
  if (result.status !== 0) fail(`Refund/Money E2E failed:\n${result.stderr || result.stdout}`);
  return `${result.stdout}\n${result.stderr}`;
}

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

ensureLocalSupabase();

const fixtures = sqlJson(`
  select o.id as order_id, o.order_number
  from public.orders o
  where o.customer_user_id is null
    and o.guest_access_token_hash is not null
    and o.status = 'received'
    and o.payment_status = 'pending'
    and exists (
      select 1 from private.payments p
      where p.order_id=o.id and p.method='cod' and p.status='pending'
    )
    and (select count(*) from public.order_artisan_groups g where g.order_id=o.id) = 3
    and (select count(*) from public.order_items oi where oi.order_id=o.id) = 3
    and exists (
      select 1 from public.order_items oi
      where oi.order_id=o.id and oi.tax_rate_percent>0 and oi.tax_amount>0
    )
  order by o.created_at desc
  limit 1
`);

if (fixtures.length !== 1) {
  fail("Expected the latest tax-bearing Guest COD Order Foundation fixture in received/pending state. Run test:order-foundation-e2e first after applying the Tax migration.");
}

const fixture = fixtures[0];

const sql = `
BEGIN;

DO $e2e$
DECLARE
  v_order_id uuid := ${literal(fixture.order_id)}::uuid;
  v_admin_user_id uuid := pg_catalog.gen_random_uuid();
  v_super_admin_role_id uuid;
  v_artisan_role_id uuid;
  v_group record;
  v_artisan_user_id uuid;
  v_shipment record;
  v_order_item record;
  v_return_request_id uuid;
  v_return_item_id uuid;
  v_refund record;
  v_success record;
  v_retry record;
  v_product_qty_before integer;
  v_product_qty_after integer;
  v_return_status text;
  v_payment_status text;
  v_refund_status text;
  v_reversal_count integer;
  v_tax_reversal_count integer;
  v_tax_reversal_amount numeric;
  v_restored_qty integer;
BEGIN
  select r.id into v_super_admin_role_id from public.roles r where r.code='super_admin' limit 1;
  select r.id into v_artisan_role_id from public.roles r where r.code='artisan' limit 1;
  if v_super_admin_role_id is null then raise exception 'super_admin_role_missing'; end if;
  if v_artisan_role_id is null then raise exception 'artisan_role_missing'; end if;

  insert into auth.users (
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_admin_user_id,'authenticated','authenticated','irth-e2e-refund-admin@example.com','',pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,pg_catalog.now(),pg_catalog.now()
  );
  insert into public.user_roles(user_id,role_id) values(v_admin_user_id,v_super_admin_role_id);

  perform pg_catalog.set_config('request.jwt.claim.sub',v_admin_user_id::text,true);
  perform pg_catalog.set_config('request.jwt.claims',pg_catalog.json_build_object('sub',v_admin_user_id,'role','authenticated')::text,true);
  perform public.confirm_admin_order(v_order_id);

  for v_group in
    select g.id,g.artisan_id,ap.auth_user_id
    from public.order_artisan_groups g
    join public.artisan_profiles ap on ap.id=g.artisan_id
    where g.order_id=v_order_id
    order by g.id
  loop
    v_artisan_user_id := v_group.auth_user_id;
    if v_artisan_user_id is null then
      v_artisan_user_id := pg_catalog.gen_random_uuid();
      insert into auth.users (
        instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
        raw_app_meta_data,raw_user_meta_data,created_at,updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000'::uuid,
        v_artisan_user_id,'authenticated','authenticated',
        'irth-e2e-refund-artisan-'||replace(v_group.artisan_id::text,'-','')||'@example.com','',pg_catalog.now(),
        '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,pg_catalog.now(),pg_catalog.now()
      );
      update public.artisan_profiles ap set auth_user_id=v_artisan_user_id
      where ap.id=v_group.artisan_id and ap.auth_user_id is null;
    end if;
    insert into public.user_roles(user_id,role_id) values(v_artisan_user_id,v_artisan_role_id) on conflict do nothing;

    perform pg_catalog.set_config('request.jwt.claim.sub',v_artisan_user_id::text,true);
    perform pg_catalog.set_config('request.jwt.claims',pg_catalog.json_build_object('sub',v_artisan_user_id,'role','authenticated')::text,true);
    perform public.update_my_artisan_fulfillment_status(v_group.id,'preparing');
    perform public.update_my_artisan_fulfillment_status(v_group.id,'ready_for_courier_pickup');
  end loop;

  perform pg_catalog.set_config('request.jwt.claim.sub',v_admin_user_id::text,true);
  perform pg_catalog.set_config('request.jwt.claims',pg_catalog.json_build_object('sub',v_admin_user_id,'role','authenticated')::text,true);
  for v_shipment in select s.id from public.shipments s where s.order_id=v_order_id order by s.id
  loop
    perform public.update_admin_shipment_status(v_shipment.id,'picked_up_from_artisan');
    perform public.update_admin_shipment_status(v_shipment.id,'in_transit');
    perform public.update_admin_shipment_status(v_shipment.id,'delivered');
  end loop;

  perform public.record_admin_cod_collected(v_order_id);

  select oi.id,oi.product_id,oi.quantity
  into v_order_item
  from public.order_items oi
  join public.products p on p.id=oi.product_id
  where oi.order_id=v_order_id and p.quantity is not null and not p.made_to_order
    and oi.tax_rate_percent>0 and oi.tax_amount>0
  order by oi.id
  limit 1;
  if v_order_item.id is null then raise exception 'tax_bearing_finite_inventory_order_item_required'; end if;

  select p.quantity into v_product_qty_before from public.products p where p.id=v_order_item.product_id;

  select public.create_guest_return_request(
    v_order_id,
    (select o.guest_access_token_hash from public.orders o where o.id=v_order_id),
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'orderItemId',v_order_item.id,
      'quantity',1,
      'reason','Local refund E2E return reason'
    ))
  ) into v_return_request_id;

  perform public.admin_review_return_request(v_return_request_id,v_admin_user_id,'approved','Refund Money E2E');
  perform public.admin_mark_return_received(v_return_request_id,v_admin_user_id);

  select ri.id into v_return_item_id
  from private.return_request_items ri
  where ri.return_request_id=v_return_request_id and ri.order_item_id=v_order_item.id;
  if v_return_item_id is null then raise exception 'return_item_missing'; end if;

  perform public.admin_inspect_return_request(
    v_return_request_id,
    v_admin_user_id,
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('returnItemId',v_return_item_id,'restockableQuantity',1)),
    'Restockable local E2E item'
  );

  select * into v_refund from public.admin_prepare_return_refund(v_return_request_id,v_admin_user_id);
  if not v_refund.changed or v_refund.total_amount<=0 or v_refund.shipping_amount<>0 then
    raise exception 'refund_preparation_invalid';
  end if;

  select rr.status into v_return_status from private.return_requests rr where rr.id=v_return_request_id;
  if v_return_status<>'refund_pending' then raise exception 'expected_refund_pending_got_%',v_return_status; end if;

  select * into v_success from private.record_return_refund_succeeded(
    v_refund.refund_id,
    'refund-e2e-success-'||v_refund.refund_id::text,
    null,
    null
  );
  if not v_success.changed or v_success.refund_status<>'succeeded' then raise exception 'refund_success_invalid'; end if;

  select * into v_retry from private.record_return_refund_succeeded(
    v_refund.refund_id,
    'refund-e2e-retry-'||v_refund.refund_id::text,
    null,
    null
  );
  if v_retry.changed or v_retry.refund_status<>'succeeded' then raise exception 'refund_success_idempotency_failed'; end if;

  select rr.status into v_return_status from private.return_requests rr where rr.id=v_return_request_id;
  select r.status into v_refund_status from private.refunds r where r.id=v_refund.refund_id;
  select o.payment_status into v_payment_status from public.orders o where o.id=v_order_id;
  if v_return_status<>'refunded' then raise exception 'expected_return_refunded_got_%',v_return_status; end if;
  if v_refund_status<>'succeeded' then raise exception 'expected_refund_succeeded_got_%',v_refund_status; end if;
  if v_payment_status not in ('partially_refunded','refunded') then raise exception 'unexpected_payment_status_%',v_payment_status; end if;

  select count(*) into v_reversal_count
  from private.artisan_settlement_ledger l
  where l.order_id=v_order_id
    and l.order_item_id=v_order_item.id
    and l.source='return_refund'
    and l.entry_type in ('refund_merchandise_reversal','refund_irth_subsidy_reversal','refund_commission_reversal');
  if v_reversal_count<>3 then raise exception 'expected_3_core_refund_reversal_entries_got_%',v_reversal_count; end if;

  select count(*),coalesce(max(l.amount),0)
  into v_tax_reversal_count,v_tax_reversal_amount
  from private.artisan_settlement_ledger l
  where l.order_id=v_order_id
    and l.order_item_id=v_order_item.id
    and l.source='return_refund'
    and l.entry_type='refund_tax_reversal';
  if v_tax_reversal_count<>1 then raise exception 'expected_1_tax_refund_reversal_got_%',v_tax_reversal_count; end if;
  if v_tax_reversal_amount<=0 then raise exception 'tax_refund_reversal_must_be_positive'; end if;

  select p.quantity into v_product_qty_after from public.products p where p.id=v_order_item.product_id;
  if v_product_qty_after<>v_product_qty_before+1 then raise exception 'inventory_not_restored'; end if;

  select ri.inventory_restored_quantity into v_restored_qty
  from private.return_request_items ri where ri.id=v_return_item_id;
  if v_restored_qty<>1 then raise exception 'return_item_inventory_restore_not_recorded'; end if;
END;
$e2e$;

ROLLBACK;
`;

runTransactionalSql(sql);

console.log(`PASS Admin delivered and collected COD Order: ${fixture.order_number}`);
console.log("PASS Guest Return progressed approved -> received -> inspected");
console.log("PASS Refund prepared from trusted sale-ledger snapshots with shipping refund kept at 0");
console.log("PASS Trusted system refund-success boundary completed the refund");
console.log("PASS Refund-success retry was idempotent");
console.log("PASS Return reached refunded and Payment reached partially_refunded/refunded");
console.log("PASS Merchandise, IRTH subsidy, commission, and tax settlement reversals recorded");
console.log("PASS Restockable finite inventory restored exactly once");
console.log("PASS Transaction rolled back; local fixture state preserved");
console.log("Refund / Money domain E2E passed (payment-provider E2E remains pending gateway selection).\n");
