import fs from "node:fs";
import path from "node:path";

/** Removes the backup folders the E2E suite created in ./backups. */
export default async function globalTeardown() {
  const backupsDir = path.resolve("backups");
  if (!fs.existsSync(backupsDir)) return;

  for (const entry of fs.readdirSync(backupsDir)) {
    if (entry.includes("_E2E")) {
      fs.rmSync(path.join(backupsDir, entry), { recursive: true, force: true });
    }
  }
}
