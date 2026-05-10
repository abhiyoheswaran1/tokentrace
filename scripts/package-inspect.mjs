import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8")
);

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return [fullPath];
  });
}

const lifecycleScripts = ["preinstall", "install", "postinstall"];
for (const scriptName of lifecycleScripts) {
  if (Object.hasOwn(packageJson.scripts ?? {}, scriptName)) {
    fail(`Remove npm lifecycle script "${scriptName}" before publishing.`);
  }
}

if (packageJson.dependencies?.next !== "^15.5.18") {
  fail("Keep the published Next.js dependency floor at ^15.5.18 or newer.");
}

if (packageJson.dependencies?.["drizzle-orm"] !== "^0.45.2") {
  fail("Keep the published drizzle-orm dependency floor at ^0.45.2 or newer.");
}

if (packageJson.overrides?.postcss !== "^8.5.14") {
  fail("Keep the PostCSS override at ^8.5.14 or newer.");
}

const nextServerDir = path.join(root, ".next", "server", "app");
if (!existsSync(nextServerDir)) {
  fail("Run npm run build before package inspection; .next/server/app is missing.");
} else {
  const routeFiles = walk(nextServerDir).filter(
    (filePath) =>
      filePath.endsWith(`${path.sep}page.js`) ||
      filePath.endsWith(`${path.sep}route.js`)
  );

  if (routeFiles.length === 0) {
    fail("No generated Next.js app route bundles were found for inspection.");
  }

  for (const filePath of routeFiles) {
    const source = readFileSync(filePath, "utf8");
    const size = statSync(filePath).size;
    const lineCount = source.split("\n").length;
    const relative = path.relative(root, filePath);
    const firstChunk = source.slice(0, 1000);
    const looksPacked =
      size > 10_000 &&
      (lineCount < 20 ||
        firstChunk.startsWith("(()=>{") ||
        firstChunk.startsWith("!function("));

    if (looksPacked) {
      fail(
        `${relative} looks minified or packed; keep Next serverMinification disabled for scanner readability.`
      );
    }
  }

  notes.push(`inspected ${routeFiles.length} generated Next.js app route bundles`);
}

if (failures.length > 0) {
  console.error("Package trust inspection failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Package trust inspection passed:");
console.log("- no npm install lifecycle scripts");
console.log("- Next.js dependency floor is pinned to the patched range");
console.log("- Drizzle ORM and PostCSS floors are pinned to patched ranges");
for (const note of notes) {
  console.log(`- ${note}`);
}
