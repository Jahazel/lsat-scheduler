import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    server: { deps: { inline: ["next-auth"] } },
    include: ["tests/postgres/**/*.test.ts"],
    globalSetup: ["./tests/postgres/globalSetup.ts"],
    setupFiles: ["./tests/postgres/setup.ts"],
    fileParallelism: false,
    testTimeout: 10000,
  },
});
