import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Several CLI/MCP integration tests spawn `bin/tokentrace.js`, which itself
// spawns `db-migrate` and `db-seed` as separate node processes. With the
// default fork pool (~one fork per core) that fans out to ~3x the core count
// in concurrent node processes, and the spawn-heavy tests start timing out
// under CPU contention. Cap the fork pool to roughly half the cores so the
// machine is never oversubscribed, and let one generous global timeout govern
// every test instead of scattered per-test overrides.
const maxForks = Math.max(2, Math.floor(os.availableParallelism() / 2));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: "forks",
    maxWorkers: maxForks
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  }
});
