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
import { authCookie, createApiApp } from "../helpers/api";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

const app = createApiApp();

async function seedHistory() {
  const alice = await prisma.user.create({
    data: { username: "alice", password: "hash" },
  });
  const bob = await prisma.user.create({
    data: { username: "bob", password: "hash" },
  });
  const aliceJob = await prisma.backupJob.create({
    data: {
      name: "alice repo",
      repository: "https://example.com/alice.git",
      cron: "*/5 * * * *",
      username: alice.username,
    },
  });
  const bobJob = await prisma.backupJob.create({
    data: {
      name: "bob repo",
      repository: "https://example.com/bob.git",
      cron: "*/5 * * * *",
      username: bob.username,
    },
  });

  await prisma.backupHistory.createMany({
    data: [
      {
        backupJobId: aliceJob.id,
        timestamp: new Date("2026-01-01T10:00:00Z"),
        success: true,
      },
      {
        backupJobId: aliceJob.id,
        timestamp: new Date("2026-01-02T10:00:00Z"),
        success: false,
        message: "failed",
      },
      {
        backupJobId: bobJob.id,
        timestamp: new Date("2026-01-03T10:00:00Z"),
        success: true,
      },
      {
        backupJobId: null,
        timestamp: new Date("2026-01-04T10:00:00Z"),
        success: false,
        message: "orphan",
      },
    ],
  });
}

describe("GET /api/history", () => {
  afterAll(cleanupTestDatabases);

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedHistory();
  });

  it("returns the user's history and orphaned entries ordered by newest first", async () => {
    const response = await request(app)
      .get("/api/history?limit=10&offset=0")
      .set("Cookie", authCookie("alice"));

    expect(response.status).toBe(200);
    expect(response.body.totalCount).toBe(3);
    expect(
      response.body.backupHistory.map(
        (entry: { message: string | null }) => entry.message
      )
    ).toEqual(["orphan", "failed", null]);
    expect(response.body.backupHistory[1].backupJob).toEqual({
      name: "alice repo",
    });
    expect(response.body.backupHistory[0].backupJob).toBeNull();
  });

  it("does not leak other users' history", async () => {
    const response = await request(app)
      .get("/api/history?limit=10&offset=0")
      .set("Cookie", authCookie("alice"));

    const names = response.body.backupHistory
      .filter((entry: { backupJob: unknown }) => entry.backupJob !== null)
      .map((entry: { backupJob: { name: string } }) => entry.backupJob.name);
    expect(names).not.toContain("bob repo");
  });

  it("supports pagination", async () => {
    const response = await request(app)
      .get("/api/history?limit=1&offset=1")
      .set("Cookie", authCookie("alice"));

    expect(response.status).toBe(200);
    expect(response.body.totalCount).toBe(3);
    expect(response.body.backupHistory).toHaveLength(1);
    expect(response.body.backupHistory[0].message).toBe("failed");
  });

  it("returns 400 when limit and offset are missing", async () => {
    const response = await request(app)
      .get("/api/history")
      .set("Cookie", authCookie("alice"));
    expect(response.status).toBe(400);
    expect(response.text).toBe("Invalid limit or offset");
  });

  it("returns 400 for a zero limit", async () => {
    const response = await request(app)
      .get("/api/history?limit=0&offset=0")
      .set("Cookie", authCookie("alice"));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a negative offset", async () => {
    const response = await request(app)
      .get("/api/history?limit=10&offset=-1")
      .set("Cookie", authCookie("alice"));
    expect(response.status).toBe(400);
  });

  it("returns 400 for non-numeric values", async () => {
    const response = await request(app)
      .get("/api/history?limit=abc&offset=0")
      .set("Cookie", authCookie("alice"));
    expect(response.status).toBe(400);
  });

  it("returns 401 without authentication", async () => {
    const response = await request(app).get("/api/history?limit=10&offset=0");
    expect(response.status).toBe(401);
  });
});
