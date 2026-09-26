// @vitest-environment node
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../prisma/client", async () => {
  const { createTestDatabase } = await import("../helpers/testDb");
  return { default: createTestDatabase().prisma };
});

import prisma from "../../prisma/client";
import { ScheduleService } from "../../backend/services/schedule.service";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

async function seedUser(username = "alice") {
  return prisma.user.create({ data: { username, password: "hash" } });
}

const validSchedule = {
  name: "My repo",
  repository: "https://github.com/example/repo.git",
  every: 2,
  timespan: "hours",
  private: "off",
  accessTokenId: "",
  keepLast: 3,
};

describe("ScheduleService.createCronExpression", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 0, 15, 14, 30, 45));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a minutes expression", () => {
    expect(ScheduleService.createCronExpression(5, "minutes")).toBe(
      "*/5 * * * *"
    );
    expect(ScheduleService.createCronExpression(1, "minutes")).toBe(
      "*/1 * * * *"
    );
  });

  it("creates an hours expression using the current minute", () => {
    expect(ScheduleService.createCronExpression(2, "hours")).toBe(
      "30 */2 * * *"
    );
    expect(ScheduleService.createCronExpression(12, "hours")).toBe(
      "30 */12 * * *"
    );
  });

  it("creates a days expression using the current time", () => {
    expect(ScheduleService.createCronExpression(3, "days")).toBe(
      "30 14 */3 * *"
    );
  });

  it("returns an empty string for an unknown timespan", () => {
    expect(ScheduleService.createCronExpression(5, "weeks")).toBe("");
    expect(ScheduleService.createCronExpression(5, "")).toBe("");
  });
});

describe("ScheduleService", () => {
  afterAll(cleanupTestDatabases);

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedUser();
  });

  it("adds a public schedule without an access token", async () => {
    const schedule = await ScheduleService.addSchedule(
      "alice",
      { ...validSchedule, private: "off" },
      validSchedule.repository
    );
    expect(schedule).toMatchObject({
      name: "My repo",
      repository: validSchedule.repository,
      username: "alice",
      accessTokenId: null,
      keepLast: 3,
      paused: false,
    });
    expect(schedule.cron).toMatch(/^\d+ \*\/2 \* \* \*$/);
  });

  it("adds a private schedule linked to an access token", async () => {
    const token = await prisma.accessToken.create({
      data: { name: "github", token: "encrypted", username: "alice" },
    });
    const schedule = await ScheduleService.addSchedule(
      "alice",
      {
        ...validSchedule,
        private: "on",
        accessTokenId: String(token.id),
      },
      "https://github.com/example/repo.git"
    );
    expect(schedule.accessTokenId).toBe(token.id);
    expect(schedule.repository).toBe(
      "https://github.com/example/repo.git"
    );
  });

  it("returns schedules of a user including only the newest history entry", async () => {
    const schedule = await ScheduleService.addSchedule(
      "alice",
      validSchedule,
      validSchedule.repository
    );
    await prisma.backupHistory.createMany({
      data: [
        {
          backupJobId: schedule.id,
          timestamp: new Date("2026-01-01T10:00:00Z"),
          success: true,
        },
        {
          backupJobId: schedule.id,
          timestamp: new Date("2026-01-02T10:00:00Z"),
          success: false,
          message: "latest",
        },
      ],
    });

    const schedules = await ScheduleService.getSchedulesByUser("alice");
    expect(schedules).toHaveLength(1);
    expect(schedules[0].backupHistory).toHaveLength(1);
    expect(schedules[0].backupHistory[0]).toMatchObject({
      success: false,
      message: "latest",
    });
  });

  it("does not return schedules of other users", async () => {
    await seedUser("bob");
    await ScheduleService.addSchedule("bob", validSchedule, "https://x.git");
    expect(await ScheduleService.getSchedulesByUser("alice")).toEqual([]);
  });

  it("finds a schedule by id", async () => {
    const created = await ScheduleService.addSchedule(
      "alice",
      validSchedule,
      validSchedule.repository
    );
    const found = await ScheduleService.getScheduleById(String(created.id));
    expect(found?.id).toBe(created.id);
  });

  it("returns null for an unknown schedule id", async () => {
    expect(await ScheduleService.getScheduleById("99999")).toBeNull();
  });

  it("edits a schedule and recalculates the cron expression", async () => {
    const created = await ScheduleService.addSchedule(
      "alice",
      validSchedule,
      validSchedule.repository
    );
    const updated = await ScheduleService.editSchedule(
      {
        name: "Renamed",
        repository: "https://github.com/example/other.git",
        every: 7,
        timespan: "minutes",
        keepLast: 10,
      },
      String(created.id)
    );
    expect(updated).toMatchObject({
      name: "Renamed",
      repository: "https://github.com/example/other.git",
      cron: "*/7 * * * *",
      keepLast: 10,
    });
  });

  it("pauses and resumes a schedule", async () => {
    const created = await ScheduleService.addSchedule(
      "alice",
      validSchedule,
      validSchedule.repository
    );
    expect((await ScheduleService.pauseSchedule(String(created.id))).paused).toBe(
      true
    );
    expect(
      (await ScheduleService.resumeSchedule(String(created.id))).paused
    ).toBe(false);
  });

  it("deletes a schedule", async () => {
    const created = await ScheduleService.addSchedule(
      "alice",
      validSchedule,
      validSchedule.repository
    );
    await ScheduleService.deleteSchedule(String(created.id));
    expect(
      await prisma.backupJob.findUnique({ where: { id: created.id } })
    ).toBeNull();
  });

  it("returns the decrypted access token", async () => {
    const { EncryptionService } = await import(
      "../../backend/services/encryption.service"
    );
    const token = await prisma.accessToken.create({
      data: {
        name: "github",
        token: EncryptionService.encrypt("plain-secret"),
        username: "alice",
      },
    });
    expect(await ScheduleService.getAccessToken(String(token.id))).toBe(
      "plain-secret"
    );
  });

  it("returns undefined for an unknown access token", async () => {
    expect(await ScheduleService.getAccessToken("424242")).toBeUndefined();
  });
});
