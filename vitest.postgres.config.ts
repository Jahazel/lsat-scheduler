import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/postgres/**/*.test.ts"],
    globalSetup: ["./tests/postgres/globalSetup.ts"],
    setupFiles: ["./tests/postgres/setup.ts"],
    // The migration test clears its own bookkeeping. Other suites must wait.
    fileParallelism: false,
    testTimeout: 10000,
  },
});
