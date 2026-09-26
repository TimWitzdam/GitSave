// @vitest-environment node
import { describe, expect, it } from "vitest";
import { EncryptionService } from "../../backend/services/encryption.service";

describe("EncryptionService", () => {
  it("decrypts what it encrypted", () => {
    const plaintext = "ghp_superSecretAccessToken123456";
    const encrypted = EncryptionService.encrypt(plaintext);
    expect(EncryptionService.decrypt(encrypted)).toBe(plaintext);
  });

  it("produces an iv:ciphertext hex format", () => {
    const encrypted = EncryptionService.encrypt("hello");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(parts[1]).toMatch(/^[0-9a-f]+$/);
  });

  it("never returns the plaintext", () => {
    const plaintext = "very-secret-value";
    expect(EncryptionService.encrypt(plaintext)).not.toContain(plaintext);
  });

  it("uses a random IV so the same input encrypts differently", () => {
    const first = EncryptionService.encrypt("same input");
    const second = EncryptionService.encrypt("same input");
    expect(first).not.toBe(second);
    expect(EncryptionService.decrypt(first)).toBe("same input");
    expect(EncryptionService.decrypt(second)).toBe("same input");
  });

  it("handles unicode and empty strings", () => {
    expect(EncryptionService.decrypt(EncryptionService.encrypt(""))).toBe("");
    expect(EncryptionService.decrypt(EncryptionService.encrypt("ü🔐\n"))).toBe(
      "ü🔐\n"
    );
  });

  it("throws when the ciphertext was tampered with", () => {
    const encrypted = EncryptionService.encrypt("data");
    const [iv, ciphertext] = encrypted.split(":");
    const tamperedCiphertext = ciphertext
      .split("")
      .reverse()
      .join("");
    expect(() =>
      EncryptionService.decrypt(`${iv}:${tamperedCiphertext}`)
    ).toThrow();
  });
});
