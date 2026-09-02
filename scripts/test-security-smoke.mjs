const baseUrl = (process.env.IRTH_SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  console.log(`PASS ${label}`);
}

async function main() {
  console.log(`IRTH security smoke target: ${baseUrl}`);

  const home = await fetch(baseUrl, { redirect: "manual" });
  assertEqual(home.headers.get("x-content-type-options"), "nosniff", "X-Content-Type-Options");
  assertEqual(home.headers.get("referrer-policy"), "strict-origin-when-cross-origin", "Referrer-Policy");
  assertEqual(home.headers.get("x-frame-options"), "DENY", "X-Frame-Options");
  assertEqual(home.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()", "Permissions-Policy");

  const orderGuard = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: {
      Origin: "https://evil.example",
      "Content-Type": "application/json",
      "Idempotency-Key": "security-smoke-1234",
    },
    body: JSON.stringify({ items: [], paymentMethod: "cod" }),
  });
  assertEqual(orderGuard.status, 403, "Order cross-origin guard");

  const shippingGuard = await fetch(`${baseUrl}/api/admin/shipping-settings`, {
    method: "PATCH",
    headers: {
      Origin: "https://evil.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assertEqual(shippingGuard.status, 403, "Shipping settings cross-origin guard");

  console.log("Security smoke test passed.");
}

main().catch((error) => {
  console.error("Security smoke test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
