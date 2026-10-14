import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  define: {
    "import.meta.env.VITE_SITE_ID": JSON.stringify(
      process.env.VITE_SITE_ID ?? "rpcc",
    ),
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    env: { SKIP_ENV_VALIDATION: "1" },
  },
});
