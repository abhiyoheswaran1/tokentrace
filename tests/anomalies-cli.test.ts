import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { anomaliesUsage, parseAnomaliesArgs } from "@/src/lib/anomalies-cli";

const tempDirs: string[] = [];

async function tempHome() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-anomalies-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("parseAnomaliesArgs", () => {
  it("returns defaults when no flags are present", () => {
    expect(parseAnomaliesArgs([])).toEqual({
      help: false,
      json: false,
      window: 14,
      metric: "all"
    });
  });

  it("parses --json, --window and --metric", () => {
    expect(parseAnomaliesArgs(["--json", "--window=30", "--metric=cost"])).toEqual({
      help: false,
      json: true,
      window: 30,
      metric: "cost"
    });
  });

  it("rejects unknown options and invalid values", () => {
    expect(() => parseAnomaliesArgs(["--unknown"])).toThrow("Unknown option: --unknown");
    expect(() => parseAnomaliesArgs(["--metric=bogus"])).toThrow("Invalid --metric value");
    expect(() => parseAnomaliesArgs(["--window=0"])).toThrow("--window must be between 3 and 60");
    expect(() => parseAnomaliesArgs(["--window=999"])).toThrow("--window must be between 3 and 60");
    expect(() => parseAnomaliesArgs(["--window=abc"])).toThrow("Invalid --window value");
  });
});

describe("anomaliesUsage", () => {
  it("documents the new --window and --metric flags", () => {
    const usage = anomaliesUsage();
    expect(usage).toContain("Usage: tokentrace anomalies");
    expect(usage).toContain("--window");
    expect(usage).toContain("--metric");
    expect(usage).toContain("Zero AI tokens are spent");
  });
});

describe("tokentrace anomalies CLI", () => {
  it("prints help when --help is passed", async () => {
    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "anomalies", "--help"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: tokentrace anomalies");
  }, 90_000);

  it("emits a JSON report against an empty database", async () => {
    const home = await tempHome();
    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "anomalies", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        TOKENTRACE_HOME: home,
        TOKENTRACE_DB: path.join(home, "tokentrace.db")
      }
    });

    expect(result.status, result.stderr).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty("generatedAt");
    expect(parsed).toHaveProperty("windowSize", 14);
    expect(parsed).toHaveProperty("thresholds");
    expect(Array.isArray(parsed.anomalies)).toBe(true);
    expect(parsed.summary).toMatchObject({
      total: 0,
      bySeverity: { notable: 0, high: 0, severe: 0 },
      byMetric: { tokens: 0, cost: 0 }
    });
  }, 90_000);

  it("rejects invalid window values", async () => {
    const home = await tempHome();
    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "anomalies", "--window=2"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        TOKENTRACE_HOME: home,
        TOKENTRACE_DB: path.join(home, "tokentrace.db")
      }
    });

    expect(result.status).not.toBe(0);
    expect((result.stderr + result.stdout)).toContain("--window must be between 3 and 60");
  }, 60_000);
});
