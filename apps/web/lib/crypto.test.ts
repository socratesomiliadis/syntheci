import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./crypto";

describe("crypto helpers", () => {
  it("encrypts and decrypts symmetrically", () => {
    const value = "super-secret-token";
    const ciphertext = encryptSecret(value);

    expect(ciphertext).not.toBe(value);
    expect(decryptSecret(ciphertext)).toBe(value);
  });

  it("fails decryption for tampered ciphertext", () => {
    const value = "another-secret";
    const ciphertext = encryptSecret(value);
    const tampered = ciphertext.slice(0, -1) + (ciphertext.endsWith("A") ? "B" : "A");

    expect(() => decryptSecret(tampered)).toThrow();
  });
});
