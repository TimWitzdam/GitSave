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

const sambaListFiles = vi.hoisted(() => vi.fn());

vi.mock("samba-client", () => ({
  default: class {
    listFiles = sambaListFiles;
  },
}));

import request from "supertest";
import prisma from "../../prisma/client";
import { authCookie, createApiApp } from "../helpers/api";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

const app = createApiApp();

async function seedAlice() {
  return prisma.user.create({
    data: { username: "alice", password: "hash" },
  });
}

const smbBody = {
  location: "smb_share",
  serverAddress: "192.168.1.10/backups",
  remoteLocation: "gitsave",
  username: "backup-user",
  password: "super-secret",
};

describe("GET /api/config/authDisabled", () => {
  it("reports the DISABLE_AUTH setting without authentication", async () => {
    const response = await request(app).get("/api/config/authDisabled");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ DISABLE_AUTH: false });
  });
});

describe("GET /api/config/storage", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedAlice();
  });

  it("returns the stored storage configuration without the SMB password", async () => {
    await prisma.appConfig.createMany({
      data: [
        { key: "default_location", value: "smb_share", dataType: "string" },
        { key: "smb_address", value: "192.168.1.10/backups", dataType: "string" },
        { key: "smb_location", value: "gitsave", dataType: "string" },
        { key: "smb_username", value: "backup-user", dataType: "string" },
        { key: "smb_password", value: "super-secret", dataType: "string" },
      ],
    });

    const response = await request(app)
      .get("/api/config/storage")
      .set("Cookie", authCookie("alice"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      defaultLocation: "smb_share",
      smbAddress: "192.168.1.10/backups",
      smbLocation: "gitsave",
      smbUsername: "backup-user",
      smbPassword: "",
    });
    expect(JSON.stringify(response.body)).not.toContain("super-secret");
  });

  it("returns empty defaults when nothing is configured", async () => {
    const response = await request(app)
      .get("/api/config/storage")
      .set("Cookie", authCookie("alice"));
    expect(response.body).toEqual({
      defaultLocation: "",
      smbAddress: "",
      smbLocation: "",
      smbUsername: "",
      smbPassword: "",
    });
  });

  it("returns 401 without authentication", async () => {
    const response = await request(app).get("/api/config/storage");
    expect(response.status).toBe(401);
  });
});

describe("PUT /api/config/storage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDatabase(prisma);
    await seedAlice();
    await prisma.appConfig.createMany({
      data: [
        { key: "default_location", value: "local_folder", dataType: "string" },
        { key: "smb_address", value: "", dataType: "string" },
        { key: "smb_location", value: "", dataType: "string" },
        { key: "smb_username", value: "", dataType: "string" },
        { key: "smb_password", value: "", dataType: "string" },
      ],
    });
  });

  it("switches to the local folder", async () => {
    const response = await request(app)
      .put("/api/config/storage")
      .set("Cookie", authCookie("alice"))
      .send({
        location: "local_folder",
        serverAddress: null,
        remoteLocation: null,
        username: null,
        password: null,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Setting saved" });
    const entry = await prisma.appConfig.findUniqueOrThrow({
      where: { key: "default_location" },
    });
    expect(entry.value).toBe("local_folder");
  });

  it("stores the SMB share after a successful connection test", async () => {
    sambaListFiles.mockResolvedValueOnce([]);

    const response = await request(app)
      .put("/api/config/storage")
      .set("Cookie", authCookie("alice"))
      .send(smbBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Setting saved" });
    expect(sambaListFiles).toHaveBeenCalledWith("", "");

    const config = Object.fromEntries(
      (
        await prisma.appConfig.findMany()
      ).map((entry) => [entry.key, entry.value])
    );
    expect(config).toMatchObject({
      default_location: "smb_share",
      smb_address: "192.168.1.10/backups",
      smb_location: "gitsave",
      smb_username: "backup-user",
      smb_password: "super-secret",
    });
  });

  it("rejects an SMB configuration with missing fields", async () => {
    const response = await request(app)
      .put("/api/config/storage")
      .set("Cookie", authCookie("alice"))
      .send({ ...smbBody, password: "" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Missing required fields" });
    expect(sambaListFiles).not.toHaveBeenCalled();
  });

  it("returns 500 when the SMB share cannot be reached", async () => {
    sambaListFiles.mockRejectedValueOnce(new Error("unreachable"));

    const response = await request(app)
      .put("/api/config/storage")
      .set("Cookie", authCookie("alice"))
      .send(smbBody);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe(
      "Error connecting to storage. Please check the wiki on GitHub for more information."
    );
    expect(response.body.details).toBe(
      "https://witzdam.com/docs/gitsave/how-to-set-up-smb-share"
    );

    const entry = await prisma.appConfig.findUniqueOrThrow({
      where: { key: "default_location" },
    });
    expect(entry.value).toBe("local_folder");
  });

  it("rejects an invalid location", async () => {
    const response = await request(app)
      .put("/api/config/storage")
      .set("Cookie", authCookie("alice"))
      .send({ ...smbBody, location: "dropbox" });
    expect(response.status).toBe(400);
  });

  it("requires authentication", async () => {
    const response = await request(app)
      .put("/api/config/storage")
      .send(smbBody);
    expect(response.status).toBe(401);
  });
});

afterAll(cleanupTestDatabases);
