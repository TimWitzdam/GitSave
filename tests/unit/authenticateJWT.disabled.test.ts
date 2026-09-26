// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../backend/configs/app.config", () => ({
  DISABLE_AUTH: true,
  JWT_SECRET: "test-secret",
  ENCRYPTION_SECRET: "01234567890123456789012345678901",
  PORT: 3000,
  GIT_TIMEOUT: undefined,
}));

vi.mock("../../prisma/client", () => ({
  default: { user: { findFirst: vi.fn() } },
}));

import type { NextFunction, Request, Response } from "express";
import prisma from "../../prisma/client";
import { authenticateJWT } from "../../backend/middlewares/authenticateJWT";

const findFirstMock = vi.mocked(prisma.user.findFirst);

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  };
}

describe("authenticateJWT with DISABLE_AUTH=true", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns 500 when no user exists yet", async () => {
    findFirstMock.mockResolvedValue(null);
    const res = createResponse();
    const next = vi.fn();
    authenticateJWT(
      {} as unknown as Request,
      res as unknown as Response,
      next as unknown as NextFunction
    );
    await vi.waitFor(() =>
      expect(res.status).toHaveBeenCalledWith(500)
    );
    expect(res.json).toHaveBeenCalledWith({ message: "No user found" });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches the first user and calls next", async () => {
    const user = { username: "alice", password: "hash" };
    findFirstMock.mockResolvedValue(user as never);
    const req = {};
    const next = vi.fn();
    authenticateJWT(
      req as unknown as Request,
      createResponse() as unknown as Response,
      next as unknown as NextFunction
    );
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
    expect((req as { user?: unknown }).user).toEqual(user);
  });

  it("redirects to the dashboard for page requests", async () => {
    findFirstMock.mockResolvedValue({ username: "alice" } as never);
    const res = createResponse();
    authenticateJWT(
      {} as unknown as Request,
      res as unknown as Response,
      vi.fn() as unknown as NextFunction,
      true
    );
    await vi.waitFor(() =>
      expect(res.redirect).toHaveBeenCalledWith("/dashboard")
    );
  });

  it("ignores the password field when attaching the user", async () => {
    findFirstMock.mockResolvedValue({
      username: "alice",
      password: "hash",
    } as never);
    const req = {};
    const next = vi.fn();
    authenticateJWT(
      req as unknown as Request,
      createResponse() as unknown as Response,
      next as unknown as NextFunction,
      false
    );
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
    expect((req as { user?: { username: string } }).user?.username).toBe(
      "alice"
    );
  });
});
