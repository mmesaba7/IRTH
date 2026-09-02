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
  if (result.error) fail(`Unable to run local Postgres E2E through Docker: ${result.error.message}`);
  if (result.status !== 0) fail(`Fulfillment/Returns/Reviews E2E failed:\n${result.stderr || result.stdout}`);
  return `${result.stdout}\n${result.stderr}`;
}

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

ensureLocalSupabase();

const fixtures = sqlJson(`
  select
    o.id as order_id,
    o.order_number,
    o.guest_access_token_hash,
    oi.id as order_item_id
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.customer_user_id is null
    and o.guest_access_token_hash is not null
    and o.status = 'received'
    and o.payment_status = 'pending'
    and (select count(*) from public.order_artisan_groups g where g.order_id = o.id) = 3
  order by o.created_at desc, oi.created_at asc
  limit 1
`);

if (fixtures.length !== 1) {
  fail("Expected the latest Guest Order Foundation E2E fixture in received/pending state. Run test:order-foundation-e2e first.");
}

const fixture = fixtures[0];

const sql = `
BEGIN;

DO $e2e$
DECLARE
  v_order_id uuid := ${literal(fixture.order_id)}::uuid;
  v_order_item_id uuid := ${literal(fixture.order_item_id)}::uuid;
  v_guest_hash text := ${literal(fixture.guest_access_token_hash)};
  v_admin_user_id uuid := pg_catalog.gen_random_uuid();
  v_super_admin_role_id uuid;
  v_group record;
  v_shipment record;
  v_order_status text;
  v_shipment_count integer;
  v_review_id uuid;
  v_reply_id uuid;
  v_item_artisan_id uuid;
  v_item_artisan_user_id uuid;
  v_return_id uuid;
  v_return_item_id uuid;
  v_return_status text;
  v_refund_guard_seen boolean := false;
BEGIN
  select r.id into v_super_admin_role_id
  from public.roles r
  where r.code='super_admin'
  limit 1;
  if v_super_admin_role_id is null then raise exception 'super_admin_role_missing'; end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_admin_user_id,
    'authenticated',
    'authenticated',
    'irth-e2e-super-admin@example.com',
    '',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    pg_catalog.now(),
    pg_catalog.now()
  );

  insert into public.user_roles(user_id,role_id)
  values(v_admin_user_id,v_super_admin_role_id);

  perform pg_catalog.set_config('request.jwt.claim.sub', v_admin_user_id::text, true);
  perform pg_catalog.set_config('request.jwt.claims', pg_catalog.json_build_object('sub',v_admin_user_id,'role','authenticated')::text, true);

  perform public.confirm_admin_order(v_order_id);
  select o.status into v_order_status from public.orders o where o.id=v_order_id;
  if v_order_status <> 'confirmed' then raise exception 'expected_confirmed_order_got_%',v_order_status; end if;

  for v_group in
    select g.id, ap.auth_user_id
    from public.order_artisan_groups g
    join public.artisan_profiles ap on ap.id=g.artisan_id
    where g.order_id=v_order_id
    order by g.id
  loop
    if v_group.auth_user_id is null then raise exception 'artisan_auth_fixture_missing'; end if;
    perform pg_catalog.set_config('request.jwt.claim.sub', v_group.auth_user_id::text, true);
    perform pg_catalog.set_config('request.jwt.claims', pg_catalog.json_build_object('sub',v_group.auth_user_id,'role','authenticated')::text, true);
    perform public.update_my_artisan_fulfillment_status(v_group.id,'preparing');
    perform public.update_my_artisan_fulfillment_status(v_group.id,'ready_for_courier_pickup');
  end loop;

  select count(*) into v_shipment_count from public.shipments s where s.order_id=v_order_id;
  if v_shipment_count <> 3 then raise exception 'expected_3_shipments_got_%',v_shipment_count; end if;

  perform pg_catalog.set_config('request.jwt.claim.sub', v_admin_user_id::text, true);
  perform pg_catalog.set_config('request.jwt.claims', pg_catalog.json_build_object('sub',v_admin_user_id,'role','authenticated')::text, true);

  for v_shipment in select s.id from public.shipments s where s.order_id=v_order_id order by s.id
  loop
    perform public.update_admin_shipment_status(v_shipment.id,'picked_up_from_artisan');
    perform public.update_admin_shipment_status(v_shipment.id,'in_transit');
    perform public.update_admin_shipment_status(v_shipment.id,'delivered');
  end loop;

  select o.status into v_order_status from public.orders o where o.id=v_order_id;
  if v_order_status <> 'delivered' then raise exception 'expected_delivered_order_got_%',v_order_status; end if;

  if exists (
    select 1 from public.shipments s
    where s.order_id=v_order_id
      and (s.delivered_at is null or s.return_window_days_snapshot <> 14
           or s.return_window_ends_at is distinct from s.delivered_at + pg_catalog.make_interval(days=>14))
  ) then
    raise exception 'return_window_snapshot_invalid';
  end if;

  v_review_id := public.create_verified_purchase_review(v_order_item_id,null,v_guest_hash,5,5,'Local delivered purchase E2E review');
  if not exists (select 1 from private.customer_reviews r where r.id=v_review_id and r.status='pending_review') then
    raise exception 'review_not_pending_moderation';
  end if;

  perform public.review_customer_review(v_review_id,v_admin_user_id,'approved',null);
  if not exists (select 1 from private.customer_reviews r where r.id=v_review_id and r.status='published') then
    raise exception 'review_not_published_after_approval';
  end if;

  select oi.artisan_id, ap.auth_user_id into v_item_artisan_id,v_item_artisan_user_id
  from public.order_items oi join public.artisan_profiles ap on ap.id=oi.artisan_id
  where oi.id=v_order_item_id;

  v_reply_id := public.submit_artisan_review_reply(v_review_id,v_item_artisan_id,v_item_artisan_user_id,'Thank you from the artisan E2E fixture');
  if not exists (select 1 from private.review_artisan_replies ar where ar.id=v_reply_id and ar.status='pending_review') then
    raise exception 'artisan_reply_not_pending_moderation';
  end if;
  perform public.review_artisan_reply(v_reply_id,v_admin_user_id,'approved',null);
  if not exists (select 1 from private.review_artisan_replies ar where ar.id=v_reply_id and ar.status='approved') then
    raise exception 'artisan_reply_not_approved';
  end if;

  v_return_id := public.create_guest_return_request(
    v_order_id,
    v_guest_hash,
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('orderItemId',v_order_item_id,'quantity',1,'reason','Local delivered return E2E'))
  );
  select rr.status into v_return_status from private.return_requests rr where rr.id=v_return_id;
  if v_return_status <> 'requested' then raise exception 'return_not_requested'; end if;

  perform public.review_return_request(v_return_id,'approved','Local E2E approval');
  perform public.mark_return_received(v_return_id);
  select ri.id into v_return_item_id from private.return_request_items ri where ri.return_request_id=v_return_id;
  perform public.inspect_return_request(
    v_return_id,
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('returnItemId',v_return_item_id,'restockableQuantity',1)),
    'Local E2E inspection'
  );

  select rr.status into v_return_status from private.return_requests rr where rr.id=v_return_id;
  if v_return_status <> 'inspected' then raise exception 'return_not_inspected'; end if;

  begin
    perform public.prepare_return_refund(v_return_id,0);
  exception when others then
    if position('payment_must_be_collected_before_refund' in sqlerrm) > 0 then
      v_refund_guard_seen := true;
    else
      raise;
    end if;
  end;
  if not v_refund_guard_seen then raise exception 'pending_payment_refund_guard_missing'; end if;
END;
$e2e$;

ROLLBACK;
`;

runTransactionalSql(sql);

console.log(`PASS Temporary Super Admin fixture created inside transaction`);
console.log(`PASS Admin confirmed Order: ${fixture.order_number}`);
console.log("PASS 3 artisans moved fulfillment to ready-for-courier pickup");
console.log("PASS 3 shipments progressed pickup -> transit -> delivered");
console.log("PASS Order aggregate reached delivered");
console.log("PASS 14-day Return Window snapshotted on every delivered shipment");
console.log("PASS Verified-purchase Review required delivered Order Item and entered moderation");
console.log("PASS Super Admin approved Review");
console.log("PASS Artisan reply entered moderation and Super Admin approved it");
console.log("PASS Guest Return request progressed requested -> approved -> received -> inspected");
console.log("PASS Refund preparation blocked while COD payment is still pending");
console.log("PASS Transaction rolled back; local fixture state preserved");
console.log("Fulfillment / Returns / Reviews E2E passed.");
