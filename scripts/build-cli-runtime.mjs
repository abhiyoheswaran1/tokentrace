import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";

const outdir = path.join(process.cwd(), "dist", "runtime");

await fs.rm(outdir, { recursive: true, force: true });
await fs.mkdir(outdir, { recursive: true });

const entryPoints = {
  agent: "scripts/agent.ts",
  "db-migrate": "scripts/db-migrate.ts",
  "db-seed": "scripts/db-seed.ts",
  digest: "scripts/digest.ts",
  doctor: "scripts/doctor.ts",
  evidence: "scripts/evidence.ts",
  insights: "scripts/insights.ts",
  mcp: "scripts/mcp.ts",
  "pricing-refresh": "scripts/pricing-refresh.ts",
  report: "scripts/report.ts",
  repair: "scripts/repair.ts",
  review: "scripts/review.ts",
  roadmap: "scripts/roadmap.ts",
  reset: "scripts/reset.ts",
  scan: "scripts/scan.ts",
  status: "scripts/status.ts"
};

await Promise.all(
  Object.entries(entryPoints).map(([name, entryPoint]) =>
    build({
      entryPoints: [entryPoint],
      outfile: path.join(outdir, `${name}.mjs`),
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
    })
  )
);

console.log(`TokenTrace CLI runtime built at ${outdir}`);
