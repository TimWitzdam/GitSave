import os from "node:os";
import path from "node:path";

export const e2eTmpDir = path.join(os.tmpdir(), "gitsave-e2e");
export const e2eDbPath = path.join(e2eTmpDir, "e2e.db");
export const e2eReposDir = path.join(e2eTmpDir, "repos");
export const e2eRepoPath = path.join(e2eReposDir, "example.git");
export const e2eRepoUrl = `file://${e2eRepoPath}`;
export const e2ePort = 3100;
export const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export const e2eEnv = {
  JWT_SECRET: "e2e-jwt-secret",
  ENCRYPTION_SECRET: "e2e-encryption-secret-32-bytes!!",
  DISABLE_AUTH: "false",
  GIT_TIMEOUT: "15000",
  PORT: String(e2ePort),
  DATABASE_URL: `file:${e2eDbPath}`,
};
