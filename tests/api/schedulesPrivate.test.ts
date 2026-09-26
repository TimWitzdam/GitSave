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

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    execFile: vi.fn(
      (
        _file: string,
        _args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(null, "", "");
        return { kill: vi.fn(), on: vi.fn() };
      }
    ),
  };
});

import { execFile } from "child_process";
import request from "supertest";
import prisma from "../../prisma/client";
import { EncryptionService } from "../../backend/services/encryption.service";
import { authCookie, createApiApp } from "../helpers/api";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

const app = createApiApp();

const body = {
  name: "Private repo",
  repository: "https://github.com/example/private.git",
  every: 5,
  timespan: "minutes",
  private: "on",
  keepLast: 3,
};

async function seed() {
  const user = await prisma.user.create({
    data: { username: "alice", password: "hash" },
  });
  const token = await prisma.accessToken.create({
    data: {
      name: "github",
      token: EncryptionService.encrypt("plain-token"),
      username: user.username,
    },
  });
  return token;
}

describe("createSchedule with a private repository", () => {
  afterAll(cleanupTestDatabases);

  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDatabase(prisma);
  });

  it("checks the repository using the decrypted token but stores the clean URL", async () => {
    const token = await seed();

    const response = await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({ ...body, accessTokenId: String(token.id) });

    expect(response.status).toBe(200);

    expect(vi.mocked(execFile)).toHaveBeenCalledWith(
      "git",
      ["ls-remote", "https://plain-token@github.com/example/private.git"],
      expect.objectContaining({ env: expect.any(Object) }),
      expect.any(Function)
    );

    const stored = await prisma.backupJob.findFirstOrThrow();
    expect(stored.repository).toBe(body.repository);
    expect(stored.repository).not.toContain("plain-token");
    expect(stored.accessTokenId).toBe(token.id);
  });

  it("prevents git from asking for credentials interactively", async () => {
    const token = await seed();

    await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({ ...body, accessTokenId: String(token.id) });

    const options = vi.mocked(execFile).mock.calls[0][2] as {
      env: Record<string, string>;
    };
    expect(options.env.GIT_ASKPASS).toBe("/bin/false");
  });

  it("does not create a schedule when the git check fails", async () => {
    const token = await seed();
    vi.mocked(execFile).mockImplementationOnce(
      ((_file, _args, _options, callback) => {
        (callback as (...args: unknown[]) => void)(
          new Error("repository not found"),
          "",
          ""
        );
        return { kill: vi.fn(), on: vi.fn() };
      }) as never
    );

    const response = await request(app)
      .post("/api/schedules")
      .set("Cookie", authCookie("alice"))
      .send({ ...body, accessTokenId: String(token.id) });

    expect(response.status).toBe(400);
    expect(await prisma.backupJob.count()).toBe(0);
  });
});
