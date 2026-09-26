// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../prisma/client", async () => {
  const { createTestDatabase } = await import("../helpers/testDb");
  return { default: createTestDatabase().prisma };
});

import type { NextFunction, Request, Response } from "express";
import prisma from "../../prisma/client";
import { userExistCheck } from "../../backend/middlewares/userExistCheck";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

function createResponse() {
  return {
    redirect: vi.fn().mockReturnThis(),
  };
}

describe("userExistCheck", () => {
  afterAll(cleanupTestDatabases);

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it("calls next when no user exists yet", async () => {
    const next = vi.fn();
    userExistCheck(
      {} as Request,
      createResponse() as unknown as Response,
      next as unknown as NextFunction
    );
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
  });

  it("redirects to /login when at least one user exists", async () => {
    await prisma.user.create({
      data: { username: "alice", password: "hash" },
    });
    const res = createResponse();
    const next = vi.fn();
    userExistCheck(
      {} as Request,
      res as unknown as Response,
      next as unknown as NextFunction
    );
    await vi.waitFor(() =>
      expect(res.redirect).toHaveBeenCalledWith("/login")
    );
    expect(next).not.toHaveBeenCalled();
  });
});
