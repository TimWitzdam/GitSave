// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../prisma/client", async () => {
  const { createTestDatabase } = await import("../helpers/testDb");
  return { default: createTestDatabase().prisma };
});

vi.mock("../../backend/server", () => ({
  createBackup: vi.fn(),
  resumeCronJob: vi.fn(),
  scheduleCronJobs: vi.fn(),
  stopCronJob: vi.fn(),
}));

import bcrypt from "bcryptjs";
import request from "supertest";
import prisma from "../../prisma/client";
import { authCookie, createApiApp } from "../helpers/api";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

const app = createApiApp();

async function waitForUser(username: string) {
  await vi.waitFor(async () => {
    expect(
      await prisma.user.findUnique({ where: { username } })
    ).not.toBeNull();
  });
}

async function registerUser(username: string, password: string) {
  const response = await request(app)
    .post("/api/register")
    .send({ username, password });
  await waitForUser(username);
  return response;
}

describe("POST /api/register", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it("creates the user, hashes the password and returns a token", async () => {
    const response = await registerUser("alice", "s3cret");
    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();

    const user = await prisma.user.findUniqueOrThrow({
      where: { username: "alice" },
    });
    expect(user.password).not.toBe("s3cret");
    expect(bcrypt.compareSync("s3cret", user.password)).toBe(true);
  });

  it("rejects a second registration with a redirect to /login", async () => {
    await registerUser("alice", "s3cret");
    const response = await request(app)
      .post("/api/register")
      .send({ username: "bob", password: "other" });
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login");
  });

  it("rejects requests with an invalid body", async () => {
    const response = await request(app)
      .post("/api/register")
      .send({ username: "alice" });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid request body" });
  });
});

describe("POST /api/login", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
    await registerUser("alice", "s3cret");
  });

  it("returns a valid token for correct credentials", async () => {
    const response = await request(app)
      .post("/api/login")
      .send({ username: "alice", password: "s3cret" });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();

    const nameResponse = await request(app)
      .get("/api/user/name")
      .set("Cookie", `auth_session=${response.body.token}`);
    expect(nameResponse.status).toBe(200);
    expect(nameResponse.body).toEqual({ username: "alice" });
  });

  it("returns 401 for an unknown user", async () => {
    const response = await request(app)
      .post("/api/login")
      .send({ username: "nobody", password: "s3cret" });
    expect(response.status).toBe(401);
    expect(response.text).toBe("Invalid credentials");
  });

  it("returns 401 for a wrong password", async () => {
    const response = await request(app)
      .post("/api/login")
      .send({ username: "alice", password: "wrong" });
    expect(response.status).toBe(401);
  });

  it("returns 400 when the body is incomplete", async () => {
    const response = await request(app)
      .post("/api/login")
      .send({ username: "alice" });
    expect(response.status).toBe(400);
  });
});

describe("GET /api/user/name", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
    await registerUser("alice", "s3cret");
  });

  it("returns the username for an authenticated request", async () => {
    const response = await request(app)
      .get("/api/user/name")
      .set("Cookie", authCookie("alice"));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ username: "alice" });
  });

  it("returns 401 without a cookie", async () => {
    const response = await request(app).get("/api/user/name");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "No token provided" });
  });

  it("returns 403 for an invalid token", async () => {
    const response = await request(app)
      .get("/api/user/name")
      .set("Cookie", "auth_session=invalid");
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Invalid token" });
  });
});

describe("PUT /api/user/name", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
    await registerUser("alice", "s3cret");
  });

  it("renames the user and returns a token for the new name", async () => {
    const response = await request(app)
      .put("/api/user/name")
      .set("Cookie", authCookie("alice"))
      .send({ username: "bob" });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(
      await prisma.user.findUnique({ where: { username: "alice" } })
    ).toBeNull();
    expect(
      await prisma.user.findUnique({ where: { username: "bob" } })
    ).not.toBeNull();

    const nameResponse = await request(app)
      .get("/api/user/name")
      .set("Cookie", `auth_session=${response.body.token}`);
    expect(nameResponse.body).toEqual({ username: "bob" });
  });

  it("returns 409 when the new username is taken", async () => {
    await prisma.user.create({ data: { username: "bob", password: "hash" } });
    const response = await request(app)
      .put("/api/user/name")
      .set("Cookie", authCookie("alice"))
      .send({ username: "bob" });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: "Username already exists" });
  });

  it("returns 400 for an invalid body", async () => {
    const response = await request(app)
      .put("/api/user/name")
      .set("Cookie", authCookie("alice"))
      .send({});
    expect(response.status).toBe(400);
  });

  it("returns 401 without authentication", async () => {
    const response = await request(app)
      .put("/api/user/name")
      .send({ username: "bob" });
    expect(response.status).toBe(401);
  });
});

describe("POST /api/user/password", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
    await registerUser("alice", "s3cret");
  });

  it("changes the password so the new one can be used to log in", async () => {
    const response = await request(app)
      .post("/api/user/password")
      .set("Cookie", authCookie("alice"))
      .send({ password: "s3cret", newPassword: "brand-new" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Password updated" });

    await vi.waitFor(async () => {
      const login = await request(app)
        .post("/api/login")
        .send({ username: "alice", password: "brand-new" });
      expect(login.status).toBe(200);
    });
  });

  it("rejects a wrong current password", async () => {
    const response = await request(app)
      .post("/api/user/password")
      .set("Cookie", authCookie("alice"))
      .send({ password: "wrong", newPassword: "brand-new" });
    expect(response.status).toBe(401);
    expect(response.text).toBe("Invalid credentials");

    const login = await request(app)
      .post("/api/login")
      .send({ username: "alice", password: "s3cret" });
    expect(login.status).toBe(200);
  });

  it("returns 400 for an invalid body", async () => {
    const response = await request(app)
      .post("/api/user/password")
      .set("Cookie", authCookie("alice"))
      .send({ password: "s3cret" });
    expect(response.status).toBe(400);
  });

  it("returns 401 without authentication", async () => {
    const response = await request(app)
      .post("/api/user/password")
      .send({ password: "s3cret", newPassword: "brand-new" });
    expect(response.status).toBe(401);
  });
});

afterAll(cleanupTestDatabases);
