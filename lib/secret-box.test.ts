import { describe, expect, test } from "bun:test";

import { decryptSecret, encryptSecret, secretsEqual } from "./secret-box";

const TEST_KEY = Buffer.alloc(32, 7).toString("base64");

describe("secret storage", () => {
  test("encrypts and decrypts a credential", () => {
    const encrypted = encryptSecret("spotify-cookie", TEST_KEY);

    expect(encrypted).not.toContain("spotify-cookie");
    expect(decryptSecret(encrypted, TEST_KEY)).toBe("spotify-cookie");
  });

  test("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("spotify-cookie", TEST_KEY);
    const tampered = `${encrypted.slice(0, -1)}A`;

    expect(() => decryptSecret(tampered, TEST_KEY)).toThrow();
  });

  test("compares dashboard passwords safely", () => {
    expect(secretsEqual("correct horse", "correct horse")).toBeTrue();
    expect(secretsEqual("wrong", "correct horse")).toBeFalse();
    expect(secretsEqual(undefined, "correct horse")).toBeFalse();
  });
});
