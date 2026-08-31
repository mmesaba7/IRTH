import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_NAME = "IRTH_PAYOUT_DATA_ENCRYPTION_KEY_V1";
const envPath = resolve(process.cwd(), ".env.local");

if (!existsSync(envPath)) {
  writeFileSync(envPath, "", { encoding: "utf8", mode: 0o600 });
}

const current = readFileSync(envPath, "utf8");
const existingLine = current
  .split(/\r?\n/)
  .find((line) => line.trim().startsWith(`${ENV_NAME}=`));

if (existingLine) {
  const value = existingLine.slice(existingLine.indexOf("=") + 1).trim();
  let valid = false;
  try {
    valid = Buffer.from(value, "base64").length === 32;
  } catch {
    valid = false;
  }

  if (!valid) {
    console.error(
      `${ENV_NAME} already exists but is not a valid 32-byte Base64 key. It was NOT overwritten.`
    );
    process.exitCode = 1;
  } else {
    console.log("Local payout encryption key is already configured. No changes made.");
  }
} else {
  const key = randomBytes(32).toString("base64");
  const prefix = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
  appendFileSync(envPath, `${prefix}${ENV_NAME}=${key}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(
    "Local payout encryption key configured in .env.local. The key was intentionally not printed."
  );
}
