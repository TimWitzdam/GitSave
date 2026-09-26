import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface GitFixture {
  repositoryPath: string;
  url: string;
  cleanup: () => void;
}

/** Creates an empty bare repository that `git ls-remote` and `git clone` accept. */
export function createBareGitRepository(name = "example.git"): GitFixture {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gitsave-git-"));
  const repositoryPath = path.join(directory, name);
  execFileSync(
    "git",
    ["init", "--bare", "--initial-branch=main", repositoryPath],
    { stdio: "pipe" }
  );

  return {
    repositoryPath,
    url: `file://${repositoryPath}`,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}
