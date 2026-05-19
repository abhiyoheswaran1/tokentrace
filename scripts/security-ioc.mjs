#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

const TANSTACK_BAD_VERSIONS = new Map(
  Object.entries({
    "@tanstack/arktype-adapter": ["1.166.12", "1.166.15"],
    "@tanstack/eslint-plugin-router": ["1.161.9", "1.161.12"],
    "@tanstack/eslint-plugin-start": ["0.0.4", "0.0.7"],
    "@tanstack/history": ["1.161.9", "1.161.12"],
    "@tanstack/nitro-v2-vite-plugin": ["1.154.12", "1.154.15"],
    "@tanstack/react-router": ["1.169.5", "1.169.8"],
    "@tanstack/react-router-devtools": ["1.166.16", "1.166.19"],
    "@tanstack/react-router-ssr-query": ["1.166.15", "1.166.18"],
    "@tanstack/react-start": ["1.167.68", "1.167.71"],
    "@tanstack/react-start-client": ["1.166.51", "1.166.54"],
    "@tanstack/react-start-rsc": ["0.0.47", "0.0.50"],
    "@tanstack/react-start-server": ["1.166.55", "1.166.58"],
    "@tanstack/router-cli": ["1.166.46", "1.166.49"],
    "@tanstack/router-core": ["1.169.5", "1.169.8"],
    "@tanstack/router-devtools": ["1.166.16", "1.166.19"],
    "@tanstack/router-devtools-core": ["1.167.6", "1.167.9"],
    "@tanstack/router-generator": ["1.166.45", "1.166.48"],
    "@tanstack/router-plugin": ["1.167.38", "1.167.41"],
    "@tanstack/router-ssr-query-core": ["1.168.3", "1.168.6"],
    "@tanstack/router-utils": ["1.161.11", "1.161.14"],
    "@tanstack/router-vite-plugin": ["1.166.53", "1.166.56"],
    "@tanstack/solid-router": ["1.169.5", "1.169.8"],
    "@tanstack/solid-router-devtools": ["1.166.16", "1.166.19"],
    "@tanstack/solid-router-ssr-query": ["1.166.15", "1.166.18"],
    "@tanstack/solid-start": ["1.167.65", "1.167.68"],
    "@tanstack/solid-start-client": ["1.166.50", "1.166.53"],
    "@tanstack/solid-start-server": ["1.166.54", "1.166.57"],
    "@tanstack/start-client-core": ["1.168.5", "1.168.8"],
    "@tanstack/start-fn-stubs": ["1.161.9", "1.161.12"],
    "@tanstack/start-plugin-core": ["1.169.23", "1.169.26"],
    "@tanstack/start-server-core": ["1.167.33", "1.167.36"],
    "@tanstack/start-static-server-functions": ["1.166.44", "1.166.47"],
    "@tanstack/start-storage-context": ["1.166.38", "1.166.41"],
    "@tanstack/valibot-adapter": ["1.166.12", "1.166.15"],
    "@tanstack/virtual-file-routes": ["1.161.10", "1.161.13"],
    "@tanstack/vue-router": ["1.169.5", "1.169.8"],
    "@tanstack/vue-router-devtools": ["1.166.16", "1.166.19"],
    "@tanstack/vue-router-ssr-query": ["1.166.15", "1.166.18"],
    "@tanstack/vue-start": ["1.167.61", "1.167.64"],
    "@tanstack/vue-start-client": ["1.166.46", "1.166.49"],
    "@tanstack/vue-start-server": ["1.166.50", "1.166.53"],
    "@tanstack/zod-adapter": ["1.166.12", "1.166.15"]
  }).map(([name, versions]) => [name, new Set(versions)])
);

const BROADER_BAD_VERSIONS = new Map(
  Object.entries({
    "@mistralai/mistralai": ["2.2.4"],
    "@opensearch-project/opensearch": ["3.5.3", "3.6.2", "3.7.0", "3.8.0"],
    "guardrails-ai": ["0.10.1"],
    mistralai: ["2.4.6"]
  }).map(([name, versions]) => [name, new Set(versions)])
);

const BAD_PACKAGE_VERSIONS = new Map([...TANSTACK_BAD_VERSIONS, ...BROADER_BAD_VERSIONS]);

const IOC_PATTERNS = [
  {
    label: "malicious TanStack git dependency",
    regex: /github:tanstack\/router#79ac49eedf774dd4b0cfa308722bc463cfe5885c/i
  },
  { label: "malicious optional dependency @tanstack/setup", regex: /@tanstack\/setup/i },
  { label: "payload file router_init.js", regex: /\brouter_init\.js\b/i },
  { label: "helper file tanstack_runner.js", regex: /\btanstack_runner\.js\b/i },
  { label: "Mini Shai-Hulud repo marker", regex: /A Mini Shai-Hulud has Appeared/i },
  { label: "suspicious gh-token-monitor process/hook", regex: /\bgh-token-monitor\b/i },
  { label: "typosquat exfiltration domain git-tanstack.com", regex: /\bgit-tanstack\.com\b/i },
  { label: "Session exfiltration host filev2.getsession.org", regex: /\bfilev2\.getsession\.org\b/i },
  { label: "Session seed host", regex: /\bseed[123]\.getsession\.org\b/i },
  { label: "second-stage payload host litter.catbox.moe", regex: /\blitter\.catbox\.moe\b/i }
];

const DEFAULT_EXCLUDED_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results"
]);

const DEFAULT_BINARY_EXTENSIONS = new Set([
  ".avif",
  ".br",
  ".DS_Store",
  ".gif",
  ".gz",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp4",
  ".pdf",
  ".png",
  ".sqlite",
  ".sqlite3",
  ".tar",
  ".tgz",
  ".webp",
  ".zip"
]);

const SCANNER_FIXTURE_FILES = new Set([
  "scripts/security-ioc.mjs",
  "tests/security-ioc.test.ts",
  "tests/package-trust.test.ts"
]);

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root ?? process.cwd());
const home = args.home === false ? null : path.resolve(args.home ?? homedir());
const maxFileBytes = Number(args.maxFileBytes ?? 1_500_000);
const findings = [];
let filesScanned = 0;

if (!existsSync(root)) {
  console.error(`Supply-chain IOC scan failed: root does not exist: ${root}`);
  process.exit(1);
}

scanTree(root, "project");
scanHomeFiles(home);

if (findings.length > 0) {
  console.error("Supply-chain IOC scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding.scope}: ${finding.path}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Supply-chain IOC scan passed:");
console.log(`- scanned ${filesScanned} project files`);
if (home) {
  console.log("- checked local Claude, VS Code, npm, and git hook files when present");
}
console.log("- no known Mini Shai-Hulud/TanStack package, payload, hook, or workflow IOCs found");

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      parsed.root = argv[++index];
    } else if (arg === "--home") {
      parsed.home = argv[++index];
    } else if (arg === "--no-home") {
      parsed.home = false;
    } else if (arg === "--max-file-bytes") {
      parsed.maxFileBytes = argv[++index];
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(2);
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage: node scripts/security-ioc.mjs [--root DIR] [--home DIR|--no-home]

Scans project files and local AI-tool hook files for high-signal npm/PyPI
supply-chain indicators, including CVE-2026-45321 TanStack package versions.

Options:
  --root DIR             Project root to scan. Defaults to cwd.
  --home DIR             Home directory used for ~/.claude and ~/.vscode checks.
  --no-home              Skip local home hook checks.
  --max-file-bytes N     Skip larger files. Defaults to 1500000.
`);
}

function scanTree(start, scope) {
  for (const filePath of walk(start)) {
    const displayPath = relativePath(start, filePath);
    if (SCANNER_FIXTURE_FILES.has(displayPath)) continue;
    scanFile(filePath, scope, displayPath);
  }
}

function* walk(current) {
  let stat;
  try {
    stat = lstatSync(current);
  } catch {
    return;
  }

  if (stat.isSymbolicLink()) return;

  if (stat.isDirectory()) {
    if (DEFAULT_EXCLUDED_DIRS.has(path.basename(current))) return;

    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      yield* walk(path.join(current, entry.name));
    }
    return;
  }

  if (!stat.isFile()) return;
  if (stat.size > maxFileBytes) return;
  if (DEFAULT_BINARY_EXTENSIONS.has(path.extname(current))) return;

  yield current;
}

function scanHomeFiles(homeRoot) {
  if (!homeRoot) return;

  const homeFiles = [
    ".claude/settings.json",
    ".claude/settings.local.json",
    ".vscode/tasks.json",
    ".vscode/settings.json",
    ".npmrc",
    ".git-credentials"
  ];

  for (const homeFile of homeFiles) {
    const filePath = path.join(homeRoot, homeFile);
    if (!existsSync(filePath)) continue;
    scanFile(filePath, "local hook", homeFile);
  }
}

function scanFile(filePath, scope, displayPath) {
  let text;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  filesScanned += scope === "project" ? 1 : 0;

  for (const pattern of IOC_PATTERNS) {
    if (pattern.regex.test(text)) {
      addFinding(scope, displayPath, pattern.label);
    }
  }

  if (isWorkflow(displayPath) && /\bpull_request_target\b/.test(text)) {
    addFinding(
      scope,
      displayPath,
      "workflow uses pull_request_target; avoid running fork-controlled code in privileged workflow context"
    );
  }

  if (isPackageManifest(displayPath)) {
    scanPackageJson(text, scope, displayPath);
  } else if (path.basename(displayPath) === "package-lock.json") {
    scanPackageLock(text, scope, displayPath);
  } else if (isLockfile(displayPath)) {
    scanTextLockfile(text, scope, displayPath);
  }
}

function scanPackageJson(text, scope, displayPath) {
  const manifest = parseJson(text, scope, displayPath);
  if (!manifest) return;

  const dependencyBlocks = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.optionalDependencies,
    manifest.peerDependencies,
    manifest.overrides
  ];

  for (const block of dependencyBlocks) {
    if (!block || typeof block !== "object") continue;
    for (const [name, spec] of Object.entries(block)) {
      checkPackageVersion(name, normalizeVersionSpec(spec), scope, displayPath);
    }
  }
}

function scanPackageLock(text, scope, displayPath) {
  const lock = parseJson(text, scope, displayPath);
  if (!lock) return;

  if (lock.packages && typeof lock.packages === "object") {
    for (const [packagePath, details] of Object.entries(lock.packages)) {
      if (!details || typeof details !== "object") continue;
      const name = details.name ?? packageNameFromLockPath(packagePath);
      checkPackageVersion(name, details.version, scope, displayPath);
    }
  }

  if (lock.dependencies && typeof lock.dependencies === "object") {
    for (const [name, details] of Object.entries(lock.dependencies)) {
      if (!details || typeof details !== "object") continue;
      checkPackageVersion(name, details.version, scope, displayPath);
    }
  }
}

function scanTextLockfile(text, scope, displayPath) {
  for (const [name, versions] of BAD_PACKAGE_VERSIONS.entries()) {
    if (!text.includes(name)) continue;
    for (const version of versions) {
      if (new RegExp(`${escapeRegex(name)}[^\\n]{0,140}${escapeRegex(version)}`).test(text)) {
        addFinding(scope, displayPath, `known malicious package version ${name}@${version}`);
      }
    }
  }
}

function checkPackageVersion(name, version, scope, displayPath) {
  if (typeof name !== "string" || typeof version !== "string") return;

  const badVersions = BAD_PACKAGE_VERSIONS.get(name);
  if (!badVersions?.has(version)) return;

  addFinding(scope, displayPath, `known malicious package version ${name}@${version}`);
}

function parseJson(text, scope, displayPath) {
  try {
    return JSON.parse(text);
  } catch {
    addFinding(scope, displayPath, "invalid JSON blocks package security inspection");
    return null;
  }
}

function normalizeVersionSpec(spec) {
  if (typeof spec !== "string") return null;
  const trimmed = spec.trim();
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(trimmed) ? trimmed : null;
}

function packageNameFromLockPath(lockPath) {
  if (!lockPath.startsWith("node_modules/")) return null;
  return lockPath.slice("node_modules/".length);
}

function isWorkflow(displayPath) {
  return /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(displayPath);
}

function isPackageManifest(displayPath) {
  return path.basename(displayPath) === "package.json";
}

function isLockfile(displayPath) {
  return /(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|poetry\.lock|requirements.*\.txt|pyproject\.toml)$/i.test(
    displayPath
  );
}

function addFinding(scope, displayPath, message) {
  findings.push({ scope, path: displayPath, message });
}

function relativePath(base, filePath) {
  return path.relative(base, filePath).split(path.sep).join("/");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
