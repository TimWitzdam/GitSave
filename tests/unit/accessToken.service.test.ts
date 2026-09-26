// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../prisma/client", async () => {
  const { createTestDatabase } = await import("../helpers/testDb");
  return { default: createTestDatabase().prisma };
});

import prisma from "../../prisma/client";
import { AccessTokenService } from "../../backend/services/accessToken.service";
import { EncryptionService } from "../../backend/services/encryption.service";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

async function seedUser(username = "alice") {
  return prisma.user.create({ data: { username, password: "hash" } });
}

describe("AccessTokenService", () => {
  afterAll(cleanupTestDatabases);

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedUser();
  });

  it("stores tokens encrypted and never in plain text", async () => {
    await AccessTokenService.createAccessToken(
      "github",
      "ghp_plaintext_token",
      "alice"
    );
    const stored = await prisma.accessToken.findFirstOrThrow({
      where: { name: "github" },
    });
    expect(stored.token).not.toBe("ghp_plaintext_token");
    expect(stored.token).not.toContain("ghp_plaintext_token");
    expect(EncryptionService.decrypt(stored.token)).toBe("ghp_plaintext_token");
  });

  it("lists only id and name for the given user", async () => {
    await AccessTokenService.createAccessToken("github", "token-a", "alice");
    await prisma.user.create({ data: { username: "bob", password: "hash" } });
    await AccessTokenService.createAccessToken("gitlab", "token-b", "bob");

    const tokens = await AccessTokenService.getAccessToken("alice");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ id: expect.any(Number), name: "github" });
    expect(tokens[0]).not.toHaveProperty("token");
  });

  it("returns an empty list for a user without tokens", async () => {
    expect(await AccessTokenService.getAccessToken("alice")).toEqual([]);
  });

  it("updates only the name when no new token is given", async () => {
    const created = await AccessTokenService.createAccessToken(
      "old-name",
      "secret-token",
      "alice"
    );
    const updated = await AccessTokenService.updateAccessToken(
      created.id,
      "new-name",
      ""
    );
    expect(updated.name).toBe("new-name");
    expect(EncryptionService.decrypt(updated.token)).toBe("secret-token");
  });

  it("updates name and token when a new token is given", async () => {
    const created = await AccessTokenService.createAccessToken(
      "old-name",
      "old-token",
      "alice"
    );
    const updated = await AccessTokenService.updateAccessToken(
      created.id,
      "new-name",
      "new-token"
    );
    expect(updated.name).toBe("new-name");
    expect(EncryptionService.decrypt(updated.token)).toBe("new-token");
  });

  it("deletes an access token", async () => {
    const created = await AccessTokenService.createAccessToken(
      "github",
      "token",
      "alice"
    );
    await AccessTokenService.deleteAccessToken(created.id);
    expect(
      await prisma.accessToken.findUnique({ where: { id: created.id } })
    ).toBeNull();
  });
});
