import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseStructuredQueryArgs, structuredQueryUsage } from "@/src/lib/structured-query-cli";

const tempDirs: string[] = [];

async function tempHome() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-query-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("parseStructuredQueryArgs", () => {
  it("parses required flags via space or equals form", () => {
    expect(parseStructuredQueryArgs(["--group-by", "model", "--metric", "cost"])).toEqual({
      help: false,
      json: false,
      args: {
        groupBy: "model",
        metric: "cost",
        range: undefined,
        filters: undefined,
        topN: undefined,
        sort: undefined
      }
    });

    expect(parseStructuredQueryArgs(["--group-by=tool", "--metric=interactions", "--json"])).toEqual({
      help: false,
      json: true,
      args: {
        groupBy: "tool",
        metric: "interactions",
        range: undefined,
        filters: undefined,
        topN: undefined,
        sort: undefined
      }
    });
  });

  it("parses range, filters, sort, top", () => {
    const parsed = parseStructuredQueryArgs([
      "--group-by",
      "day",
      "--metric",
      "totalTokens",
      "--range",
      "7d",
      "--tool",
      "Claude Code",
      "--model",
      "gpt-5",
      "--project",
      "Alpha",
      "--top=10",
      "--sort",
      "asc",
      "--json"
    ]);
    expect(parsed.json).toBe(true);
    expect(parsed.args).toEqual({
      groupBy: "day",
      metric: "totalTokens",
      range: { preset: "7d", from: undefined, to: undefined },
      filters: { model: "gpt-5", project: "Alpha", tool: "Claude Code" },
      topN: 10,
      sort: "asc"
    });
  });

  it("parses --from and --to", () => {
    const parsed = parseStructuredQueryArgs([
      "--group-by",
      "model",
      "--metric",
      "cost",
      "--from",
      "2026-05-01",
      "--to",
      "2026-05-10"
    ]);
    expect(parsed.args.range).toEqual({ preset: undefined, from: "2026-05-01", to: "2026-05-10" });
  });

  it("rejects unknown options and invalid enum values", () => {
    expect(() => parseStructuredQueryArgs(["--what"])).toThrow("Unknown option: --what");
    expect(() =>
      parseStructuredQueryArgs(["--group-by", "model", "--metric", "junk"])
    ).toThrow("Invalid --metric");
    expect(() =>
      parseStructuredQueryArgs(["--group-by", "models", "--metric", "cost"])
    ).toThrow("Invalid --group-by");
    expect(() =>
      parseStructuredQueryArgs(["--group-by", "model", "--metric", "cost", "--top", "abc"])
    ).toThrow("Invalid --top");
  });

  it("requires --group-by and --metric outside of --help", () => {
    expect(() => parseStructuredQueryArgs([])).toThrow("--group-by is required");
    expect(() => parseStructuredQueryArgs(["--group-by", "model"])).toThrow("--metric is required");
    expect(parseStructuredQueryArgs(["--help"]).help).toBe(true);
  });
});

describe("structuredQueryUsage", () => {
  it("documents the required and optional flags", () => {
    const usage = structuredQueryUsage();
    expect(usage).toContain("Usage: tokentrace query");
    expect(usage).toContain("--group-by");
    expect(usage).toContain("--metric");
    expect(usage).toContain("Zero AI tokens spent");
  });
});

describe("tokentrace query CLI", () => {
  it("prints help when --help is passed", () => {
    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "query", "--help"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: tokentrace query");
  }, 30_000);

  it("emits a JSON result against an empty database", async () => {
    const home = await tempHome();
    const result = spawnSync(
      process.execPath,
      [
        "bin/tokentrace.js",
        "query",
        "--group-by",
        "model",
        "--metric",
        "cost",
        "--json"
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 60_000,
        env: {
          ...process.env,
          TOKENTRACE_HOME: home,
          TOKENTRACE_DB: path.join(home, "tokentrace.db")
        }
      }
    );

    expect(result.status, result.stderr).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.groupBy).toBe("model");
    expect(parsed.metric).toBe("cost");
    expect(parsed).toHaveProperty("rows");
    expect(parsed).toHaveProperty("totalGroups");
  }, 60_000);

  it("rejects missing required flags", async () => {
    const home = await tempHome();
    const result = spawnSync(process.execPath, ["bin/tokentrace.js", "query"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        TOKENTRACE_HOME: home,
        TOKENTRACE_DB: path.join(home, "tokentrace.db")
      }
    });
    expect(result.status).not.toBe(0);
    expect((result.stderr + result.stdout)).toContain("--group-by is required");
  }, 60_000);
});
