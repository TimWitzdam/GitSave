// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../prisma/client", async () => {
  const { createTestDatabase } = await import("../helpers/testDb");
  return { default: createTestDatabase().prisma };
});

import prisma from "../../prisma/client";
import { ConfigService } from "../../backend/services/config.service";
import { cleanupTestDatabases, resetDatabase } from "../helpers/testDb";

async function seedConfig(entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    await prisma.appConfig.create({ data: { key, value, dataType: "string" } });
  }
}

describe("ConfigService", () => {
  afterAll(cleanupTestDatabases);

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it("returns empty defaults when nothing is configured", async () => {
    expect(await ConfigService.getStorageConfig()).toEqual({
      defaultLocation: "",
      smbAddress: "",
      smbLocation: "",
      smbUsername: "",
      smbPassword: "",
    });
  });

  it("maps stored entries to the storage config object", async () => {
    await seedConfig({
      default_location: "smb_share",
      smb_address: "192.168.1.10/backups",
      smb_location: "gitsave",
      smb_username: "backup-user",
      smb_password: "super-secret",
    });

    expect(await ConfigService.getStorageConfig()).toEqual({
      defaultLocation: "smb_share",
      smbAddress: "192.168.1.10/backups",
      smbLocation: "gitsave",
      smbUsername: "backup-user",
      smbPassword: "",
    });
  });

  it("includes the SMB password when explicitly requested", async () => {
    await seedConfig({
      default_location: "smb_share",
      smb_password: "super-secret",
    });
    const config = await ConfigService.getStorageConfig(true);
    expect(config.smbPassword).toBe("super-secret");
  });

  it("updates an existing config entry", async () => {
    await seedConfig({ default_location: "local_folder" });
    await ConfigService.updateConfigEntry("default_location", "smb_share");
    expect(
      await ConfigService.getConfigEntry("default_location")
    ).toMatchObject({ key: "default_location", value: "smb_share" });
  });

  it("returns null for a missing config entry", async () => {
    expect(await ConfigService.getConfigEntry("does_not_exist")).toBeNull();
  });
});
