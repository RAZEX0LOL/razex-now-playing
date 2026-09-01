import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const PREFIX = "v1";

function decodeKey(encodedKey: string | undefined): Buffer {
  if (!encodedKey) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY is required");
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  return key;
}

export function encryptSecret(
  value: string,
  encodedKey = process.env.CREDENTIALS_ENCRYPTION_KEY,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeKey(encodedKey), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv, tag, encrypted]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

export function decryptSecret(
  payload: string,
  encodedKey = process.env.CREDENTIALS_ENCRYPTION_KEY,
): string {
  const [version, ivValue, tagValue, encryptedValue, extra] = payload.split(".");
  if (version !== PREFIX || !ivValue || !tagValue || !encryptedValue || extra) {
    throw new Error("Encrypted credential has an invalid format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    decodeKey(encodedKey),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function tryDecryptSecret(payload: string): string | null {
  try {
    return decryptSecret(payload);
  } catch {
    return null;
  }
}

export function secretsEqual(actual: unknown, expected: string | undefined): boolean {
  if (typeof actual !== "string" || !expected) return false;

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
