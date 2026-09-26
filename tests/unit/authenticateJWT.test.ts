// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("../../prisma/client", () => ({
  default: { user: { findFirst: vi.fn() } },
}));

import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { authenticateJWT } from "../../backend/middlewares/authenticateJWT";

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  };
}

function createRequest(cookie?: string) {
  return { headers: { cookie } };
}

function validToken(username = "alice") {
  return jwt.sign({ username }, process.env.JWT_SECRET as string);
}

describe("authenticateJWT (authentication enabled)", () => {
  it("rejects a request without a cookie with 401", () => {
    const res = createResponse();
    const next = vi.fn();
    authenticateJWT(
      createRequest() as unknown as Request,
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "No token provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an invalid token with 403", () => {
    const res = createResponse();
    const next = vi.fn();
    authenticateJWT(
      createRequest("auth_session=not-a-jwt") as unknown as Request,
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a token signed with the wrong secret", () => {
    const token = jwt.sign({ username: "alice" }, "wrong-secret");
    const res = createResponse();
    const next = vi.fn();
    authenticateJWT(
      createRequest(`auth_session=${token}`) as unknown as Request,
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid token, attaches the user and calls next", () => {
    const req = createRequest(`auth_session=${validToken("alice")}`);
    const res = createResponse();
    const next = vi.fn();
    authenticateJWT(
      req as unknown as Request,
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledOnce();
    expect((req as { user?: { username: string } }).user).toMatchObject({
      username: "alice",
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("finds the auth cookie among other cookies", () => {
    const req = createRequest(
      `theme=dark; auth_session=${validToken("bob")}; other=1`
    );
    const next = vi.fn();
    authenticateJWT(
      req as unknown as Request,
      createResponse() as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledOnce();
    expect((req as { user?: { username: string } }).user).toMatchObject({
      username: "bob",
    });
  });

  describe("when guarding the login page (redirectOnSuccess = true)", () => {
    it("lets visitors without a token through to the login page", () => {
      const next = vi.fn();
      authenticateJWT(
        createRequest() as unknown as Request,
        createResponse() as unknown as Response,
        next as unknown as NextFunction,
        true
      );
      expect(next).toHaveBeenCalledOnce();
    });

    it("redirects logged in users to the dashboard", () => {
      const res = createResponse();
      authenticateJWT(
        createRequest(`auth_session=${validToken()}`) as unknown as Request,
        res as unknown as Response,
        vi.fn() as unknown as NextFunction,
        true
      );
      expect(res.redirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("when guarding the dashboard (redirectOnSuccess = false)", () => {
    it("redirects requests without a token to the login page", () => {
      const res = createResponse();
      authenticateJWT(
        createRequest() as unknown as Request,
        res as unknown as Response,
        vi.fn() as unknown as NextFunction,
        false
      );
      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    it("redirects requests with an invalid token to the login page", () => {
      const res = createResponse();
      authenticateJWT(
        createRequest("auth_session=broken") as unknown as Request,
        res as unknown as Response,
        vi.fn() as unknown as NextFunction,
        false
      );
      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    it("lets valid requests through", () => {
      const next = vi.fn();
      authenticateJWT(
        createRequest(`auth_session=${validToken()}`) as unknown as Request,
        createResponse() as unknown as Response,
        next as unknown as NextFunction,
        false
      );
      expect(next).toHaveBeenCalledOnce();
    });
  });
});
