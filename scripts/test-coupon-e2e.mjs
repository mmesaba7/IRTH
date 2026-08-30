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
      fail(`Next test server exited early.\n${logs.slice(-30).join("\n")}`);
    }

    try {
      const response = await fetch(`${appUrl}/api/markets`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
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

function assertPublicQuoteBoundary(quote) {
  for (const field of [
    "promotionFunding",
    "couponFunding",
    "coupon",
    "couponEligibleSubtotal",
  ]) {
    assert.equal(field in quote, false, `Public quote must not expose ${field}`);
  }

  for (const item of quote.items) {
    for (const field of [
      "promotion",
      "promotionFunding",
      "couponEligible",
      "couponFunding",
    ]) {
      assert.equal(
        field in item,
        false,
        `Public quote item must not expose ${field}`
      );
    }
  }
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
    ["run", "start", "--", "-p", port],
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

      assert.equal(
        response.headers.get("cache-control"),
        "no-store",
        "Quote responses must disable caching"
      );

      const payload = await response.json();

      if (!response.ok) {
        fail(
          `Quote request failed (${response.status}): ${JSON.stringify(payload)}`
        );
      }

      assert.ok(payload.quote, "Quote response must contain quote");
      assertPublicQuoteBoundary(payload.quote);
      return payload.quote;
    }

    const coreCart = [
      { slug: "clay-vessel", quantity: 1 },
      { slug: "heritage-textile", quantity: 1 },
      { slug: "copper-piece", quantity: 1 },
    ];

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

    {
      const result = await quote(coreCart, "NOT-A-COUPON");
      assert.equal(result.couponStatus, "invalid_or_unavailable");
      assertMoney(result.subtotal, "540.00", "invalid coupon subtotal");
    }

    {
      const result = await quote(coreCart, "  stack10  ");
      assert.equal(result.couponStatus, "applied");
      assert.equal(result.couponCode, "STACK10");
      assertMoney(result.couponDiscountTotal, "27.00", "STACK10 discount");
      assertMoney(itemBySlug(result, "clay-vessel").couponDiscount, "9.00", "STACK10 clay coupon");
      assertMoney(itemBySlug(result, "heritage-textile").couponDiscount, "18.00", "STACK10 textile coupon");
      assertMoney(itemBySlug(result, "copper-piece").couponDiscount, "0.00", "STACK10 copper coupon");
      assertMoney(itemBySlug(result, "clay-vessel").lineTotal, "81.00", "STACK10 clay line");
      assertMoney(itemBySlug(result, "heritage-textile").lineTotal, "162.00", "STACK10 textile line");
      assertMoney(itemBySlug(result, "copper-piece").lineTotal, "270.00", "STACK10 copper line");
      assertMoney(result.subtotal, "513.00", "STACK10 subtotal");
    }

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

    {
      const result = await quote(coreCart, "NONSTACK50");
      const clay = itemBySlug(result, "clay-vessel");
      const textile = itemBySlug(result, "heritage-textile");
      const copper = itemBySlug(result, "copper-piece");

      assert.equal(result.couponStatus, "applied");
      assertMoney(result.couponDiscountTotal, "50.00", "NONSTACK50 coupon discount");
      assertMoney(result.promotionDiscountTotal, "50.00", "NONSTACK50 remaining promotions");
      assertMoney(clay.promotionDiscount, "0.00", "Clay promotion removed when Coupon wins");
      assertMoney(clay.lineTotal, "50.00", "Clay non-stackable final");
      assertMoney(textile.promotionDiscount, "20.00", "Textile unrelated Promotion remains");
      assertMoney(copper.promotionDiscount, "30.00", "Copper unrelated Promotion remains");
      assertMoney(textile.lineTotal, "180.00", "Textile unrelated promo final");
      assertMoney(copper.lineTotal, "270.00", "Copper unrelated promo final");
      assertMoney(result.subtotal, "500.00", "24A final subtotal");
    }

    {
      const result = await quote(coreCart, "NONSTACK5");
      assert.equal(result.couponStatus, "promotion_preferred");
      assertMoney(result.couponDiscountTotal, "0.00", "NONSTACK5 applied Coupon discount");
      assertMoney(result.subtotal, "540.00", "NONSTACK5 promotion-preferred subtotal");
    }

    {
      const result = await quote(coreCart, "NONSTACK10");
      assert.equal(result.couponStatus, "promotion_preferred");
      assertMoney(result.subtotal, "540.00", "non-stackable exact tie subtotal");
    }

    {
      const result = await quote(coreCart, "MIN100");
      assert.equal(result.couponStatus, "minimum_not_met");
      assertMoney(result.subtotal, "540.00", "MIN100 subtotal");
    }

    {
      const result = await quote(coreCart, "MAX30");
      assert.equal(result.couponStatus, "applied");
      assertMoney(result.couponDiscountTotal, "30.00", "MAX30 capped discount");
      assertMoney(itemBySlug(result, "heritage-textile").lineTotal, "150.00", "MAX30 textile final");
      assertMoney(result.subtotal, "510.00", "MAX30 subtotal");
    }

    {
      const result = await quote(
        [{ slug: "coupon-rounding-item", quantity: 1 }],
        "ROUND10"
      );
      assert.equal(result.couponStatus, "applied");
      assertMoney(result.couponDiscountTotal, "1.01", "ROUND10 rounded discount");
      assertMoney(result.subtotal, "9.04", "ROUND10 subtotal");
    }

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

    {
      const result = await quote(coreCart, "UNION10");
      assert.equal(result.couponStatus, "applied");
      assertMoney(itemBySlug(result, "clay-vessel").couponDiscount, "9.00", "UNION10 clay discount");
      assertMoney(itemBySlug(result, "heritage-textile").couponDiscount, "18.00", "UNION10 textile discount");
      assertMoney(itemBySlug(result, "copper-piece").couponDiscount, "0.00", "UNION10 copper excluded");
      assertMoney(result.couponDiscountTotal, "27.00", "UNION10 discount");
    }

    {
      const result = await quote(
        [
          { slug: "clay-vessel", quantity: 1 },
          { slug: "heritage-textile", quantity: 1 },
        ],
        "ARTISAN25"
      );
      assert.equal(result.couponStatus, "applied");
      assertMoney(itemBySlug(result, "clay-vessel").couponDiscount, "25.00", "ARTISAN25 artisan product discount");
      assertMoney(itemBySlug(result, "heritage-textile").couponDiscount, "0.00", "ARTISAN25 other artisan excluded");
      assertMoney(result.couponDiscountTotal, "25.00", "ARTISAN25 discount");
      assertMoney(result.subtotal, "245.00", "ARTISAN25 subtotal");
    }

    console.log("PASS S15.4.4/S15.4.6 coupon quote E2E");
    console.log("- Secure local RPC + real /api/cart/quote path");
    console.log("- Public quote hides internal Promotion/Coupon funding metadata");
    console.log("- Quote responses are no-store");
    console.log("- Stackable percentage and fixed Coupons");
    console.log("- Proportional allocation + deterministic remainder tie-break");
    console.log("- Non-stackable win / lose / exact tie");
    console.log("- Decision 24A unrelated Promotions remain active");
    console.log("- Minimum, max cap, Round Half-Up, restriction union");
    console.log("- Artisan-funded Coupon scope remains enforced by discounted Product scope");
    console.log("- No Redemption consumption is verified separately at the DB boundary");
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error("FAIL S15.4.4/S15.4.6 coupon quote E2E");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
