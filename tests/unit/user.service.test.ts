// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../prisma/client", async () => {
  const { createTestDatabase } = await import("../helpers/testDb");
  return { default: createTestDatabase().prisma };
});

import jwt from "jsonwebtoken";
import prisma from "../../prisma/client";
import { UserService } from "../../backend/services/user.service";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

describe("UserService", () => {
  afterAll(cleanupTestDatabases);

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it("creates a user and finds it by username", async () => {
    await UserService.createUser("alice", "hashed-password");
    const user = await UserService.getUserByUsername("alice");
    expect(user).toEqual({ username: "alice", password: "hashed-password" });
  });

  it("returns null for an unknown username", async () => {
    expect(await UserService.getUserByUsername("nobody")).toBeNull();
  });

  it("updates the username", async () => {
    await UserService.createUser("alice", "hash");
    const updated = await UserService.updateUsername("alice", "bob");
    expect(updated.username).toBe("bob");
    expect(await UserService.getUserByUsername("alice")).toBeNull();
    expect(await UserService.getUserByUsername("bob")).not.toBeNull();
  });

  it("updates the password", async () => {
    await UserService.createUser("alice", "old-hash");
    await UserService.updateUserPassword("alice", "new-hash");
    const user = await UserService.getUserByUsername("alice");
    expect(user?.password).toBe("new-hash");
  });

  it("creates a JWT containing the username that is valid for 7 days", () => {
    const token = UserService.createJWTToken("alice");
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload;
    expect(decoded.username).toBe("alice");
    expect(decoded.exp! - decoded.iat!).toBe(7 * 24 * 60 * 60);
  });
});
