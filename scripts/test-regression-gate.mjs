import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`MISSING FILE: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireFile(role, relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${role}: missing route/file ${relativePath}`);
  }
}

function requireMarkers(role, relativePath, markers) {
  const content = read(relativePath);
  for (const marker of markers) {
    if (!content.includes(marker)) {
      failures.push(`${role}: ${relativePath} lost required marker: ${marker}`);
    }
  }
}

console.log("IRTH Regression Gate — role-by-role critical flow check");

// Customer critical flows
requireMarkers("Customer", "src/app/components/Header.tsx", [
  "/account/login",
  "/account",
  "/account/orders",
]);
requireMarkers("Customer", "src/app/checkout/page.tsx", [
  "/api/orders",
  "/order-success",
]);
requireFile("Customer", "src/app/account/orders/page.tsx");
requireFile("Customer", "src/app/components/ReturnRequestPanel.tsx");
requireFile("Customer", "src/app/product/[slug]/review/page.tsx");
requireFile("Customer", "src/app/components/ReviewImagesEditor.tsx");
requireFile("Customer", "src/app/saved/page.tsx");
requireFile("Customer", "src/app/recently-viewed/page.tsx");

// Artisan critical flows
requireMarkers("Artisan", "src/app/artisan/products/page.tsx", [
  "/artisan/products/new",
  "/artisan/products/edit/",
  "submitForReview",
  "archive_own_product",
]);
requireMarkers("Artisan", "src/app/artisan/products/edit/[slug]/page.tsx", [
  "update_own_product_content",
  "update_own_product_inventory",
  "product_market_price",
  "ProductMediaManager",
]);
requireMarkers("Artisan", "src/app/artisan/products/edit/[slug]/layout.tsx", [
  "archive_own_product",
  "حذف المنتج",
  "pendingReview",
]);
requireMarkers("Artisan", "src/app/artisan/products/ProductMediaManager.tsx", [
  "/media/upload-intent",
  "/media/finalize",
  "/media/reorder",
  "method: \"DELETE\"",
  "new tus.Upload",
]);
requireMarkers("Artisan", "src/app/artisan/orders/page.tsx", [
  "FulfillmentActionForm",
]);
requireFile("Artisan", "src/app/artisan/promotions/page.tsx");
requireFile("Artisan", "src/app/artisan/reviews/page.tsx");
requireFile("Artisan", "src/app/artisan/payouts/page.tsx");
requireMarkers("Artisan", "src/app/artisan/payouts/settings/page.tsx", [
  'redirect("/artisan/payouts/setting")',
]);

// Admin critical flows
requireMarkers("Admin", "src/app/dashboard-admin/orders/page.tsx", [
  "OrderConfirmForm",
  "ShipmentActionForm",
  "TrackingMetadataForm",
]);
requireFile("Admin", "src/app/dashboard-admin/products/page.tsx");
requireMarkers("Admin", "src/app/dashboard-admin/product-price-reviews/page.tsx", [
  "product_market_price",
  "review_product_market_price_request",
  "Approve Price",
  "Reject Price",
]);
requireMarkers("Admin", "src/app/dashboard-admin/product-management/page.tsx", [
  "admin_archive_product",
  "سبب الإزالة",
  "إزالة المنتج",
]);
requireMarkers("Admin", "src/app/dashboard-admin/dashboard/page.tsx", [
  "/dashboard-admin/product-price-reviews",
  "/dashboard-admin/product-management",
]);
requireFile("Admin", "src/app/dashboard-admin/returns/page.tsx");
requireFile("Admin", "src/app/dashboard-admin/payouts/page.tsx");
requireFile("Admin", "src/app/dashboard-admin/reviews/page.tsx");
requireFile("Admin", "src/app/dashboard-admin/customers/page.tsx");
requireFile("Admin", "src/app/dashboard-admin/commission/page.tsx");
requireFile("Admin", "src/app/dashboard-admin/content/page.tsx");
requireFile("Admin", "src/app/dashboard-admin/content/history/page.tsx");
requireMarkers("Admin Tax", "src/app/dashboard-admin/settings/page.tsx", [
  "TaxSettings",
  "Shipping, Tax, and the Return Window",
]);
requireMarkers("Admin Tax", "src/app/dashboard-admin/settings/TaxSettings.tsx", [
  "/api/admin/tax-settings",
  "tax-inclusive",
  "Save Tax Rate",
]);

// Compatibility + security boundaries that must not silently disappear
requireMarkers("Compatibility", "src/app/product/new/page.tsx", [
  "/artisan/products/new",
]);
requireMarkers("Compatibility", "src/app/admin/review/page.tsx", [
  "/dashboard-admin/products",
]);
requireMarkers("Compatibility", "src/app/admin/settings/page.tsx", [
  "/dashboard-admin/settings",
]);
requireMarkers("Security", "src/app/api/orders/route.ts", [
  "isSameOriginMutation",
  "jsonNoStore",
]);
requireMarkers("Security", "src/app/api/admin/shipping-settings/route.ts", [
  "isSameOriginMutation",
  "jsonNoStore",
]);
requireMarkers("Tax Security", "src/app/api/admin/tax-settings/route.ts", [
  "isSameOriginMutation",
  "get_market_tax_settings",
  "set_market_tax_rate",
  "jsonNoStore",
]);
requireMarkers("Tax DB boundary", "supabase/migrations/20260902225000_add_dynamic_tax_foundation.sql", [
  "tax_rate_percent",
  "snapshot_order_item_tax",
  "tax_withheld",
  "refund_tax_reversal",
  "tax_configuration_history",
  "set_market_tax_rate",
]);
requireMarkers("Product DB boundary", "supabase/migrations/20260902160000_restore_artisan_product_management.sql", [
  "update_own_product_content",
  "archive_own_product",
  "product_media_artisan_change_requires_review",
  "product is pending review",
]);
requireMarkers("Product pricing boundary", "supabase/migrations/20260902155218_ensure_initial_market_price_on_product_approval.sql", [
  "apply_product_moderation_decision",
  "product_market_prices",
  "No active market exists for artisan country",
]);
requireMarkers("Admin product archive boundary", "supabase/migrations/20260902160520_add_super_admin_product_archive.sql", [
  "admin_archive_product",
  "private.is_super_admin",
  "private.emit_notification",
  "admin_archive",
]);

if (failures.length > 0) {
  console.error("\nREGRESSION GATE FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Regression Gate passed: Customer, Artisan, Admin, compatibility, and critical security markers are present.");
