import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: [
      "packages/shared/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    environment: "node",
  },
  resolve: {
    alias: {
      "@swearch/shared": resolve(__dirname, "packages/shared/types/index.ts"),
      "@swearch/shared/constants/auth-sync": resolve(
        __dirname,
        "packages/shared/constants/auth-sync.ts"
      ),
    },
  },
});
