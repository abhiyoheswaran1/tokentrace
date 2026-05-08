import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";

const outdir = path.join(process.cwd(), "dist", "runtime");

await fs.rm(outdir, { recursive: true, force: true });
await fs.mkdir(outdir, { recursive: true });

const entryPoints = {
  "db-migrate": "scripts/db-migrate.ts",
  "db-seed": "scripts/db-seed.ts",
  reset: "scripts/reset.ts",
  scan: "scripts/scan.ts"
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
        js: "import { createRequire as __tokenscopeCreateRequire } from 'node:module'; const require = __tokenscopeCreateRequire(import.meta.url);"
      },
      alias: {
        "@": process.cwd()
      }
    })
  )
);

console.log(`TokenScope CLI runtime built at ${outdir}`);
