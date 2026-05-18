#!/usr/bin/env node

import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
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

const requiredPackageFiles = [
  "TOKENTRACE_AGENT.md",
  "llms.txt",
  "docs/agent-discovery.schema.json",
  "bin/tokentrace.js"
];

function assertPackedPayload(packed) {
  const files = packed.files?.map((file) => file.path) ?? [];
  for (const requiredFile of requiredPackageFiles) {
    if (!files.includes(requiredFile)) {
      throw new Error(`Packed tarball is missing required file: ${requiredFile}`);
    }
  }

  const generatedNextFiles = files.filter(
    (file) => file.startsWith(".next/") || file.includes("/.next/")
  );
  if (generatedNextFiles.length > 0) {
    throw new Error(
      `Packed tarball includes generated Next.js output: ${generatedNextFiles
        .slice(0, 8)
        .join(", ")}`
    );
  }
}

function runJson(bin, args, options = {}) {
  const stdout = run(bin, args, options);
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `${bin} ${args.join(" ")} did not emit valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }\nstdout:\n${stdout}`
    );
  }
}

function hasCommand(commands, id) {
  return Array.isArray(commands) && commands.some((command) => command?.id === id);
}

function assertDiscoverySmoke(bin, cwd, env) {
  const agent = runJson(bin, ["agent", "--json"], { cwd, env });
  if (agent.schemaVersion !== 1 || !hasCommand(agent.commands, "roadmap")) {
    throw new Error("Packed tokentrace agent --json is missing schemaVersion or roadmap command.");
  }

  const capabilities = runJson(bin, ["capabilities", "--json"], { cwd, env });
  const discoveryCommands = capabilities.discoveryCommands ?? [];
  const hasAgentDiscoveryCommand = discoveryCommands.some(
    (command) => Array.isArray(command) && command.join(" ") === "tokentrace agent --json"
  );
  if (capabilities.schemaVersion !== 1 || !hasAgentDiscoveryCommand) {
    throw new Error("Packed tokentrace capabilities --json is missing stable discovery commands.");
  }

  const roadmap = runJson(bin, ["roadmap", "--json"], { cwd, env });
  if (roadmap.version !== "0.10.0" || roadmap.release?.releaseAllowed !== true) {
    throw new Error("Packed tokentrace roadmap --json is missing the 0.10.0 release-ready status.");
  }
}

function findFreePort(hostname) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, hostname, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (port) resolve(port);
        else reject(new Error("Could not allocate a free port."));
      });
    });
  });
}

async function waitForServe(url, child, output) {
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(
        `tokentrace serve exited before becoming ready with code ${child.exitCode}\n${output()}`
      );
    }
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return;
    } catch {
      // Keep polling until the server is ready or the timeout expires.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for packed tokentrace serve.\n${output()}`);
}

async function runServeSmoke(bin, cwd, env) {
  const hostname = "127.0.0.1";
  const port = await findFreePort(hostname);
  const url = `http://${hostname}:${port}`;
  let stdout = "";
  let stderr = "";
  const child = spawn(
    bin,
    ["serve", "--hostname", hostname, "--port", String(port), "--no-open"],
    {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
    stdout = stdout.slice(-20_000);
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
    stderr = stderr.slice(-20_000);
  });

  try {
    await waitForServe(url, child, () => `stdout:\n${stdout}\nstderr:\n${stderr}`);
  } finally {
    if (child.exitCode == null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 5_000);
        child.once("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      if (child.exitCode == null) child.kill("SIGKILL");
    }
  }
}

try {
  const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const packed = parsePackOutput(run("npm", ["pack", "--json"]));
  assertPackedPayload(packed);
  tarballPath = path.join(root, packed.filename);

  const skipInstall = process.env.CODEX_SANDBOX_NETWORK_DISABLED === "1" && process.env.TOKENTRACE_FORCE_PACKED_INSTALL_SMOKE !== "1";
  if (skipInstall) {
    console.log("skip packed install smoke: sandbox network binding is disabled");
    console.log("packed tarball payload inspection passed");
  } else {
    run("npm", [
      "install",
      "--prefix",
      tempRoot,
      "--omit=dev",
      "--no-audit",
      "--no-fund",
      tarballPath
    ], { timeout: 300_000 });

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

    const cliEnv = {
      TOKENTRACE_HOME: path.join(tempRoot, "home"),
      TOKENTRACE_NO_OPEN: "1"
    };
    assertDiscoverySmoke(bin, tempRoot, cliEnv);

    await runServeSmoke(bin, tempRoot, {
      ...process.env,
      CI: "true",
      NEXT_TELEMETRY_DISABLED: "1",
      ...cliEnv
    });

    console.log(`TokenTrace packed install smoke passed for ${packed.filename}`);
  }
} finally {
  await Promise.all([
    fs.rm(tempRoot, { recursive: true, force: true }),
    tarballPath ? fs.rm(tarballPath, { force: true }) : Promise.resolve()
  ]);
}

process.exit(0);
