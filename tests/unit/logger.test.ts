// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Logger from "../../backend/lib/logger";

const logsDirectory = path.resolve(process.cwd(), "data", "logs");

function readLog(level: string) {
  const file = path.join(logsDirectory, `${level}.log`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

async function waitForLogToContain(level: string, text: string) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (readLog(level).includes(text)) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
}

describe("Logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the log directory on import", () => {
    expect(fs.existsSync(logsDirectory)).toBe(true);
  });

  it("logs info messages to the console with level and file name", () => {
    new Logger("my-file").info("hello world");
    expect(console.log).toHaveBeenCalledOnce();
    const message = vi.mocked(console.log).mock.calls[0][0] as string;
    expect(message).toMatch(
      /^\[.+\] \[INFO\] \[my-file\]: hello world$/
    );
  });

  it("logs error messages with the ERROR level", () => {
    new Logger("my-file").error("something broke");
    expect(console.error).toHaveBeenCalledOnce();
    const message = vi.mocked(console.error).mock.calls[0][0] as string;
    expect(message).toMatch(/\[ERROR\] \[my-file\]: something broke$/);
  });

  it("logs warn messages with the WARN level", () => {
    new Logger("my-file").warn("be careful");
    expect(console.warn).toHaveBeenCalledOnce();
    const message = vi.mocked(console.warn).mock.calls[0][0] as string;
    expect(message).toMatch(/\[WARN\] \[my-file\]: be careful$/);
  });

  it("writes info messages to data/logs/info.log", async () => {
    const uniqueMessage = `persisted-info-${Date.now()}-${Math.random()}`;
    new Logger("logger-test").info(uniqueMessage);
    expect(await waitForLogToContain("info", uniqueMessage)).toBe(true);
    expect(readLog("info")).toContain("[logger-test]");
  });

  it("writes error messages to data/logs/error.log", async () => {
    const uniqueMessage = `persisted-error-${Date.now()}-${Math.random()}`;
    new Logger("logger-test").error(uniqueMessage);
    expect(await waitForLogToContain("error", uniqueMessage)).toBe(true);
  });
});
