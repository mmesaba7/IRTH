const failures = [];
const warnings = [];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) failures.push(`${name} is missing`);
  return value || null;
}

function validHttpsOrigin(name, value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") failures.push(`${name} must use https`);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      failures.push(`${name} must not use localhost in production`);
    }
    if (url.pathname !== "/" || url.search || url.hash) {
      warnings.push(`${name} should normally be an origin without path/query/hash`);
    }
    return url.origin;
  } catch {
    failures.push(`${name} is not a valid URL`);
    return null;
  }
}

function validBase64Key32(name, value) {
  if (!value) return;
  try {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length !== 32) failures.push(`${name} must decode to exactly 32 bytes`);
  } catch {
    failures.push(`${name} must be valid Base64`);
  }
}

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
validHttpsOrigin("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseSecret) {
  failures.push("SUPABASE_SECRET_KEY (or compatibility fallback SUPABASE_SERVICE_ROLE_KEY) is missing");
}

const siteUrl = validHttpsOrigin("NEXT_PUBLIC_SITE_URL", required("NEXT_PUBLIC_SITE_URL"));
const appUrl = validHttpsOrigin("IRTH_APP_URL", required("IRTH_APP_URL"));
if (siteUrl && appUrl && siteUrl !== appUrl) {
  warnings.push("NEXT_PUBLIC_SITE_URL and IRTH_APP_URL use different origins; verify this is intentional");
}

const guestSecret = required("IRTH_GUEST_TRACKING_SECRET");
if (guestSecret && guestSecret.length < 32) {
  failures.push("IRTH_GUEST_TRACKING_SECRET must be at least 32 characters");
}

const payoutKey = required("IRTH_PAYOUT_DATA_ENCRYPTION_KEY_V1");
validBase64Key32("IRTH_PAYOUT_DATA_ENCRYPTION_KEY_V1", payoutKey);

const resendKey = required("RESEND_API_KEY");
if (resendKey && !resendKey.startsWith("re_")) {
  failures.push("RESEND_API_KEY does not have the expected Resend key prefix");
}

const emailFrom = required("IRTH_EMAIL_FROM");
if (emailFrom && !emailFrom.includes("@")) {
  failures.push("IRTH_EMAIL_FROM does not look like an email sender identity");
}

const processorSecret = required("IRTH_EMAIL_PROCESSOR_SECRET");
if (processorSecret && processorSecret.length < 32) {
  failures.push("IRTH_EMAIL_PROCESSOR_SECRET must be at least 32 characters");
}

for (const warning of warnings) console.warn(`WARN ${warning}`);

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`Production environment check failed with ${failures.length} issue(s).`);
  process.exitCode = 1;
} else {
  console.log("Production environment check passed.");
}
