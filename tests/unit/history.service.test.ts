// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../prisma/client", async () => {
  const { createTestDatabase } = await import("../helpers/testDb");
  return { default: createTestDatabase().prisma };
});

import prisma from "../../prisma/client";
import { HistoryService } from "../../backend/services/history.service";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

interface SeedResult {
  aliceJobId: number;
  bobJobId: number;
}

async function seedHistory(): Promise<SeedResult> {
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

  await prisma.backupHistory.create({
    data: {
      backupJobId: aliceJob.id,
      timestamp: new Date("2026-01-01T10:00:00Z"),
      success: true,
    },
  });
  await prisma.backupHistory.create({
    data: {
      backupJobId: aliceJob.id,
      timestamp: new Date("2026-01-02T10:00:00Z"),
      success: false,
      message: "failed",
    },
  });
  await prisma.backupHistory.create({
    data: {
      backupJobId: bobJob.id,
      timestamp: new Date("2026-01-03T10:00:00Z"),
      success: true,
    },
  });
  await prisma.backupHistory.create({
    data: {
      backupJobId: null,
      timestamp: new Date("2026-01-04T10:00:00Z"),
      success: false,
      message: "orphan",
    },
  });

  return { aliceJobId: aliceJob.id, bobJobId: bobJob.id };
}

describe("HistoryService", () => {
  afterAll(cleanupTestDatabases);

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it("returns the user's history and orphaned entries, newest first", async () => {
    await seedHistory();
    const { backupHistory, totalCount } = await HistoryService.getHistory(
      "alice",
      0,
      10
    );

    expect(totalCount).toBe(3);
    expect(backupHistory.map((entry) => entry.message)).toEqual([
      "orphan",
      "failed",
      null,
    ]);
    expect(backupHistory[0].backupJob).toBeNull();
    expect(backupHistory[1].backupJob).toEqual({ name: "alice repo" });
  });

  it("does not return other users' history", async () => {
    await seedHistory();
    const { backupHistory, totalCount } = await HistoryService.getHistory(
      "bob",
      0,
      10
    );
    expect(totalCount).toBe(2);
    expect(
      backupHistory.every(
        (entry) => entry.backupJob === null || entry.backupJob.name === "bob repo"
      )
    ).toBe(true);
  });

  it("applies offset and limit", async () => {
    await seedHistory();
    const page = await HistoryService.getHistory("alice", 1, 1);
    expect(page.totalCount).toBe(3);
    expect(page.backupHistory).toHaveLength(1);
    expect(page.backupHistory[0].message).toBe("failed");
  });

  it("returns an empty list when the offset is beyond the history", async () => {
    await seedHistory();
    const page = await HistoryService.getHistory("alice", 100, 10);
    expect(page.backupHistory).toEqual([]);
    expect(page.totalCount).toBe(3);
  });

  it("returns an empty result for a user that has no history", async () => {
    const result = await HistoryService.getHistory("nobody", 0, 10);
    expect(result.backupHistory).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});
