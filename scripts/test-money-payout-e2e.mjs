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
  try {
    return JSON.parse(output);
  } catch {
    fail(`Unable to parse local Postgres JSON output: ${output}`);
  }
}

function runTransactionalSql(sql) {
  const result = spawnSync(
    "docker",
    ["exec", "-i", "supabase_db_irth", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { cwd: process.cwd(), encoding: "utf8", shell: false, input: sql }
  );
  if (result.error) fail(`Unable to run local Postgres Money/Payout E2E through Docker: ${result.error.message}`);
  if (result.status !== 0) fail(`Money/Payout E2E failed:\n${result.stderr || result.stdout}`);
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
  order by o.created_at desc
  limit 1
`);

if (fixtures.length !== 1) {
  fail("Expected the latest Guest COD Order Foundation fixture in received/pending state. Run test:order-foundation-e2e first.");
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
  v_account record;
  v_order_status text;
  v_payment_status text;
  v_not_eligible_count integer;
  v_eligible_count integer;
  v_batch record;
  v_retry record;
  v_paid record;
  v_item_ids uuid[];
  v_payout_ledger_count integer;
  v_positive_after_count integer;
  v_hold_guard_seen boolean := false;
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
    v_admin_user_id,'authenticated','authenticated','irth-e2e-money-admin@example.com','',pg_catalog.now(),
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
        'irth-e2e-money-artisan-'||replace(v_group.artisan_id::text,'-','')||'@example.com','',pg_catalog.now(),
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

  select o.status into v_order_status from public.orders o where o.id=v_order_id;
  if v_order_status<>'delivered' then raise exception 'expected_delivered_order_got_%',v_order_status; end if;

  perform public.record_admin_cod_collected(v_order_id);
  select o.payment_status into v_payment_status from public.orders o where o.id=v_order_id;
  if v_payment_status<>'paid' then raise exception 'cod_payment_not_collected'; end if;

  select count(*) into v_not_eligible_count
  from private.artisan_payout_eligibility e
  where e.order_id=v_order_id and e.eligibility_status='hold_active';
  if v_not_eligible_count<>3 then raise exception 'expected_3_hold_active_items_got_%',v_not_eligible_count; end if;

  begin
    select array_agg(oi.id order by oi.id) into v_item_ids from public.order_items oi where oi.order_id=v_order_id;
    perform public.create_manual_payout_batch(v_item_ids,v_admin_user_id,'money-e2e-hold-guard');
  exception when others then
    if position('payout_item_not_eligible:hold_active' in sqlerrm)>0 then v_hold_guard_seen:=true; else raise; end if;
  end;
  if not v_hold_guard_seen then raise exception 'payout_hold_guard_missing'; end if;

  update public.shipments s
  set delivered_at=pg_catalog.now()-interval '15 days', updated_at=pg_catalog.now()
  where s.order_id=v_order_id;

  for v_group in
    select distinct g.artisan_id,ap.auth_user_id
    from public.order_artisan_groups g
    join public.artisan_profiles ap on ap.id=g.artisan_id
    where g.order_id=v_order_id
    order by g.artisan_id
  loop
    if v_group.auth_user_id is null then raise exception 'artisan_auth_missing_for_payout'; end if;
    select * into v_account
    from public.submit_bank_transfer_payout_account_request(
      v_group.artisan_id,
      v_group.auth_user_id,
      ('e2e-ciphertext-'||replace(v_group.artisan_id::text,'-','')||'-opaque')::text,
      repeat(md5('e2e-payout-'||v_group.artisan_id::text),2),
      1
    );
    perform public.review_payout_account_request(v_account.payout_account_id,'approved',v_admin_user_id,'Local Money E2E approval');
  end loop;

  select count(*) into v_eligible_count
  from private.artisan_payout_eligibility e
  where e.order_id=v_order_id and e.eligibility_status='eligible';
  if v_eligible_count<>3 then raise exception 'expected_3_payout_eligible_items_got_%',v_eligible_count; end if;

  select array_agg(oi.id order by oi.id) into v_item_ids from public.order_items oi where oi.order_id=v_order_id;
  select * into v_batch from public.create_manual_payout_batch(v_item_ids,v_admin_user_id,'money-e2e-final-batch');
  if not v_batch.changed or v_batch.item_count<>3 or v_batch.total_amount<=0 then raise exception 'payout_batch_creation_invalid'; end if;

  select * into v_retry from public.create_manual_payout_batch(v_item_ids,v_admin_user_id,'money-e2e-final-batch');
  if v_retry.changed or v_retry.batch_id<>v_batch.batch_id then raise exception 'payout_batch_idempotency_failed'; end if;

  select * into v_paid from public.record_manual_payout_batch_paid(v_batch.batch_id,v_admin_user_id,'BANK-E2E-001');
  if not v_paid.changed or v_paid.status<>'paid' then raise exception 'payout_batch_not_paid'; end if;

  select count(*) into v_payout_ledger_count
  from private.artisan_settlement_ledger l
  where l.order_id=v_order_id and l.entry_type='payout' and l.source='payout_batch' and l.amount<0;
  if v_payout_ledger_count<>3 then raise exception 'expected_3_payout_ledger_entries_got_%',v_payout_ledger_count; end if;

  select count(*) into v_positive_after_count
  from private.artisan_payout_eligibility e
  where e.order_id=v_order_id and e.current_settlement_amount>0;
  if v_positive_after_count<>0 then raise exception 'settlement_balance_remains_after_payout'; end if;

  if exists (
    select 1 from private.payout_batch_items i
    where i.payout_batch_id=v_batch.batch_id and (i.status<>'paid' or i.ledger_entry_id is null)
  ) then raise exception 'payout_batch_items_not_fully_paid'; end if;
END;
$e2e$;

ROLLBACK;
`;

runTransactionalSql(sql);

console.log(`PASS Admin delivered COD Order: ${fixture.order_number}`);
console.log("PASS Trusted Admin COD collection moved Payment to paid");
console.log("PASS Payout blocked during active 14-day Return Window");
console.log("PASS Local time-travel fixture simulated Return Window expiry");
console.log("PASS Bank Transfer payout accounts submitted and approved through trusted boundaries");
console.log("PASS 3 Order Items became payout eligible");
console.log("PASS Manual Payout Batch created for 3 items");
console.log("PASS Payout Batch idempotent retry reused the same batch");
console.log("PASS Manual bank transfer payout recorded as paid");
console.log("PASS 3 negative payout ledger entries recorded");
console.log("PASS Settlement balances no longer positive after payout");
console.log("PASS Transaction rolled back; local fixture state preserved");
console.log("Money / Payout E2E passed.");
