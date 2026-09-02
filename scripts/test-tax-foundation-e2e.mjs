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
  if (result.error) fail(`Unable to run local Tax E2E through Docker: ${result.error.message}`);
  if (result.status !== 0) fail(`Tax E2E failed:\n${result.stderr || result.stdout}`);
  return `${result.stdout}\n${result.stderr}`;
}

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

ensureLocalSupabase();

const fixtures = sqlJson(`
  select o.id as order_id, o.order_number, o.market_id, o.final_total,
         oi.id as order_item_id
  from public.orders o
  join public.order_items oi on oi.order_id=o.id
  where o.market_id=(select m.id from public.markets m where m.slug='egypt' limit 1)
  order by o.created_at desc, oi.created_at asc
  limit 1
`);

if (fixtures.length !== 1) {
  fail("Expected an Egypt local Order fixture. Run test:order-foundation-e2e first.");
}

const fixture = fixtures[0];

const sql = `
BEGIN;

DO $e2e$
DECLARE
  v_order_id uuid := ${literal(fixture.order_id)}::uuid;
  v_market_id uuid := ${literal(fixture.market_id)}::uuid;
  v_source_item_id uuid := ${literal(fixture.order_item_id)}::uuid;
  v_final_total_before numeric := ${literal(fixture.final_total)}::numeric;
  v_final_total_after numeric;
  v_admin_user_id uuid := pg_catalog.gen_random_uuid();
  v_super_admin_role_id uuid;
  v_item_10_id uuid;
  v_item_14_id uuid;
  v_item_10 record;
  v_item_14 record;
  v_expected_tax numeric;
  v_ledger_count integer;
  v_tax_ledger_amount numeric;
  v_history_count integer;
BEGIN
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='order_items' and column_name='tax_amount'
  ) then
    raise exception 'local_tax_migration_missing';
  end if;

  select r.id into v_super_admin_role_id
  from public.roles r where r.code='super_admin' limit 1;
  if v_super_admin_role_id is null then raise exception 'super_admin_role_missing'; end if;

  insert into auth.users (
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_admin_user_id,'authenticated','authenticated','irth-e2e-tax-admin@example.com','',pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,pg_catalog.now(),pg_catalog.now()
  );
  insert into public.user_roles(user_id,role_id) values(v_admin_user_id,v_super_admin_role_id);

  perform public.set_market_tax_rate(v_market_id,10,v_admin_user_id,'Tax E2E 10 percent snapshot');

  insert into public.order_items(
    order_id,artisan_group_id,product_id,artisan_id,craft_id,
    product_slug_snapshot,product_name_ar_snapshot,product_name_en_snapshot,
    quantity,unit_price,original_line_total,promotion_id,promotion_discount,
    promotion_funding_irth,promotion_funding_artisan,coupon_discount,
    coupon_funding_irth,coupon_funding_artisan,line_total,commission_rate_percent,
    customization_text_snapshot
  )
  select
    oi.order_id,oi.artisan_group_id,oi.product_id,oi.artisan_id,oi.craft_id,
    oi.product_slug_snapshot,oi.product_name_ar_snapshot,oi.product_name_en_snapshot,
    oi.quantity,oi.unit_price,oi.original_line_total,oi.promotion_id,oi.promotion_discount,
    oi.promotion_funding_irth,oi.promotion_funding_artisan,oi.coupon_discount,
    oi.coupon_funding_irth,oi.coupon_funding_artisan,oi.line_total,oi.commission_rate_percent,
    oi.customization_text_snapshot
  from public.order_items oi
  where oi.id=v_source_item_id
  returning id into v_item_10_id;

  select oi.* into v_item_10 from public.order_items oi where oi.id=v_item_10_id;
  if v_item_10.tax_rate_percent<>10 then raise exception 'expected_10_percent_snapshot_got_%',v_item_10.tax_rate_percent; end if;
  if v_item_10.tax_calculation_base_amount<>round(v_item_10.line_total+v_item_10.promotion_funding_irth+v_item_10.coupon_funding_irth,2) then
    raise exception 'tax_base_did_not_preserve_irth_funded_discount';
  end if;
  v_expected_tax := round(v_item_10.tax_calculation_base_amount*10/110,2);
  if v_item_10.tax_amount<>v_expected_tax then raise exception '10_percent_inclusive_tax_mismatch'; end if;

  select count(*), max(case when l.entry_type='tax_withheld' then l.amount end)
  into v_ledger_count,v_tax_ledger_amount
  from private.artisan_settlement_ledger l
  where l.order_item_id=v_item_10_id and l.source='order_item_sale';
  if v_ledger_count<>4 then raise exception 'expected_4_sale_ledger_entries_got_%',v_ledger_count; end if;
  if v_tax_ledger_amount<>-v_item_10.tax_amount then raise exception 'tax_ledger_deduction_mismatch'; end if;

  perform public.set_market_tax_rate(v_market_id,14,v_admin_user_id,'Tax E2E restore 14 percent');

  insert into public.order_items(
    order_id,artisan_group_id,product_id,artisan_id,craft_id,
    product_slug_snapshot,product_name_ar_snapshot,product_name_en_snapshot,
    quantity,unit_price,original_line_total,promotion_id,promotion_discount,
    promotion_funding_irth,promotion_funding_artisan,coupon_discount,
    coupon_funding_irth,coupon_funding_artisan,line_total,commission_rate_percent,
    customization_text_snapshot
  )
  select
    oi.order_id,oi.artisan_group_id,oi.product_id,oi.artisan_id,oi.craft_id,
    oi.product_slug_snapshot,oi.product_name_ar_snapshot,oi.product_name_en_snapshot,
    oi.quantity,oi.unit_price,oi.original_line_total,oi.promotion_id,oi.promotion_discount,
    oi.promotion_funding_irth,oi.promotion_funding_artisan,oi.coupon_discount,
    oi.coupon_funding_irth,oi.coupon_funding_artisan,oi.line_total,oi.commission_rate_percent,
    oi.customization_text_snapshot
  from public.order_items oi
  where oi.id=v_source_item_id
  returning id into v_item_14_id;

  select oi.* into v_item_14 from public.order_items oi where oi.id=v_item_14_id;
  if v_item_14.tax_rate_percent<>14 then raise exception 'expected_14_percent_snapshot_got_%',v_item_14.tax_rate_percent; end if;
  v_expected_tax := round(v_item_14.tax_calculation_base_amount*14/114,2);
  if v_item_14.tax_amount<>v_expected_tax then raise exception '14_percent_inclusive_tax_mismatch'; end if;

  select oi.tax_rate_percent into v_item_10.tax_rate_percent from public.order_items oi where oi.id=v_item_10_id;
  if v_item_10.tax_rate_percent<>10 then raise exception 'historical_tax_snapshot_changed'; end if;

  select o.final_total into v_final_total_after from public.orders o where o.id=v_order_id;
  if v_final_total_after<>v_final_total_before then raise exception 'customer_order_total_changed_by_tax_setting'; end if;

  select count(*) into v_history_count
  from private.tax_configuration_history h
  where h.market_id=v_market_id and h.changed_by_user_id=v_admin_user_id;
  if v_history_count<>2 then raise exception 'expected_2_tax_audit_entries_got_%',v_history_count; end if;
END;
$e2e$;

ROLLBACK;
`;

runTransactionalSql(sql);

console.log(`PASS Dynamic Tax tested against Order fixture: ${fixture.order_number}`);
console.log("PASS Super Admin tax changes used trusted audited boundary");
console.log("PASS 10% and 14% inclusive tax snapshots calculated from Market configuration");
console.log("PASS IRTH-funded discount subsidy remains in Artisan tax settlement base");
console.log("PASS New Order Items create 4 sale-ledger entries including tax withheld");
console.log("PASS Historical tax snapshot stayed unchanged after Market rate changed");
console.log("PASS Customer Order final total stayed unchanged by internal tax configuration");
console.log("PASS Transaction rolled back; local fixture state preserved");
console.log("Tax Foundation E2E passed.");
