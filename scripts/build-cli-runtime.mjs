import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";

const outdir = path.join(process.cwd(), "dist", "runtime");
const cliOutdir = path.join(process.cwd(), "dist", "cli");

await fs.rm(outdir, { recursive: true, force: true });
await fs.mkdir(outdir, { recursive: true });
await fs.rm(cliOutdir, { recursive: true, force: true });
await fs.mkdir(cliOutdir, { recursive: true });

const sharedBuildOptions = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  sourcemap: false,
  packages: "external",
  external: ["better-sqlite3"],
  logLevel: "silent",
  banner: {
    js: "import { createRequire as __tokentraceCreateRequire } from 'node:module'; const require = __tokentraceCreateRequire(import.meta.url);"
  },
  alias: {
    "@": process.cwd()
  }
};

const entryPoints = {
  agent: "scripts/agent.ts",
  anomalies: "scripts/anomalies.ts",
  "chatgpt-app": "scripts/chatgpt-app.ts",
  "db-migrate": "scripts/db-migrate.ts",
  "db-seed": "scripts/db-seed.ts",
  digest: "scripts/digest.ts",
  doctor: "scripts/doctor.ts",
  evidence: "scripts/evidence.ts",
  insights: "scripts/insights.ts",
  mcp: "scripts/mcp.ts",
  "pricing-refresh": "scripts/pricing-refresh.ts",
  query: "scripts/query.ts",
  report: "scripts/report.ts",
  repair: "scripts/repair.ts",
  review: "scripts/review.ts",
  roadmap: "scripts/roadmap.ts",
  reset: "scripts/reset.ts",
  scan: "scripts/scan.ts",
  status: "scripts/status.ts"
};

await Promise.all([
  ...Object.entries(entryPoints).map(([name, entryPoint]) =>
    build({
      ...sharedBuildOptions,
      entryPoints: [entryPoint],
      outfile: path.join(outdir, `${name}.mjs`)
    })
  ),
  build({
    ...sharedBuildOptions,
    entryPoints: ["src/cli/main.ts"],
    outfile: path.join(cliOutdir, "main.mjs")
  })
]);

console.log(`TokenTrace CLI runtime built at ${outdir}`);
console.log(`TokenTrace CLI entry built at ${cliOutdir}`);
