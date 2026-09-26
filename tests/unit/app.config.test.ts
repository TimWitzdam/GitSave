// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const exitMock = vi.hoisted(() => vi.fn());

vi.mock("process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("process")>();
  return { ...actual, exit: exitMock };
});

const originalEnv = process.env;
const validEnv = {
  JWT_SECRET: "test-jwt-secret",
  ENCRYPTION_SECRET: "01234567890123456789012345678901",
};

async function loadConfig(env: Record<string, string | undefined>) {
  process.env = { ...originalEnv };
  delete process.env.JWT_SECRET;
  delete process.env.ENCRYPTION_SECRET;
  delete process.env.DISABLE_AUTH;
  delete process.env.GIT_TIMEOUT;
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) process.env[key] = value;
  }

  vi.resetModules();
  exitMock.mockReset();
  exitMock.mockImplementation(() => {
    throw new Error("process.exit called");
  });
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  let module: typeof import("../../backend/configs/app.config") | undefined;
  let importError: Error | undefined;
  try {
    module = await import("../../backend/configs/app.config");
  } catch (error) {
    importError = error as Error;
  }

  return { module, importError, exit: exitMock, consoleError };
}

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("app.config", () => {
  it("exports the configuration for a valid environment", async () => {
    const { module, importError, exit } = await loadConfig({
      ...validEnv,
      DISABLE_AUTH: "true",
      GIT_TIMEOUT: "5000",
    });

    expect(importError).toBeUndefined();
    expect(exit).not.toHaveBeenCalled();
    expect(module!.PORT).toBe(3000);
    expect(module!.JWT_SECRET).toBe(validEnv.JWT_SECRET);
    expect(module!.ENCRYPTION_SECRET).toBe(validEnv.ENCRYPTION_SECRET);
    expect(module!.DISABLE_AUTH).toBe(true);
    expect(module!.GIT_TIMEOUT).toBe("5000");
  });

  it("defaults DISABLE_AUTH to false", async () => {
    const { module } = await loadConfig(validEnv);
    expect(module!.DISABLE_AUTH).toBe(false);
  });

  it("uses port 3000 by default and respects the PORT variable", async () => {
    const defaultPort = await loadConfig(validEnv);
    expect(defaultPort.module!.PORT).toBe(3000);

    const customPort = await loadConfig({ ...validEnv, PORT: "4123" });
    expect(customPort.module!.PORT).toBe(4123);
  });

  it("only enables DISABLE_AUTH for the exact string 'true'", async () => {
    const { module } = await loadConfig({ ...validEnv, DISABLE_AUTH: "yes" });
    expect(module!.DISABLE_AUTH).toBe(false);
  });

  it("exits when JWT_SECRET is missing", async () => {
    const { exit, consoleError, importError } = await loadConfig({
      ...validEnv,
      JWT_SECRET: undefined,
    });
    expect(consoleError).toHaveBeenCalledWith("JWT_SECRET is not set");
    expect(exit).toHaveBeenCalledWith(1);
    expect(importError?.message).toBe("process.exit called");
  });

  it("exits when ENCRYPTION_SECRET is missing", async () => {
    const { exit, consoleError, importError } = await loadConfig({
      ...validEnv,
      ENCRYPTION_SECRET: undefined,
    });
    expect(consoleError).toHaveBeenCalledWith("ENCRYPTION_SECRET is not set");
    expect(exit).toHaveBeenCalledWith(1);
    expect(importError?.message).toBe("process.exit called");
  });

  it("exits when ENCRYPTION_SECRET is not 32 characters long", async () => {
    const { exit, consoleError, importError } = await loadConfig({
      ...validEnv,
      ENCRYPTION_SECRET: "too-short",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "ENCRYPTION_SECRET must be 32 bytes"
    );
    expect(exit).toHaveBeenCalledWith(1);
    expect(importError?.message).toBe("process.exit called");
  });

  it("accepts a 32 character ENCRYPTION_SECRET", async () => {
    const { exit, importError } = await loadConfig({
      ...validEnv,
      ENCRYPTION_SECRET: "a".repeat(32),
    });
    expect(exit).not.toHaveBeenCalled();
    expect(importError).toBeUndefined();
  });
});
