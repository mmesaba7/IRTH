import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const port = process.env.IRTH_ORDER_E2E_PORT ?? "3102";
const appUrl = `http://127.0.0.1:${port}`;

function fail(message) {
  throw new Error(message);
}

function parseEnvOutput(output) {
  const values = {};
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
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

function spawnCommand(command, args, options) {
  if (isWindows) {
    const quoted = [command, ...args]
      .map((part) => (/\s/.test(part) ? `"${part.replaceAll('"', '\\"')}"` : part))
      .join(" ");
    return spawn("cmd.exe", ["/d", "/s", "/c", quoted], {
      ...options,
      shell: false,
    });
  }
  return spawn(command, args, { ...options, shell: false });
}

function getLocalSupabaseEnv() {
  const result = runCommandSync(isWindows ? "npx.cmd" : "npx", [
    "supabase",
    "status",
    "-o",
    "env",
  ]);

  if (result.error) fail(`Unable to read local Supabase status: ${result.error.message}`);
  if (result.status !== 0) {
    fail(
      `Local Supabase is not ready. Start it and apply the local schema/seed first.\n${
        result.stderr || result.stdout
      }`
    );
  }

  const values = parseEnvOutput(result.stdout);
  const apiUrl = values.API_URL || values.SUPABASE_URL;
  const anonKey = values.ANON_KEY || values.PUBLISHABLE_KEY;
  const serviceKey = values.SERVICE_ROLE_KEY || values.SECRET_KEY;

  if (!apiUrl || !anonKey || !serviceKey) {
    fail("Supabase status must return API_URL, ANON_KEY/PUBLISHABLE_KEY, and SERVICE_ROLE_KEY/SECRET_KEY.");
  }

  if (!/^(http:\/\/127\.0\.0\.1|http:\/\/localhost)/.test(apiUrl)) {
    fail(`Refusing to run Order E2E against a non-local Supabase URL: ${apiUrl}`);
  }

  return { apiUrl, anonKey, serviceKey };
}

async function rest(apiUrl, key, path) {
  const headers = { apikey: key };
  if (!key.startsWith("sb_")) {
    headers.Authorization = `Bearer ${key}`;
  }

  const response = await fetch(`${apiUrl}/rest/v1/${path}`, { headers });
  if (!response.ok) fail(`Supabase REST ${response.status}: ${await response.text()}`);
  return response.json();
}

function sqlJson(sql) {
  const query = `select coalesce(json_agg(row_to_json(q)), '[]'::json)::text from (${sql}) q;`;
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_irth",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-t",
      "-A",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: false,
      input: `${query}\n`,
    }
  );

  if (result.error) {
    fail(`Unable to query local Postgres through Docker: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`Local Postgres query failed:\n${result.stderr || result.stdout}`);
  }

  const output = result.stdout.trim();
  if (!output) return [];
  try {
    return JSON.parse(output);
  } catch {
    fail(`Unable to parse local Postgres JSON output: ${output}`);
  }
}

async function waitForServer(server, logs) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      fail(`Next test server exited early.\n${logs.slice(-30).join("\n")}`);
    }
    try {
      const response = await fetch(`${appUrl}/api/markets`);
      if (response.ok) return;
    } catch {
      // starting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail(`Timed out waiting for Next test server.\n${logs.slice(-30).join("\n")}`);
}

function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
    });
  } else {
    server.kill("SIGTERM");
  }
}

async function postJson(path, marketId, body, extraHeaders = {}) {
  const response = await fetch(`${appUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: appUrl,
      cookie: `irth-market=${marketId}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { response, payload };
}

async function main() {
  const { apiUrl, anonKey, serviceKey } = getLocalSupabaseEnv();

  const markets = await rest(
    apiUrl,
    anonKey,
    "markets?select=id,slug,currency_code&slug=eq.egypt&is_active=eq.true&limit=1"
  );
  assert.equal(markets.length, 1, "Expected one active Egypt local fixture Market");
  const market = markets[0];

  const slugs = ["clay-vessel", "heritage-textile", "copper-piece"];
  const slugSql = slugs.map((slug) => `'${slug.replaceAll("'", "''")}'`).join(",");
  const before = sqlJson(
    `select id, slug, artisan_id, quantity, lifecycle_status, made_to_order
     from public.products
     where slug in (${slugSql})
     order by slug asc`
  );
  assert.equal(before.length, 3, "Expected the three core local fixture products");
  assert.equal(new Set(before.map((item) => item.artisan_id)).size, 3, "Core fixtures must belong to three artisans");
  for (const item of before) {
    assert.equal(item.lifecycle_status, "published", `${item.slug} must be published in local seed`);
    assert.equal(item.made_to_order, false, `${item.slug} must use finite stock in this E2E`);
    assert.ok(item.quantity >= 2, `${item.slug} needs at least 2 units for this E2E`);
  }

  const logs = [];
  const server = spawnCommand(isWindows ? "npm.cmd" : "npm", ["run", "dev", "--", "-p", port], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      IRTH_E2E_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_SUPABASE_URL: apiUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
      SUPABASE_SECRET_KEY: serviceKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      IRTH_GUEST_TRACKING_SECRET: "irth-local-order-e2e-secret-0123456789abcdef0123456789abcdef",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const collect = (chunk) => {
    for (const line of String(chunk).split(/\r?\n/)) if (line) logs.push(line);
  };
  server.stdout.on("data", collect);
  server.stderr.on("data", collect);

  try {
    await waitForServer(server, logs);

    const idempotencyKey = `phase7-order-${Date.now()}`;
    const orderBody = {
      items: slugs.map((slug) => ({ slug, quantity: 1 })),
      couponCode: "STACK10",
      paymentMethod: "cod",
      customer: {
        recipientName: "IRTH E2E Customer",
        email: `irth-e2e-${Date.now()}@example.com`,
        phone: "+201000000000",
        countryCode: "EG",
        administrativeArea: "Cairo",
        city: "Cairo",
        addressLine1: "1 Local E2E Test Street",
        deliveryNotes: "Local automated E2E only",
      },
    };

    const first = await postJson("/api/orders", market.id, orderBody, {
      "Idempotency-Key": idempotencyKey,
    });
    assert.equal(first.response.status, 201, `First Order creation failed: ${JSON.stringify(first.payload)}`);
    assert.equal(first.payload?.order?.paymentMethod, "cod");
    assert.equal(first.payload?.order?.paymentStatus, "pending");
    assert.equal(first.payload?.order?.status, "received");
    assert.equal(first.payload?.order?.reused, false);
    assert.match(first.payload?.order?.guestTrackingToken ?? "", /^[A-Za-z0-9_-]{43}$/);

    const orderId = first.payload.order.id;
    const orderNumber = first.payload.order.orderNumber;

    const second = await postJson("/api/orders", market.id, orderBody, {
      "Idempotency-Key": idempotencyKey,
    });
    assert.equal(second.response.status, 200, `Idempotent retry failed: ${JSON.stringify(second.payload)}`);
    assert.equal(second.payload?.order?.id, orderId);
    assert.equal(second.payload?.order?.orderNumber, orderNumber);
    assert.equal(second.payload?.order?.reused, true);

    const orders = sqlJson(
      `select id, order_number, status, payment_status, promotion_discount_total,
              coupon_discount_total, merchandise_subtotal, shipping_fee, final_total
       from public.orders where id = '${orderId}'::uuid`
    );
    const groups = sqlJson(
      `select id, artisan_id, merchandise_subtotal
       from public.order_artisan_groups where order_id = '${orderId}'::uuid`
    );
    const items = sqlJson(
      `select product_id, artisan_id, commission_rate_percent, promotion_discount,
              coupon_discount, line_total
       from public.order_items where order_id = '${orderId}'::uuid`
    );
    const redemptions = sqlJson(
      `select id, coupon_id, order_id
       from public.coupon_redemptions where order_id = '${orderId}'::uuid`
    );
    const after = sqlJson(
      `select id, slug, quantity
       from public.products where slug in (${slugSql}) order by slug asc`
    );

    assert.equal(orders.length, 1);
    assert.equal(orders[0].status, "received");
    assert.equal(orders[0].payment_status, "pending");
    assert.equal(Number(orders[0].promotion_discount_total), 60);
    assert.equal(Number(orders[0].coupon_discount_total), 27);
    assert.equal(Number(orders[0].merchandise_subtotal), 513);
    assert.equal(Number(orders[0].shipping_fee), 150);
    assert.equal(Number(orders[0].final_total), 663);

    assert.equal(groups.length, 3, "One Order must split into three artisan groups");
    assert.equal(new Set(groups.map((group) => group.artisan_id)).size, 3);
    assert.equal(items.length, 3);
    for (const item of items) {
      assert.ok(item.commission_rate_percent !== null, "Every Order Item must snapshot commission");
      assert.ok(Number(item.promotion_discount) > 0, "Each core fixture should carry its Promotion snapshot");
    }
    assert.equal(items.filter((item) => Number(item.coupon_discount) > 0).length, 2, "STACK10 must affect only its two eligible products");
    assert.equal(redemptions.length, 1, "Coupon must be redeemed exactly once despite idempotent retry");

    const beforeBySlug = new Map(before.map((item) => [item.slug, item.quantity]));
    for (const item of after) {
      assert.equal(item.quantity, beforeBySlug.get(item.slug) - 1, `${item.slug} stock must decrement exactly once`);
    }

    const outOfStock = await postJson("/api/cart/quote", market.id, {
      items: [{ slug: "clay-vessel", quantity: 999999 }],
    });
    assert.equal(outOfStock.response.status, 200);
    assert.equal(outOfStock.payload?.quote?.canCheckout, false, "Impossible stock quantity must block checkout");
    assert.notEqual(outOfStock.payload?.quote?.items?.[0]?.status, "available");

    console.log(`PASS Guest COD Order created: ${orderNumber}`);
    console.log("PASS Multi-artisan split: 3 artisan groups");
    console.log("PASS Promotion + Coupon snapshots and totals");
    console.log("PASS Commission snapshot on every Order Item");
    console.log("PASS Coupon redemption created once");
    console.log("PASS Idempotent retry reused the same Order");
    console.log("PASS Finite stock decremented exactly once");
    console.log("PASS Out-of-stock quote blocks Checkout");
    console.log("Order foundation E2E passed.");
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
