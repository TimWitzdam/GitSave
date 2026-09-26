import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

export interface TestDatabase {
  prisma: PrismaClient;
  directory: string;
  databasePath: string;
}

const openDatabases: TestDatabase[] = [];

/**
 * Creates an isolated SQLite database (in a temp directory) with the same
 * schema as prisma/schema.prisma and returns a PrismaClient connected to it.
 * The real development database in ./data is never touched.
 */
export function createTestDatabase(): TestDatabase {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gitsave-test-"));
  const databasePath = path.join(directory, "test.db");

  const schema = fs
    .readFileSync(path.join(projectRoot, "prisma", "schema.prisma"), "utf8")
    .replace(/url\s*=\s*"[^"]*"/, `url      = "file:${databasePath}"`);

  const schemaPath = path.join(directory, "schema.prisma");
  fs.writeFileSync(schemaPath, schema);

  execFileSync(
    path.join(projectRoot, "node_modules", ".bin", "prisma"),
    ["db", "push", "--skip-generate", "--accept-data-loss", "--schema", schemaPath],
    { cwd: projectRoot, stdio: "pipe" }
  );

  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${databasePath}` } },
  });

  const database: TestDatabase = { prisma, directory, databasePath };
  openDatabases.push(database);
  return database;
}

export async function cleanupTestDatabases() {
  while (openDatabases.length > 0) {
    const database = openDatabases.pop()!;
    try {
      await database.prisma.$disconnect();
    } finally {
      fs.rmSync(database.directory, { recursive: true, force: true });
    }
  }
}

/** Deletes all rows so every test starts from a clean database. */
export async function resetDatabase(prisma: PrismaClient) {
  await prisma.backupHistory.deleteMany();
  await prisma.backupJob.deleteMany();
  await prisma.accessToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appConfig.deleteMany();
}
