import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/postgres/**/*.test.ts"],
    globalSetup: ["./tests/postgres/globalSetup.ts"],
    setupFiles: ["./tests/postgres/setup.ts"],
    // Keep local database connection counts small by running suites sequentially.
    fileParallelism: false,
    testTimeout: 10000,
  },
});
