import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.E2E_BASE_URL;

if (!baseUrl) {
  console.error("E2E_BASE_URL is required, for example E2E_BASE_URL=http://127.0.0.1:3030 npm run visual:smoke");
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "docs", "assets", "visual-smoke");
mkdirSync(outputDir, { recursive: true });

const targets = [
  ["overview", "/"],
  ["evidence-unknown-cost", "/evidence?metric=unknown-cost"],
  ["repair", "/repair"],
  ["pricing", "/pricing"]
];

for (const [name, route] of targets) {
  const url = new URL(route, baseUrl).toString();
  const output = path.join(outputDir, `${name}.png`);
  execFileSync("npx", ["--yes", "playwright@latest", "screenshot", "--full-page", url, output], {
    stdio: "inherit"
  });
}

console.log(`Visual smoke screenshots written to ${outputDir}`);
