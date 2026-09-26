// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
import {
  createBackup,
  resumeCronJob,
  scheduleCronJobs,
  stopCronJob,
} from "../../backend/server";
import { EncryptionService } from "../../backend/services/encryption.service";
import { authCookie, createApiApp } from "../helpers/api";
import {
  createBareGitRepository,
  type GitFixture,
} from "../helpers/git";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

const app = createApiApp();
let gitFixture: GitFixture;

const validBody = {
  name: "My repo",
  every: 5,
  timespan: "minutes",
  private: null,
  accessTokenId: null,
  keepLast: 3,
};

async function seedAlice() {
  await prisma.user.create({ data: { username: "alice", password: "hash" } });
}

async function seedSchedule(
  overrides: Partial<{
    name: string;
    repository: string;
    accessTokenId: number | null;
    keepLast: number;
    paused: boolean;
    cron: string;
  }> = {}
) {
  return prisma.backupJob.create({
    data: {
      name: overrides.name ?? "Seed schedule",
      repository: overrides.repository ?? gitFixture.url,
      cron: overrides.cron ?? "*/5 * * * *",
      username: "alice",
      keepLast: overrides.keepLast ?? 5,
      paused: overrides.paused ?? false,
      accessTokenId: overrides.accessTokenId ?? null,
    },
  });
}

async function seedAccessToken(token = "plain-token") {
  return prisma.accessToken.create({
    data: {
      name: "github",
      token: EncryptionService.encrypt(token),
      username: "alice",
    },
  });
}

beforeAll(() => {
  gitFixture = createBareGitRepository();
});

afterAll(async () => {
  gitFixture.cleanup();
  await cleanupTestDatabases();
});

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDatabase(prisma);
  await seedAlice();
});

describe("POST /api/schedules", () => {
  it("creates a schedule for a reachable repository", async () => {
    const response = await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({ ...validBody, repository: gitFixture.url });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: "My repo",
      repository: gitFixture.url,
      cron: "*/5 * * * *",
      username: "alice",
      keepLast: 3,
      paused: false,
      accessTokenId: null,
    });

    const stored = await prisma.backupJob.findMany();
    expect(stored).toHaveLength(1);
    expect(stored[0].repository).toBe(gitFixture.url);
    expect(scheduleCronJobs).toHaveBeenCalled();
  });

  it("creates an hours schedule with a cron expression based on the current time", async () => {
    const response = await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({
        ...validBody,
        repository: gitFixture.url,
        every: 2,
        timespan: "hours",
      });
    expect(response.status).toBe(200);
    expect(response.body.cron).toMatch(/^\d+ \*\/2 \* \* \*$/);
  });

  it("rejects an invalid URL", async () => {
    const response = await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({ ...validBody, repository: "not a url" });
    expect(response.status).toBe(400);
    expect(response.text).toBe("Invalid repository URL");
    expect(await prisma.backupJob.count()).toBe(0);
  });

  it("rejects a repository that cannot be reached", async () => {
    const response = await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({
        ...validBody,
        repository: "file:///definitely/not/a/repository.git",
      });
    expect(response.status).toBe(400);
    expect(response.text).toBe(
      "Invalid repository. Either it does not exist or you forgot to select an access token."
    );
    expect(await prisma.backupJob.count()).toBe(0);
  });

  it("rejects an invalid request body", async () => {
    const response = await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({ name: "Missing everything else" });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid request body" });
  });

  it("rejects an invalid timespan", async () => {
    const response = await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({
        ...validBody,
        repository: gitFixture.url,
        timespan: "weeks",
      });
    expect(response.status).toBe(400);
  });

  it("requires authentication", async () => {
    const response = await request(app)
      .post("/api/schedules")
      .send({ ...validBody, repository: gitFixture.url });
    expect(response.status).toBe(401);
  });

  it("rejects a private schedule with an unknown access token", async () => {
    const response = await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({
        ...validBody,
        repository: gitFixture.url,
        private: "on",
        accessTokenId: "4242",
      });
    expect(response.status).toBe(400);
    expect(response.text).toBe("Access token not found");
    expect(await prisma.backupJob.count()).toBe(0);
  });

  it("stores a private schedule with the access token id and without the token in the URL", async () => {
    const token = await seedAccessToken("plain-token");
    const response = await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({
        ...validBody,
        repository: gitFixture.url,
        private: "on",
        accessTokenId: String(token.id),
      });

    expect(response.status).toBe(200);
    const stored = await prisma.backupJob.findFirstOrThrow();
    expect(stored.accessTokenId).toBe(token.id);
    expect(stored.repository).not.toContain("plain-token");
  });
});

describe("GET /api/schedules", () => {
  it("returns the user's schedules with the newest history entry", async () => {
    const schedule = await seedSchedule({ name: "Alice repo" });
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
    await prisma.user.create({ data: { username: "bob", password: "hash" } });
    await prisma.backupJob.create({
      data: {
        name: "Bob repo",
        repository: "https://example.com/bob.git",
        cron: "*/5 * * * *",
        username: "bob",
      },
    });

    const response = await request(app)
      .get("/api/schedules")
      .set("Cookie", authCookie("alice"));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ name: "Alice repo" });
    expect(response.body[0].backupHistory).toHaveLength(1);
    expect(response.body[0].backupHistory[0].message).toBe("latest");
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/schedules");
    expect(response.status).toBe(401);
  });
});

describe("PUT /api/schedules/:id", () => {
  it("updates the schedule and recalculates the cron expression", async () => {
    const schedule = await seedSchedule();
    const response = await request(app)
      .put(`/api/schedules/${schedule.id}`)
      .set("Cookie", authCookie("alice"))
      .send({
        name: "Renamed",
        repository: gitFixture.url,
        every: 10,
        timespan: "minutes",
        keepLast: 2,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: "Renamed",
      cron: "*/10 * * * *",
      keepLast: 2,
    });
    expect(scheduleCronJobs).toHaveBeenCalled();
  });

  it("rejects an invalid URL", async () => {
    const schedule = await seedSchedule();
    const response = await request(app)
      .put(`/api/schedules/${schedule.id}`)
      .set("Cookie", authCookie("alice"))
      .send({
        name: "Renamed",
        repository: "nope",
        every: 1,
        timespan: "minutes",
        keepLast: 2,
      });
    expect(response.status).toBe(400);
    expect(response.text).toBe("Invalid repository URL");
  });

  it("rejects an unreachable repository", async () => {
    const schedule = await seedSchedule();
    const response = await request(app)
      .put(`/api/schedules/${schedule.id}`)
      .set("Cookie", authCookie("alice"))
      .send({
        name: "Renamed",
        repository: "file:///definitely/not/a/repository.git",
        every: 1,
        timespan: "minutes",
        keepLast: 2,
      });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/schedules/:id/backup", () => {
  it("returns 404 for an unknown schedule", async () => {
    const response = await request(app)
      .post("/api/schedules/99999/backup")
      .set("Cookie", authCookie("alice"));
    expect(response.status).toBe(404);
    expect(response.text).toBe("Schedule not found");
  });

  it("starts a backup for a public schedule", async () => {
    const schedule = await seedSchedule({ keepLast: 4 });
    const response = await request(app)
      .post(`/api/schedules/${schedule.id}/backup`)
      .set("Cookie", authCookie("alice"));

    expect(response.status).toBe(200);
    expect(response.text).toBe(
      "Backup started. Depending on the size of the repository, this may take a while."
    );
    expect(createBackup).toHaveBeenCalledWith(
      schedule.id,
      schedule.name,
      gitFixture.url,
      4
    );
  });

  it("decrypts the access token for a private schedule", async () => {
    const token = await seedAccessToken("plain-token");
    const schedule = await seedSchedule({
      repository: "https://github.com/example/private.git",
      accessTokenId: token.id,
    });

    const response = await request(app)
      .post(`/api/schedules/${schedule.id}/backup`)
      .set("Cookie", authCookie("alice"));

    expect(response.status).toBe(200);
    expect(createBackup).toHaveBeenCalledWith(
      schedule.id,
      schedule.name,
      "https://plain-token@github.com/example/private.git",
      schedule.keepLast
    );
  });

  it("requires authentication", async () => {
    const schedule = await seedSchedule();
    const response = await request(app).post(
      `/api/schedules/${schedule.id}/backup`
    );
    expect(response.status).toBe(401);
  });
});

describe("PUT /api/schedules/:id/pause and /resume", () => {
  it("pauses a schedule and stops its cron job", async () => {
    const schedule = await seedSchedule();
    const response = await request(app)
      .put(`/api/schedules/${schedule.id}/pause`)
      .set("Cookie", authCookie("alice"));

    expect(response.status).toBe(200);
    expect(response.body.paused).toBe(true);
    expect(stopCronJob).toHaveBeenCalledWith(schedule.id);
    const stored = await prisma.backupJob.findUniqueOrThrow({
      where: { id: schedule.id },
    });
    expect(stored.paused).toBe(true);
  });

  it("resumes a schedule and restarts its cron job", async () => {
    const schedule = await seedSchedule({ paused: true });
    const response = await request(app)
      .put(`/api/schedules/${schedule.id}/resume`)
      .set("Cookie", authCookie("alice"));

    expect(response.status).toBe(200);
    expect(response.body.paused).toBe(false);
    expect(resumeCronJob).toHaveBeenCalledWith(schedule.id);
  });
});

describe("DELETE /api/schedules/:id", () => {
  it("deletes the schedule and stops its cron job", async () => {
    const schedule = await seedSchedule();
    const response = await request(app)
      .delete(`/api/schedules/${schedule.id}`)
      .set("Cookie", authCookie("alice"));

    expect(response.status).toBe(200);
    expect(response.text).toBe("Schedule deleted");
    expect(stopCronJob).toHaveBeenCalledWith(schedule.id, true);
    expect(
      await prisma.backupJob.findUnique({ where: { id: schedule.id } })
    ).toBeNull();
  });

  it("requires authentication", async () => {
    const schedule = await seedSchedule();
    const response = await request(app).delete(
      `/api/schedules/${schedule.id}`
    );
    expect(response.status).toBe(401);
  });
});
