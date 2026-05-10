#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const root = process.cwd();
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-packed-smoke-"));
let tarballPath = null;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: {
      ...process.env,
      npm_config_cache: path.join(tempRoot, "npm-cache"),
      NPM_CONFIG_CACHE: path.join(tempRoot, "npm-cache"),
      NEXT_TELEMETRY_DISABLED: "1",
      CI: "true",
      ...options.env
    },
    encoding: "utf8",
    timeout: options.timeout ?? 120_000
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with status ${result.status ?? "null"}${
        result.signal ? ` and signal ${result.signal}` : ""
      }\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }

  return result.stdout;
}

function parsePackOutput(stdout) {
  const jsonStart = stdout.indexOf("[");
  if (jsonStart === -1) throw new Error(`npm pack did not emit JSON output:\n${stdout}`);
  const packed = JSON.parse(stdout.slice(jsonStart));
  const first = packed[0];
  if (!first?.filename) throw new Error(`npm pack JSON is missing filename:\n${stdout}`);
  return first;
}

try {
  const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const packed = parsePackOutput(run("npm", ["pack", "--json"]));
  tarballPath = path.join(root, packed.filename);

  const skipInstall = process.env.CODEX_SANDBOX_NETWORK_DISABLED === "1" && process.env.TOKENTRACE_FORCE_PACKED_INSTALL_SMOKE !== "1";
  if (skipInstall) {
    console.log("skip packed install smoke: sandbox network binding is disabled");
  } else {
    run("npm", [
      "install",
      "--prefix",
      tempRoot,
      "--omit=dev",
      "--no-audit",
      "--no-fund",
      "--ignore-scripts",
      tarballPath
    ]);

    const bin = path.join(tempRoot, "node_modules", ".bin", process.platform === "win32" ? "tokentrace.cmd" : "tokentrace");
    const version = run(bin, ["--version"], {
      cwd: tempRoot,
      env: {
        TOKENTRACE_HOME: path.join(tempRoot, "home"),
        TOKENTRACE_NO_OPEN: "1"
      }
    }).trim();
    if (version !== packageJson.version) {
      throw new Error(`Packed tokentrace --version returned ${version}, expected ${packageJson.version}`);
    }

    const help = run(bin, ["--help"], { cwd: tempRoot });
    if (!help.includes("tokentrace scan") || !help.includes("tokentrace statusline claude")) {
      throw new Error("Packed tokentrace --help is missing expected commands.");
    }

    console.log(`TokenTrace packed install smoke passed for ${packed.filename}`);
  }
} finally {
  await Promise.all([
    fs.rm(tempRoot, { recursive: true, force: true }),
    tarballPath ? fs.rm(tarballPath, { force: true }) : Promise.resolve()
  ]);
}

process.exit(0);
