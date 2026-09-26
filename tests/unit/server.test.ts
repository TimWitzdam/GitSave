// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../prisma/client", async () => {
  const { createTestDatabase } = await import("../helpers/testDb");
  return { default: createTestDatabase().prisma };
});

vi.mock("express", async (importOriginal) => {
  const actual = await importOriginal<typeof import("express")>();
  const app = { use: vi.fn(), listen: vi.fn() };
  const expressMock = Object.assign(vi.fn(() => app), actual.default);
  return { default: expressMock };
});

const cronState = vi.hoisted(() => ({
  scheduled: [] as {
    expression: string;
    callback: () => void;
    task: { stop: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> };
  }[],
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn((expression: string, callback: () => void) => {
      const task = { stop: vi.fn(), start: vi.fn() };
      cronState.scheduled.push({ expression, callback, task });
      return task;
    }),
  },
}));

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return { ...actual, execFile: execFileMock };
});

import prisma from "../../prisma/client";
import {
  createBackup,
  resumeCronJob,
  scheduleCronJobs,
  stopCronJob,
} from "../../backend/server";
import { EncryptionService } from "../../backend/services/encryption.service";
import { cleanupTestDatabases } from "../helpers/testDb";

const originalCwd = process.cwd();
let tempRoot: string;

type ExecCallback = (
  error: (Error & { killed?: boolean }) | null,
  stdout: string,
  stderr: string
) => void;

function fakeExecFileSuccess() {
  execFileMock.mockImplementation(
    (_file: string, args: string[], _options: unknown, callback: ExecCallback) => {
      if (_file === "git") {
        fs.mkdirSync(args[3], { recursive: true });
      }
      callback(null, "", "");
      return { kill: vi.fn(), on: vi.fn() };
    }
  );
}

function fakeExecFileFailure(killed = false) {
  execFileMock.mockImplementation(
    (_file: string, _args: string[], _options: unknown, callback: ExecCallback) => {
      const error = new Error("git failed") as Error & { killed?: boolean };
      if (killed) error.killed = true;
      callback(error, "", "");
      return { kill: vi.fn(), on: vi.fn() };
    }
  );
}

function backupFolder(id: number, name: string, smb = false) {
  return smb
    ? path.join(tempRoot, "tmp", "backups", `${id}-${name}`)
    : path.join(tempRoot, "backups", `${id}_${name}`);
}

async function waitForHistoryCount(count: number) {
  await vi.waitFor(async () => {
    expect(await prisma.backupHistory.count()).toBe(count);
  });
}

async function setDefaultLocation(value: string) {
  await prisma.appConfig.update({
    where: { key: "default_location" },
    data: { value },
  });
}

async function setSmbConfig(values: {
  address: string;
  location: string;
  username: string;
  password: string;
}) {
  for (const [key, value] of Object.entries(values)) {
    await prisma.appConfig.update({
      where: { key: `smb_${key}` },
      data: { value },
    });
  }
}

async function seedUser(username = "alice") {
  return prisma.user.create({ data: { username, password: "hash" } });
}

async function seedJob(name = "Repo", repository = "https://example.com/repo.git") {
  return prisma.backupJob.create({
    data: {
      name,
      repository,
      cron: "*/5 * * * *",
      username: "alice",
      keepLast: 5,
    },
  });
}

beforeAll(async () => {
  await vi.waitFor(async () => {
    expect(await prisma.appConfig.count()).toBe(5);
  });

  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gitsave-server-test-"));
  fs.mkdirSync(path.join(tempRoot, "data", "logs"), { recursive: true });
  process.chdir(tempRoot);
});

afterAll(async () => {
  process.chdir(originalCwd);
  fs.rmSync(tempRoot, { recursive: true, force: true });
  await cleanupTestDatabases();
});

beforeEach(async () => {
  execFileMock.mockReset();
  cronState.scheduled.length = 0;
  await prisma.backupHistory.deleteMany();
  await prisma.backupJob.deleteMany();
  await prisma.accessToken.deleteMany();
  await prisma.user.deleteMany();
  await setDefaultLocation("local_folder");
  await setSmbConfig({
    address: "",
    location: "",
    username: "",
    password: "",
  });
  fs.rmSync(path.join(tempRoot, "backups"), { recursive: true, force: true });
  fs.rmSync(path.join(tempRoot, "tmp"), { recursive: true, force: true });
  await seedUser();
});

describe("prepareDatabase (run on server import)", () => {
  it("creates all default app config entries", async () => {
    const keys = (await prisma.appConfig.findMany()).map((entry) => entry.key);
    expect(keys.sort()).toEqual(
      [
        "default_location",
        "smb_address",
        "smb_location",
        "smb_password",
        "smb_username",
      ].sort()
    );
  });

  it("defaults to the local folder", async () => {
    const entry = await prisma.appConfig.findUniqueOrThrow({
      where: { key: "default_location" },
    });
    expect(["local_folder", "smb_share"]).toContain(entry.value);
  });
});

describe("createBackup", () => {
  it("clones the repository into a sanitized local folder", async () => {
    fakeExecFileSuccess();
    const job = await seedJob("My Repo");

    createBackup(job.id, job.name, job.repository, 5);

    await waitForHistoryCount(1);
    const entry = await prisma.backupHistory.findFirstOrThrow();
    expect(entry).toMatchObject({
      backupJobId: job.id,
      success: true,
      message: null,
    });

    const folder = backupFolder(job.id, "My-Repo");
    const relativeFolder = `\\./backups/${job.id}_My-Repo`;
    const entries = fs.readdirSync(folder);
    expect(entries).toHaveLength(1);
    expect(Number(entries[0])).not.toBeNaN();

    expect(execFileMock).toHaveBeenCalledWith(
      "git",
      [
        "clone",
        "--mirror",
        job.repository,
        expect.stringMatching(new RegExp(`^${relativeFolder}/\\d+$`)),
      ],
      expect.objectContaining({
        env: expect.objectContaining({ GIT_ASKPASS: "/bin/false" }),
      }),
      expect.any(Function)
    );
  });

  it("does not create a history entry when git fails", async () => {
    fakeExecFileFailure();
    const job = await seedJob("Fail Repo");

    createBackup(job.id, job.name, job.repository, 5);
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(
      await prisma.backupHistory.count({ where: { success: true } })
    ).toBe(0);
    expect(fs.existsSync(backupFolder(job.id, "Fail-Repo"))).toBe(false);
  });

  it("records a timeout when the git process is killed", async () => {
    let exitHandler: ((code: number | null) => void) | undefined;
    execFileMock.mockImplementation(() => ({
      kill: vi.fn(() => exitHandler?.(null)),
      on: vi.fn((event: string, handler: (code: number | null) => void) => {
        if (event === "exit") exitHandler = handler;
      }),
    }));
    const job = await seedJob("Slow Repo");

    createBackup(job.id, job.name, job.repository, 5);

    await waitForHistoryCount(1);
    const entry = await prisma.backupHistory.findFirstOrThrow();
    expect(entry.success).toBe(false);
    expect(entry.message).toBe(
      "Request took too long (has the access token expired?)"
    );
  });

  it("keeps only the configured number of backups", async () => {
    const job = await seedJob("Pru ning");
    const folder = backupFolder(job.id, "Pru-ning");
    for (const timestamp of ["1000", "2000", "3000"]) {
      fs.mkdirSync(path.join(folder, timestamp), { recursive: true });
    }
    fakeExecFileSuccess();

    createBackup(job.id, job.name, job.repository, 2);
    await waitForHistoryCount(1);

    expect(fs.existsSync(path.join(folder, "1000"))).toBe(false);
    expect(fs.existsSync(path.join(folder, "2000"))).toBe(false);
    expect(fs.existsSync(path.join(folder, "3000"))).toBe(true);
    expect(fs.readdirSync(folder)).toHaveLength(2);
  });

  it("keeps all backups while below the limit", async () => {
    const job = await seedJob("Keep All");
    const folder = backupFolder(job.id, "Keep-All");
    fs.mkdirSync(path.join(folder, "1000"), { recursive: true });
    fakeExecFileSuccess();

    createBackup(job.id, job.name, job.repository, 5);
    await waitForHistoryCount(1);

    expect(fs.existsSync(path.join(folder, "1000"))).toBe(true);
    expect(fs.readdirSync(folder)).toHaveLength(2);
  });

  describe("with an SMB share configured", () => {
    beforeEach(async () => {
      await setDefaultLocation("smb_share");
      await setSmbConfig({
        address: "192.168.1.10/backups",
        location: "gitsave",
        username: "backup-user",
        password: "super-secret",
      });
    });

    it("clones to a temporary folder and uploads it via smbclient", async () => {
      fakeExecFileSuccess();
      const job = await seedJob("Smb Repo");

      createBackup(job.id, job.name, job.repository, 5);
      await waitForHistoryCount(1);

      const entry = await prisma.backupHistory.findFirstOrThrow();
      expect(entry.success).toBe(true);

      const smbCall = execFileMock.mock.calls.find(
        ([file]) => file === "smbclient"
      );
      expect(smbCall).toBeDefined();
      const args = smbCall![1] as string[];
      expect(args).toContain("//192.168.1.10/backups");
      expect(args).toContain("-U");
      expect(args).toContain("backup-user");
      expect(args).toContain("--password");
      expect(typeof args[args.indexOf("--password") + 1]).toBe("string");
      const command = args[args.length - 1];
      expect(command).toContain(`mkdir gitsave/${job.id}-Smb-Repo/`);
      expect(command).toContain("mput *");

      expect(
        fs.readdirSync(backupFolder(job.id, "Smb-Repo", true))
      ).toEqual([]);
      expect(fs.existsSync(path.join(tempRoot, "backups"))).toBe(false);
    });

    it("does not record a history entry when the SMB upload fails", async () => {
      execFileMock.mockImplementation(
        (
          file: string,
          args: string[],
          _options: unknown,
          callback: ExecCallback
        ) => {
          if (file === "git") {
            fs.mkdirSync(args[3], { recursive: true });
            callback(null, "", "");
          } else {
            callback(new Error("smb unreachable"), "", "");
          }
          return { kill: vi.fn(), on: vi.fn() };
        }
      );

      const job = await seedJob("Smb Fail");

      createBackup(job.id, job.name, job.repository, 5);
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(await prisma.backupHistory.count()).toBe(0);
      expect(fs.existsSync(backupFolder(job.id, "Smb-Fail", true))).toBe(true);
    });
  });
});

describe("scheduleCronJobs", () => {
  it("schedules every backup job with its cron expression", async () => {
    const job = await prisma.backupJob.create({
      data: {
        name: "Hourly",
        repository: "https://example.com/repo.git",
        cron: "30 */1 * * *",
        username: "alice",
        keepLast: 5,
      },
    });

    scheduleCronJobs();
    await vi.waitFor(() => expect(cronState.scheduled).toHaveLength(1));

    expect(cronState.scheduled[0].expression).toBe("30 */1 * * *");
    expect(cronState.scheduled[0].task.stop).not.toHaveBeenCalled();
    expect(job.paused).toBe(false);
  });

  it("stops the cron task of paused jobs", async () => {
    await prisma.backupJob.create({
      data: {
        name: "Paused",
        repository: "https://example.com/repo.git",
        cron: "*/5 * * * *",
        username: "alice",
        paused: true,
      },
    });

    scheduleCronJobs();
    await vi.waitFor(() => expect(cronState.scheduled).toHaveLength(1));

    expect(cronState.scheduled[0].task.stop).toHaveBeenCalled();
  });

  it("decrypts the access token for private jobs", async () => {
    const token = await prisma.accessToken.create({
      data: {
        name: "github",
        token: EncryptionService.encrypt("plain-token"),
        username: "alice",
      },
    });
    await prisma.backupJob.create({
      data: {
        name: "Private",
        repository: "https://github.com/example/private.git",
        cron: "*/5 * * * *",
        username: "alice",
        accessTokenId: token.id,
      },
    });
    fakeExecFileSuccess();

    scheduleCronJobs();
    await vi.waitFor(() => expect(cronState.scheduled).toHaveLength(1));

    cronState.scheduled[0].callback();
    await waitForHistoryCount(1);

    expect(execFileMock).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining([
        expect.stringMatching(
          /^https:\/\/plain-token@github\.com\/example\/private\.git$/
        ),
      ]),
      expect.any(Object),
      expect.any(Function)
    );
    expect(JSON.stringify(execFileMock.mock.calls)).not.toContain(token.token);
  });

  it("stops previous cron tasks when rescheduling", async () => {
    await prisma.backupJob.create({
      data: {
        name: "Repo",
        repository: "https://example.com/repo.git",
        cron: "*/5 * * * *",
        username: "alice",
      },
    });

    scheduleCronJobs();
    await vi.waitFor(() => expect(cronState.scheduled).toHaveLength(1));
    const firstTask = cronState.scheduled[0].task;

    scheduleCronJobs();

    await vi.waitFor(() => expect(firstTask.stop).toHaveBeenCalled());
    await vi.waitFor(() => expect(cronState.scheduled).toHaveLength(2));
  });
});

describe("stopCronJob and resumeCronJob", () => {
  async function scheduleOneJob() {
    const job = await prisma.backupJob.create({
      data: {
        name: "Repo",
        repository: "https://example.com/repo.git",
        cron: "*/5 * * * *",
        username: "alice",
      },
    });
    scheduleCronJobs();
    await vi.waitFor(() => expect(cronState.scheduled).toHaveLength(1));
    return { job, task: cronState.scheduled[0].task };
  }

  it("stops a scheduled job", async () => {
    const { job, task } = await scheduleOneJob();
    stopCronJob(job.id);
    expect(task.stop).toHaveBeenCalled();
  });

  it("resumes a stopped job", async () => {
    const { job, task } = await scheduleOneJob();
    stopCronJob(job.id);
    resumeCronJob(job.id);
    expect(task.start).toHaveBeenCalled();
  });

  it("forgets a deleted job so it cannot be resumed", async () => {
    const { job, task } = await scheduleOneJob();
    stopCronJob(job.id, true);
    task.start.mockClear();
    resumeCronJob(job.id);
    expect(task.start).not.toHaveBeenCalled();
  });

  it("ignores unknown job ids", async () => {
    await scheduleOneJob();
    expect(() => stopCronJob(999)).not.toThrow();
    expect(() => resumeCronJob(999)).not.toThrow();
  });
});
