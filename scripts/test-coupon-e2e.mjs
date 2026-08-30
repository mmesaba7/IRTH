import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const port = process.env.IRTH_TEST_PORT ?? "3101";
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

function runCommandSync(command, args) {
  if (isWindows) {
    const quoted = [command, ...args]
      .map((part) => (/\s/.test(part) ? `"${part.replaceAll('"', '\\"')}"` : part))
      .join(" ");

    return spawnSync("cmd.exe", ["/d", "/s", "/c", quoted], {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: false,
    });
  }

  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
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

  return spawn(command, args, {
    ...options,
    shell: false,
  });
}

function getLocalSupabaseEnv() {
  const result = runCommandSync(isWindows ? "npx.cmd" : "npx", [
    "supabase",
    "status",
    "-o",
    "env",
  ]);

  if (result.error) {
    fail(`Unable to read local Supabase status: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(
      `Local Supabase is not ready. Run npx.cmd supabase db reset first.\n${
        result.stderr || result.stdout
      }`
    );
  }

  const values = parseEnvOutput(result.stdout);
  const apiUrl = values.API_URL || values.SUPABASE_URL;
  const anonKey = values.ANON_KEY || values.PUBLISHABLE_KEY;

  if (!apiUrl || !anonKey) {
    fail(
      "Supabase status did not return API_URL and ANON_KEY/PUBLISHABLE_KEY."
    );
  }

  return { apiUrl, anonKey };
}

async function supabaseRest(apiUrl, key, path) {
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Supabase REST ${response.status}: ${text}`);
  }

  return response.json();
}

async function waitForServer(server, logs) {
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      fail(`Next dev server exited early.\n${logs.slice(-30).join("\n")}`);
    }

    try {
      const response = await fetch(`${appUrl}/api/markets`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  fail(`Timed out waiting for Next dev server.\n${logs.slice(-30).join("\n")}`);
}

function stopServer(server) {
  if (!server || server.exitCode !== null) return;

  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
    });
    return;
  }

  server.kill("SIGTERM");
}

function itemBySlug(quote, slug) {
  const item = quote.items.find((candidate) => candidate.slug === slug);
  assert.ok(item, `Expected quote item ${slug}`);
  return item;
}

function assertMoney(actual, expected, label) {
  assert.equal(actual, expected, `${label}: expected ${expected}, got ${actual}`);
}

async function main() {
  const { apiUrl, anonKey } = getLocalSupabaseEnv();

  const markets = await supabaseRest(
    apiUrl,
    anonKey,
    "markets?select=id,slug,currency_code&slug=eq.egypt&is_active=eq.true&limit=1"
  );

  assert.equal(markets.length, 1, "Expected one active Egypt test Market");
  const market = markets[0];

  // Verify only through the public marketplace boundary. Do not weaken local
  // table grants just to give the test harness privileged direct reads.
  const fixtureProducts = await supabaseRest(
    apiUrl,
    anonKey,
    "products?select=slug&slug=in.(clay-vessel,heritage-textile,copper-piece,coupon-rounding-item,coupon-tie-a,coupon-tie-b)&lifecycle_status=eq.published"
  );
  assert.equal(
    fixtureProducts.length,
    6,
    "Coupon E2E fixtures are missing or not publicly eligible. Run supabase db reset after pulling the seed file."
  );

  const logs = [];
  const server = spawnCommand(
    isWindows ? "npm.cmd" : "npm",
    ["run", "dev", "--", "-p", port],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: apiUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  const collect = (chunk) => {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (line) logs.push(line);
    }
  };
  server.stdout.on("data", collect);
  server.stderr.on("data", collect);

  try {
    await waitForServer(server, logs);

    async function quote(items, couponCode) {
      const body = { items };
      if (couponCode !== undefined) body.couponCode = couponCode;

      const response = await fetch(`${appUrl}/api/cart/quote`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `irth-market=${market.id}`,
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json();

      if (!response.ok) {
        fail(
          `Quote request failed (${response.status}): ${JSON.stringify(payload)}`
        );
      }

      assert.ok(payload.quote, "Quote response must contain quote");
      return payload.quote;
    }

    const coreCart = [
      { slug: "clay-vessel", quantity: 1 },
      { slug: "heritage-textile", quantity: 1 },
      { slug: "copper-piece", quantity: 1 },
    ];

    // Baseline Promotions: 100 + 200 + 300 = 600; discounts 10 + 20 + 30 = 60.
    {
      const result = await quote(coreCart);
      assert.equal(result.couponStatus, "not_requested");
      assertMoney(result.subtotalBeforePromotions, "600.00", "base subtotal");
      assertMoney(result.promotionDiscountTotal, "60.00", "promotion total");
      assertMoney(result.couponDiscountTotal, "0.00", "coupon total");
      assertMoney(result.subtotal, "540.00", "promotion-only subtotal");
      assertMoney(itemBySlug(result, "clay-vessel").lineTotal, "90.00", "clay promo line");
      assertMoney(itemBySlug(result, "heritage-textile").lineTotal, "180.00", "textile promo line");
      assertMoney(itemBySlug(result, "copper-piece").lineTotal, "270.00", "copper promo line");
    }

    // Invalid codes are a normal quote state, not an HTTP error.
    {
      const result = await quote(coreCart, "NOT-A-COUPON");
      assert.equal(result.couponStatus, "invalid_or_unavailable");
      assertMoney(result.subtotal, "540.00", "invalid coupon subtotal");
    }

    // 6A + 16A + 21A: Promotions first; normalized STACK10 applies 10% once to
    // eligible post-Promotion subtotal 90 + 180 = 270 => 27.00.
    {
      const result = await quote(coreCart, "  stack10  ");
      assert.equal(result.couponStatus, "applied");
      assert.equal(result.coupon.code, "STACK10");
      assertMoney(result.couponEligibleSubtotal, "270.00", "STACK10 eligible subtotal");
      assertMoney(result.couponDiscountTotal, "27.00", "STACK10 discount");
      assertMoney(result.couponFunding.irth, "27.00", "STACK10 IRTH funding");
      assertMoney(itemBySlug(result, "clay-vessel").lineTotal, "81.00", "STACK10 clay line");
      assertMoney(itemBySlug(result, "heritage-textile").lineTotal, "162.00", "STACK10 textile line");
      assertMoney(itemBySlug(result, "copper-piece").lineTotal, "270.00", "STACK10 copper line");
      assertMoney(result.subtotal, "513.00", "STACK10 subtotal");
    }

    // 10A + 11A + 22A: cart-level 50.00 allocated over weights 90:180.
    // Exact proportional result is 16.67 / 33.33 after deterministic remainder.
    {
      const result = await quote(coreCart, "FIXED50");
      assert.equal(result.couponStatus, "applied");
      assertMoney(result.couponDiscountTotal, "50.00", "FIXED50 discount");
      assertMoney(itemBySlug(result, "clay-vessel").couponDiscount, "16.67", "FIXED50 clay allocation");
      assertMoney(itemBySlug(result, "heritage-textile").couponDiscount, "33.33", "FIXED50 textile allocation");
      assertMoney(itemBySlug(result, "clay-vessel").lineTotal, "73.33", "FIXED50 clay final");
      assertMoney(itemBySlug(result, "heritage-textile").lineTotal, "146.67", "FIXED50 textile final");
      assertMoney(result.subtotal, "490.00", "FIXED50 subtotal");
    }

    // 24A: non-stackable Coupon wins only on Coupon-eligible clay. Promotions on
    // coupon-ineligible textile/copper lines remain active.
    {
      const result = await quote(coreCart, "NONSTACK50");
      const clay = itemBySlug(result, "clay-vessel");
      const textile = itemBySlug(result, "heritage-textile");
      const copper = itemBySlug(result, "copper-piece");

      assert.equal(result.couponStatus, "applied");
      assertMoney(result.couponEligibleSubtotal, "100.00", "NONSTACK50 eligible original subtotal");
      assertMoney(result.couponDiscountTotal, "50.00", "NONSTACK50 coupon discount");
      assertMoney(result.promotionDiscountTotal, "50.00", "NONSTACK50 remaining promotions");
      assert.equal(clay.promotion, null, "Clay promotion must be removed when Coupon wins");
      assertMoney(clay.promotionDiscount, "0.00", "Clay promotion discount after Coupon wins");
      assertMoney(clay.lineTotal, "50.00", "Clay non-stackable final");
      assert.ok(textile.promotion, "Textile unrelated Promotion must remain active");
      assert.ok(copper.promotion, "Copper unrelated Promotion must remain active");
      assertMoney(textile.lineTotal, "180.00", "Textile unrelated promo final");
      assertMoney(copper.lineTotal, "270.00", "Copper unrelated promo final");
      assertMoney(result.subtotal, "500.00", "24A final subtotal");
    }

    // 7A: smaller non-stackable Coupon must not worsen the customer result.
    {
      const result = await quote(coreCart, "NONSTACK5");
      assert.equal(result.couponStatus, "promotion_preferred");
      assert.equal(result.coupon, null);
      assertMoney(result.couponDiscountTotal, "0.00", "NONSTACK5 applied Coupon discount");
      assertMoney(result.subtotal, "540.00", "NONSTACK5 promotion-preferred subtotal");
    }

    // 23A: exact 10.00 Coupon vs 10.00 clay Promotion tie => Promotion-only wins.
    {
      const result = await quote(coreCart, "NONSTACK10");
      assert.equal(result.couponStatus, "promotion_preferred");
      assert.equal(result.coupon, null);
      assertMoney(result.subtotal, "540.00", "non-stackable exact tie subtotal");
    }

    // 9A: stackable minimum uses post-Promotion eligible subtotal. Clay is 90 < 100.
    {
      const result = await quote(coreCart, "MIN100");
      assert.equal(result.couponStatus, "minimum_not_met");
      assertMoney(result.couponEligibleSubtotal, "90.00", "MIN100 eligible subtotal");
      assertMoney(result.subtotal, "540.00", "MIN100 subtotal");
    }

    // 10A: 50% of promoted textile 180 = 90, capped by max_discount at 30.
    {
      const result = await quote(coreCart, "MAX30");
      assert.equal(result.couponStatus, "applied");
      assertMoney(result.couponEligibleSubtotal, "180.00", "MAX30 eligible subtotal");
      assertMoney(result.couponDiscountTotal, "30.00", "MAX30 capped discount");
      assertMoney(itemBySlug(result, "heritage-textile").lineTotal, "150.00", "MAX30 textile final");
      assertMoney(result.subtotal, "510.00", "MAX30 subtotal");
    }

    // 20A + 21A: 10% of 10.05 = 1.005 => Round Half-Up once => 1.01.
    {
      const result = await quote(
        [{ slug: "coupon-rounding-item", quantity: 1 }],
        "ROUND10"
      );
      assert.equal(result.couponStatus, "applied");
      assertMoney(result.couponEligibleSubtotal, "10.05", "ROUND10 eligible subtotal");
      assertMoney(result.couponDiscountTotal, "1.01", "ROUND10 rounded discount");
      assertMoney(result.subtotal, "9.04", "ROUND10 subtotal");
    }

    // 22A exact fractional tie: both lines weigh 1.00 and fixed Coupon is 0.01.
    // Input order is intentionally B then A. Lowest product_id (A) gets the penny.
    {
      const result = await quote(
        [
          { slug: "coupon-tie-b", quantity: 1 },
          { slug: "coupon-tie-a", quantity: 1 },
        ],
        "TIEPENNY"
      );
      const tieA = itemBySlug(result, "coupon-tie-a");
      const tieB = itemBySlug(result, "coupon-tie-b");

      assert.equal(result.couponStatus, "applied");
      assertMoney(tieA.couponDiscount, "0.01", "TIEPENNY A allocation");
      assertMoney(tieB.couponDiscount, "0.00", "TIEPENNY B allocation");
      assertMoney(tieA.lineTotal, "0.99", "TIEPENNY A final");
      assertMoney(tieB.lineTotal, "1.00", "TIEPENNY B final");
      assertMoney(result.subtotal, "1.99", "TIEPENNY subtotal");
    }

    // 8A: Product restriction OR Craft restriction. clay is explicit, textile is
    // included by craft, copper is outside both.
    {
      const result = await quote(coreCart, "UNION10");
      assert.equal(result.couponStatus, "applied");
      assert.equal(itemBySlug(result, "clay-vessel").couponEligible, true);
      assert.equal(itemBySlug(result, "heritage-textile").couponEligible, true);
      assert.equal(itemBySlug(result, "copper-piece").couponEligible, false);
      assertMoney(result.couponEligibleSubtotal, "270.00", "UNION10 eligible subtotal");
      assertMoney(result.couponDiscountTotal, "27.00", "UNION10 discount");
    }

    // 12A + 13A: unrestricted Artisan-funded Coupon is still restricted to that
    // Artisan by the trusted DB lookup, and funding is attributed separately.
    {
      const result = await quote(
        [
          { slug: "clay-vessel", quantity: 1 },
          { slug: "heritage-textile", quantity: 1 },
        ],
        "ARTISAN25"
      );
      assert.equal(result.couponStatus, "applied");
      assert.equal(itemBySlug(result, "clay-vessel").couponEligible, true);
      assert.equal(itemBySlug(result, "heritage-textile").couponEligible, false);
      assertMoney(result.couponDiscountTotal, "25.00", "ARTISAN25 discount");
      assertMoney(result.couponFunding.irth, "0.00", "ARTISAN25 IRTH funding");
      assertMoney(result.couponFunding.artisan, "25.00", "ARTISAN25 Artisan funding");
      assertMoney(result.subtotal, "245.00", "ARTISAN25 subtotal");
    }

    console.log("PASS S15.4.4 coupon quote E2E");
    console.log("- Secure local RPC + real /api/cart/quote path");
    console.log("- Stackable percentage and fixed Coupons");
    console.log("- Proportional allocation + deterministic remainder tie-break");
    console.log("- Non-stackable win / lose / exact tie");
    console.log("- Decision 24A unrelated Promotions remain active");
    console.log("- Minimum, max cap, Round Half-Up, restriction union");
    console.log("- Artisan funding scope");
    console.log("- No Redemption consumption was verified separately at the DB boundary");
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error("FAIL S15.4.4 coupon quote E2E");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});