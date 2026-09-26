import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    pool: "forks",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 20000,
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      include: ["backend/**/*.ts", "src/**/*.{ts,tsx}", "prisma/client.js"],
      exclude: [
        "backend/types/**",
        "src/env.d.ts",
        "src/types/**",
        "**/*.d.ts",
      ],
    },
  },
});
