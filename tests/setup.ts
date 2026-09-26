import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests";
process.env.ENCRYPTION_SECRET = "test-encryption-secret-32-bytes!";
process.env.DISABLE_AUTH = "false";
process.env.GIT_TIMEOUT = "50";

afterEach(() => {
  cleanup();
});
