import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

const KEY_VERSION = 1;
const AAD = Buffer.from("IRTH:payout-account:v1", "utf8");
const ENV_KEY = "IRTH_PAYOUT_DATA_ENCRYPTION_KEY_V1";

export type BankTransferDetails = {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  iban: string | null;
  swift: string | null;
};

function cleanText(value: unknown, min: number, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (normalized.length < min || normalized.length > max) return null;
  return normalized;
}

function cleanAccountNumber(value: unknown) {
  const normalized = cleanText(value, 4, 64);
  if (!normalized) return null;
  if (!/^[A-Za-z0-9 .\-_/]+$/.test(normalized)) return null;
  return normalized;
}

function cleanIban(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{15,34}$/.test(normalized)) return undefined;
  return normalized;
}

function cleanSwift(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{8}(?:[A-Z0-9]{3})?$/.test(normalized)) return undefined;
  return normalized;
}

export function validateBankTransferDetails(
  input: unknown
): BankTransferDetails | null {
  if (typeof input !== "object" || input === null) return null;
  const source = input as Record<string, unknown>;

  const bankName = cleanText(source.bankName, 2, 120);
  const accountHolder = cleanText(source.accountHolder, 2, 160);
  const accountNumber = cleanAccountNumber(source.accountNumber);
  const iban = cleanIban(source.iban);
  const swift = cleanSwift(source.swift);

  if (!bankName || !accountHolder || !accountNumber) return null;
  if (iban === undefined || swift === undefined) return null;

  return { bankName, accountHolder, accountNumber, iban, swift };
}

function getKey() {
  const encoded = process.env[ENV_KEY]?.trim();
  if (!encoded) {
    throw new Error("Missing payout encryption key configuration");
  }

  let key: Buffer;
  try {
    key = Buffer.from(encoded, "base64");
  } catch {
    throw new Error("Invalid payout encryption key configuration");
  }

  if (key.length !== 32) {
    throw new Error("Invalid payout encryption key configuration");
  }

  return key;
}

function canonicalize(details: BankTransferDetails) {
  return JSON.stringify({
    bankName: details.bankName,
    accountHolder: details.accountHolder,
    accountNumber: details.accountNumber,
    iban: details.iban,
    swift: details.swift,
  });
}

function fingerprintKey(key: Buffer) {
  return createHmac("sha256", key)
    .update("IRTH:payout-account:fingerprint-key:v1", "utf8")
    .digest();
}

export function encryptPayoutDetails(details: BankTransferDetails) {
  const key = getKey();
  const plaintext = Buffer.from(canonicalize(details), "utf8");
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const fingerprint = createHmac("sha256", fingerprintKey(key))
    .update(plaintext)
    .digest("hex");

  return {
    detailsCiphertext: [
      `v${KEY_VERSION}`,
      iv.toString("base64url"),
      tag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(":"),
    detailsFingerprint: fingerprint,
    encryptionKeyVersion: KEY_VERSION,
  };
}

export function decryptPayoutDetails(
  encoded: string,
  keyVersion: number
): BankTransferDetails {
  if (keyVersion !== KEY_VERSION) {
    throw new Error("Unsupported payout encryption key version");
  }

  const [version, ivPart, tagPart, ciphertextPart, extra] = encoded.split(":");
  if (
    version !== `v${KEY_VERSION}` ||
    !ivPart ||
    !tagPart ||
    !ciphertextPart ||
    extra !== undefined
  ) {
    throw new Error("Invalid payout ciphertext format");
  }

  const key = getKey();
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const ciphertext = Buffer.from(ciphertextPart, "base64url");

  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid payout ciphertext format");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");

    const parsed = JSON.parse(plaintext) as unknown;
    const validated = validateBankTransferDetails(parsed);
    if (!validated) throw new Error("Invalid decrypted payout details");
    return validated;
  } catch {
    throw new Error("Unable to decrypt payout details");
  }
}

export function maskSensitiveValue(value: string, visible = 4) {
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= visible) return "••••";
  return `${"•".repeat(Math.min(8, compact.length - visible))}${compact.slice(-visible)}`;
}
