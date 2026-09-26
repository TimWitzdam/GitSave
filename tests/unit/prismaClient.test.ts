// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const PrismaClientMock = vi.hoisted(() => vi.fn());

vi.mock("@prisma/client", () => ({
  PrismaClient: PrismaClientMock,
}));

const originalDatabaseUrl = process.env.DATABASE_URL;

async function loadClient(databaseUrl?: string) {
  if (databaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = databaseUrl;
  }
  vi.resetModules();
  PrismaClientMock.mockClear();
  const module = await import("../../prisma/client.js");
  return { client: module.default, PrismaClientMock };
}

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
  vi.resetModules();
});

describe("prisma client", () => {
  it("uses the schema datasource when DATABASE_URL is not set", async () => {
    const { client, PrismaClientMock } = await loadClient(undefined);
    expect(PrismaClientMock).toHaveBeenCalledWith(undefined);
    expect(client).toBe(PrismaClientMock.mock.instances[0]);
  });

  it("overrides the datasource when DATABASE_URL is set", async () => {
    const { PrismaClientMock } = await loadClient("file:/tmp/other.db");
    expect(PrismaClientMock).toHaveBeenCalledWith({
      datasources: { db: { url: "file:/tmp/other.db" } },
    });
  });
});
