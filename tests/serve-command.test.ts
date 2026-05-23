import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parsePricingRefreshArgs, pricingRefreshUsage } from "@/src/lib/pricing-refresh-cli";
import { jsonReportUsage, parseDigestArgs, parseJsonReportArgs, parseMarkdownReportArgs } from "@/src/lib/report-cli";
import { parseScanArgs, scanUsage } from "@/src/lib/scan-cli";
import { parseStatusArgs, statusUsage } from "@/src/lib/status-cli";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

async function tempHome() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-serve-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("serve command", () => {
  it("prints serve-specific help without starting the server", async () => {
    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "serve", "--help"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        TOKENTRACE_HOME: await tempHome()
      }
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("tokentrace serve --port 3210");
    expect(result.stdout).toContain("--no-open");
    expect(result.stdout).toContain("If the fixed port is busy");
    expect(result.stderr).toBe("");
  });

  it("documents startup progress and fixed-port recovery paths", async () => {
    const source = await fs.readFile(path.join(process.cwd(), "src", "cli", "serve.js"), "utf8");

    expect(source).toContain("function startupProgress");
    expect(source).toContain("function resolveServePort");
    expect(source).toContain("function formatServeError");
    expect(source).toContain("Preparing local database");
    expect(source).toContain("Checking dashboard build");
    expect(source).toContain("Dashboard ready");
    expect(source).toContain("Requested port");
    expect(source).toContain("Try: tokentrace serve --port");
  });
});

describe("scan command", () => {
  it("prints command help before touching runtime directories", async () => {
    const invalidHomeParent = await tempHome();
    const invalidHome = path.join(invalidHomeParent, "not-a-directory");
    await fs.writeFile(invalidHome, "this path should never be used for --help");

    const commands: Array<[string, string]> = [
      ["scan", "Usage: tokentrace scan"],
      ["doctor", "Usage: tokentrace doctor"],
      ["evidence", "Usage: tokentrace evidence"],
      ["digest", "Usage: tokentrace digest"],
      ["report", "Usage: tokentrace report"],
      ["review", "Usage: tokentrace review"],
      ["insights", "Usage: tokentrace insights"],
      ["repair", "tokentrace repair"],
      ["status", "tokentrace status [--json]"],
      ["watch", "tokentrace watch"]
    ];

    const env = {
      ...process.env,
      TOKENTRACE_HOME: invalidHome,
      TOKENTRACE_DB: path.join(invalidHome, "tokentrace.db"),
      DATABASE_URL: `file:${path.join(invalidHome, "tokentrace.db")}`
    };

    const results = await Promise.all(
      commands.map(([command, expectedUsage]) =>
        new Promise<{ command: string; expectedUsage: string; status: number | null; stdout: string; stderr: string }>(
          (resolve, reject) => {
            const child = spawn(process.execPath, ["bin/tokentrace.js", command, "--help"], {
              cwd: process.cwd(),
              env
            });
            let stdout = "";
            let stderr = "";
            child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
            child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
            child.on("error", reject);
            child.on("close", (status) => resolve({ command, expectedUsage, status, stdout, stderr }));
          }
        )
      )
    );

    for (const { command, expectedUsage, status, stdout, stderr } of results) {
      expect(status, `${command} --help`).toBe(0);
      expect(stdout, `${command} --help`).toContain(expectedUsage);
      expect(stderr, `${command} --help`).toBe("");
    }
  }, 60_000);

  it("rejects unknown options instead of treating them as folders", () => {
    expect(() => parseScanArgs(["--forcee"])).toThrow("Unknown option: --forcee");
    expect(scanUsage()).toContain("Usage:");
  });

  it("parses supported scan flags and folders explicitly", () => {
    expect(parseScanArgs(["--force", "--json", "/tmp/ai-logs"])).toEqual({
      force: true,
      folders: ["/tmp/ai-logs"],
      help: false,
      json: true
    });
  });
});

describe("pricing refresh command", () => {
  it("rejects unknown options instead of falling back to a remote refresh", () => {
    expect(() => parsePricingRefreshArgs(["--bundle"])).toThrow("Unknown option: --bundle");
    expect(pricingRefreshUsage()).toContain("Usage:");
  });

  it("parses supported pricing refresh flags explicitly", () => {
    expect(parsePricingRefreshArgs(["--bundled", "--force", "--json", "--quiet"])).toEqual({
      bundled: true,
      force: true,
      help: false,
      json: true,
      quiet: true
    });
  });
});

describe("report commands", () => {
  it("rejects unknown report options instead of silently rendering text", () => {
    expect(() => parseJsonReportArgs(["--jsoon"])).toThrow("Unknown option: --jsoon");
    expect(jsonReportUsage("doctor")).toContain("Usage:");
  });

  it("parses report JSON and help flags explicitly", () => {
    expect(parseJsonReportArgs(["--json"])).toEqual({ help: false, json: true });
    expect(parseJsonReportArgs(["--help"])).toEqual({ help: true, json: false });
  });

  it("parses digest since and markdown report flags explicitly", () => {
    expect(parseDigestArgs(["--json", "--since", "yesterday"])).toEqual({
      help: false,
      json: true,
      since: "yesterday"
    });
    expect(parseMarkdownReportArgs(["--markdown", "--since", "last-scan"])).toEqual({
      help: false,
      csv: false,
      json: false,
      markdown: true,
      since: "last-scan",
      type: null
    });
    expect(parseMarkdownReportArgs(["--type", "source-coverage", "--csv"])).toEqual({
      help: false,
      csv: true,
      json: false,
      markdown: false,
      since: null,
      type: "source-coverage"
    });
  });
});

describe("status command", () => {
  it("rejects unknown status options instead of silently ignoring them", () => {
    expect(() => parseStatusArgs(["--jsoon"])).toThrow("Unknown option: --jsoon");
    expect(statusUsage()).toContain("Usage:");
  });

  it("parses status, watch, and statusline options explicitly", () => {
    expect(parseStatusArgs(["--json", "--source-file", "/tmp/session.jsonl"])).toEqual({
      command: "status",
      help: false,
      json: true,
      mode: "default",
      sourceFile: "/tmp/session.jsonl"
    });
    expect(parseStatusArgs(["watch", "--session", "--wide", "--interval", "50"])).toEqual({
      command: "watch",
      help: false,
      interval: 250,
      mode: "wide",
      sourceFile: null
    });
    expect(parseStatusArgs(["statusline", "claude", "--compact"])).toEqual({
      command: "statusline",
      help: false,
      mode: "compact"
    });
  });
});
