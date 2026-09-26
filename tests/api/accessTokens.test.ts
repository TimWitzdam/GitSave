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

import request from "supertest";
import prisma from "../../prisma/client";
import { scheduleCronJobs } from "../../backend/server";
import { EncryptionService } from "../../backend/services/encryption.service";
import { authCookie, createApiApp } from "../helpers/api";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

const app = createApiApp();

async function seedAlice() {
  return prisma.user.create({
    data: { username: "alice", password: "hash" },
  });
}

describe("access token endpoints", () => {
  afterAll(cleanupTestDatabases);

  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDatabase(prisma);
    await seedAlice();
  });

  describe("GET /api/access-tokens", () => {
    it("returns id and name only and never the token", async () => {
      await prisma.accessToken.create({
        data: {
          name: "github",
          token: EncryptionService.encrypt("plain-token"),
          username: "alice",
        },
      });

      const response = await request(app)
        .get("/api/access-tokens")
        .set("Cookie", authCookie("alice"));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual({
        id: expect.any(Number),
        name: "github",
      });
      expect(JSON.stringify(response.body)).not.toContain("plain-token");
    });

    it("does not return tokens of other users", async () => {
      await prisma.user.create({ data: { username: "bob", password: "hash" } });
      await prisma.accessToken.create({
        data: { name: "bob-token", token: "x", username: "bob" },
      });

      const response = await request(app)
        .get("/api/access-tokens")
        .set("Cookie", authCookie("alice"));
      expect(response.body).toEqual([]);
    });

    it("returns 401 without authentication", async () => {
      const response = await request(app).get("/api/access-tokens");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/access-tokens", () => {
    it("creates an encrypted access token", async () => {
      const response = await request(app)
        .post("/api/access-tokens")
        .set("Cookie", authCookie("alice"))
        .send({ name: "github", token: "ghp_secret" });

      expect(response.status).toBe(200);
      const stored = await prisma.accessToken.findFirstOrThrow();
      expect(stored.name).toBe("github");
      expect(stored.token).not.toBe("ghp_secret");
      expect(EncryptionService.decrypt(stored.token)).toBe("ghp_secret");
      expect(response.body.token).not.toBe("ghp_secret");
    });

    it("rejects an invalid body", async () => {
      const response = await request(app)
        .post("/api/access-tokens")
        .set("Cookie", authCookie("alice"))
        .send({ name: "github" });
      expect(response.status).toBe(400);
      expect(await prisma.accessToken.count()).toBe(0);
    });

    it("requires authentication", async () => {
      const response = await request(app)
        .post("/api/access-tokens")
        .send({ name: "github", token: "ghp_secret" });
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/access-tokens/:id", () => {
    it("updates only the name when no new token is sent", async () => {
      const created = await prisma.accessToken.create({
        data: {
          name: "old",
          token: EncryptionService.encrypt("keep-me"),
          username: "alice",
        },
      });

      const response = await request(app)
        .put(`/api/access-tokens/${created.id}`)
        .set("Cookie", authCookie("alice"))
        .send({ name: "renamed" });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("renamed");
      const stored = await prisma.accessToken.findUniqueOrThrow({
        where: { id: created.id },
      });
      expect(EncryptionService.decrypt(stored.token)).toBe("keep-me");
      expect(scheduleCronJobs).toHaveBeenCalled();
    });

    it("re-encrypts the token when a new token is sent", async () => {
      const created = await prisma.accessToken.create({
        data: {
          name: "old",
          token: EncryptionService.encrypt("old-token"),
          username: "alice",
        },
      });

      const response = await request(app)
        .put(`/api/access-tokens/${created.id}`)
        .set("Cookie", authCookie("alice"))
        .send({ name: "renamed", token: "new-token" });

      expect(response.status).toBe(200);
      const stored = await prisma.accessToken.findUniqueOrThrow({
        where: { id: created.id },
      });
      expect(EncryptionService.decrypt(stored.token)).toBe("new-token");
    });

    it("rejects an invalid body", async () => {
      const response = await request(app)
        .put("/api/access-tokens/1")
        .set("Cookie", authCookie("alice"))
        .send({});
      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/access-tokens/:id", () => {
    it("deletes the token and reschedules the cron jobs", async () => {
      const created = await prisma.accessToken.create({
        data: { name: "github", token: "x", username: "alice" },
      });

      const response = await request(app)
        .delete(`/api/access-tokens/${created.id}`)
        .set("Cookie", authCookie("alice"));

      expect(response.status).toBe(204);
      expect(
        await prisma.accessToken.findUnique({ where: { id: created.id } })
      ).toBeNull();
      expect(scheduleCronJobs).toHaveBeenCalled();
    });

    it("requires authentication", async () => {
      const response = await request(app).delete("/api/access-tokens/1");
      expect(response.status).toBe(401);
    });
  });
});
