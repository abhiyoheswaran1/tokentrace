import { readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

const lifecycleScripts = ["preinstall", "install", "postinstall"];
for (const scriptName of lifecycleScripts) {
  if (Object.hasOwn(packageJson.scripts ?? {}, scriptName)) {
    fail(`Remove npm lifecycle script "${scriptName}" before publishing.`);
  }
}

const expectedBin = "bin/tokentrace.js";
if (packageJson.bin?.tokentrace !== expectedBin) {
  fail(`Publish the tokentrace CLI bin as "${expectedBin}".`);
}

try {
  const binMode = statSync(path.join(root, expectedBin)).mode;
  if ((binMode & 0o111) === 0) {
    fail(`Published CLI bin "${expectedBin}" must be executable.`);
  }
} catch (error) {
  fail(
    `Could not inspect published CLI bin "${expectedBin}": ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

if (packageJson.dependencies?.next !== "^16.2.6") {
  fail("Keep the published Next.js dependency floor at ^16.2.6 or newer.");
}

if (packageJson.dependencies?.["drizzle-orm"] !== "^0.45.2") {
  fail("Keep the published drizzle-orm dependency floor at ^0.45.2 or newer.");
}

if (packageJson.overrides?.postcss !== "^8.5.15") {
  fail("Keep the PostCSS override at ^8.5.15 or newer.");
}

const blockedPackageEntries = [
  ".next/BUILD_ID",
  ".next/*.json",
  ".next/server",
  ".next/static"
];
for (const entry of blockedPackageEntries) {
  if (packageJson.files?.includes(entry)) {
    fail(`Do not publish generated Next.js output: remove "${entry}" from package.json files.`);
  }
}

const requiredPackageFiles = [
  "TOKENTRACE_AGENT.md",
  "llms.txt",
  "docs/chatgpt-app/manual-release-steps.md",
  "docs/chatgpt-app/dashboard-fields.json",
  "docs/chatgpt-app/assets/icon.png",
  "docs/CHATGPT_APP_RELEASE.md",
  "docs/CHATGPT_APP_PROTOTYPE.md",
  "docs/agent-adoption.md",
  "docs/agent-discovery.schema.json",
  "server.json",
  expectedBin
];

const pack = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
  cwd: root,
  encoding: "utf8",
  env: {
    ...process.env,
    npm_config_cache: path.join(
      process.env.TMPDIR ?? "/tmp",
      "tokentrace-package-inspect-npm-cache"
    ),
    NPM_CONFIG_CACHE: path.join(
      process.env.TMPDIR ?? "/tmp",
      "tokentrace-package-inspect-npm-cache"
    ),
    NEXT_TELEMETRY_DISABLED: "1"
  }
});

if (pack.status !== 0) {
  fail(`npm pack --dry-run failed:\n${pack.stdout}\n${pack.stderr}`);
} else {
  try {
    const jsonStart = pack.stdout.indexOf("[");
    const packed = JSON.parse(pack.stdout.slice(jsonStart));
    const files = packed[0]?.files?.map((file) => file.path) ?? [];
    const generatedNextFiles = files.filter(
      (file) => file.startsWith(".next/") || file.includes("/.next/")
    );

    if (generatedNextFiles.length > 0) {
      fail(
        `npm package includes generated Next.js output: ${generatedNextFiles
          .slice(0, 8)
          .join(", ")}`
      );
    }

    for (const requiredFile of requiredPackageFiles) {
      if (!files.includes(requiredFile)) {
        fail(`npm package is missing required release-hardening file: ${requiredFile}`);
      }
    }

    notes.push(`inspected ${files.length} files from npm pack dry-run`);
  } catch (error) {
    fail(
      `Could not parse npm pack --dry-run JSON output: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
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
console.log("- generated Next.js build output is excluded from the package");
console.log("- agent discovery docs, MCP adoption guide, ChatGPT app release docs and runbook, registry manifest, schema, and executable CLI bin are included");
for (const note of notes) {
  console.log(`- ${note}`);
}
