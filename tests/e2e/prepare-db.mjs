import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  e2eDbPath,
  e2eRepoPath,
  e2eTmpDir,
} from "./e2e.config.mjs";

fs.rmSync(e2eTmpDir, { recursive: true, force: true });
fs.mkdirSync(e2eTmpDir, { recursive: true });

const schema = fs
  .readFileSync("prisma/schema.prisma", "utf8")
  .replace(/url\s*=\s*"[^"]*"/, `url      = "file:${e2eDbPath}"`);
const schemaPath = path.join(e2eTmpDir, "schema.prisma");
fs.writeFileSync(schemaPath, schema);

execFileSync(
  path.resolve("node_modules/.bin/prisma"),
  ["db", "push", "--skip-generate", "--accept-data-loss", "--schema", schemaPath],
  { stdio: "inherit" }
);

fs.mkdirSync(path.dirname(e2eRepoPath), { recursive: true });
execFileSync("git", ["init", "--bare", "--initial-branch=main", e2eRepoPath], {
  stdio: "pipe",
});

console.log(`E2E database prepared at ${e2eDbPath}`);
console.log(`E2E git repository prepared at ${e2eRepoPath}`);
