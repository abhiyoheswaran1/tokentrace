import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  autoClassifyUsage,
  buildAutoClassifyResult,
  parseAutoClassifyArgs
} from "@/src/lib/unknown-cost-repair/auto-classify-cli";
import type { UnknownCostRepairWorkbench, UnknownCostRepairWorkbenchGroup } from "@/src/lib/unknown-cost-repair/types";

const tempDirs: string[] = [];

async function tempHome() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-auto-classify-cli-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function fakeGroup(overrides: Partial<UnknownCostRepairWorkbenchGroup> = {}): UnknownCostRepairWorkbenchGroup {
  return {
    key: "repair:v1:missing-pricing:openai:codex:gpt-5:/tmp/x.jsonl",
    cause: "missing pricing",
    sourceFile: "/tmp/x.jsonl",
    provider: "OpenAI",
    model: "GPT-5",
    tool: "Codex CLI",
    state: "unresolved",
    note: "",
    suggestedModel: null,
    interactions: 5,
    sessions: 1,
    totalTokens: 1000,
    inputTokens: 600,
    outputTokens: 400,
    cachedTokens: 0,
    reasoningTokens: 0,
    review: { status: "unresolved", notes: "", createdAt: null, updatedAt: null },
    suggestion: { suggestedModel: null, confidence: "low", reason: "" },
    itemHref: "",
    repairHref: "",
    sourceHref: "",
    sessionHref: "",
    sessionsHref: "",
    parserHref: "",
    pricingHref: null,
    primaryAction: {
      kind: "view-evidence",
      label: "Review",
      href: "/repair",
      description: "",
      expectedChange: ""
    },
    secondaryActions: [],
    impact: "",
    resolvedStateLabel: "",
    classification: {
      suggestedModel: "gpt-5",
      suggestedProvider: "OpenAI",
      confidence: 0.95,
      rule: "exact-model",
      evidence: { matchedRows: 10, sampleSourceFile: null }
    },
    ...overrides
  };
}

describe("parseAutoClassifyArgs", () => {
  it("returns defaults", () => {
    expect(parseAutoClassifyArgs([])).toEqual({
      help: false,
      json: false,
      minConfidence: 0,
      apply: false,
      dryRun: false,
      minConfidenceProvided: false
    });
  });

  it("parses --json and --min-confidence", () => {
    expect(parseAutoClassifyArgs(["--json", "--min-confidence=0.7"])).toEqual({
      help: false,
      json: true,
      minConfidence: 0.7,
      apply: false,
      dryRun: false,
      minConfidenceProvided: true
    });
  });

  it("rejects invalid min-confidence", () => {
    expect(() => parseAutoClassifyArgs(["--min-confidence=2"])).toThrow("Invalid --min-confidence");
    expect(() => parseAutoClassifyArgs(["--min-confidence=foo"])).toThrow("Invalid --min-confidence");
    expect(() => parseAutoClassifyArgs(["--min-confidence=-0.1"])).toThrow("Invalid --min-confidence");
  });

  it("rejects unknown options", () => {
    expect(() => parseAutoClassifyArgs(["--mystery"])).toThrow("Unknown option: --mystery");
  });
});

describe("autoClassifyUsage", () => {
  it("documents the new subcommand", () => {
    const usage = autoClassifyUsage();
    expect(usage).toContain("tokentrace repair auto-classify");
    expect(usage).toContain("exact-model");
    expect(usage).toContain("family-fragment");
    expect(usage).toContain("parser-source");
    expect(usage).toContain("Zero AI tokens are spent");
  });
});

describe("buildAutoClassifyResult", () => {
  it("filters by minConfidence and summarizes by rule", () => {
    const workbench: UnknownCostRepairWorkbench = {
      summary: { unresolved: 3, needsParserReview: 0, ignored: 0, resolved: 0, totalInteractions: 15 },
      groups: [
        fakeGroup({
          key: "k1",
          classification: {
            suggestedModel: "gpt-5",
            suggestedProvider: "OpenAI",
            confidence: 0.95,
            rule: "exact-model",
            evidence: { matchedRows: 10, sampleSourceFile: null }
          }
        }),
        fakeGroup({
          key: "k2",
          classification: {
            suggestedModel: "claude-opus-4-7",
            suggestedProvider: "Anthropic",
            confidence: 0.7,
            rule: "family-fragment",
            evidence: { matchedRows: 4, sampleSourceFile: null }
          }
        }),
        fakeGroup({
          key: "k3",
          classification: {
            suggestedModel: null,
            suggestedProvider: null,
            confidence: 0,
            rule: "none",
            evidence: { matchedRows: 0, sampleSourceFile: null }
          }
        })
      ],
      totalGroups: 3,
      shownGroups: 3,
      hasMoreGroups: false
    };

    const high = buildAutoClassifyResult(workbench, { minConfidence: 0.85 });
    expect(high.suggestions.map((entry) => entry.key)).toEqual(["k1"]);
    expect(high.summary.highConfidence).toBe(1);
    expect(high.summary.byRule["exact-model"]).toBe(1);

    const all = buildAutoClassifyResult(workbench, { minConfidence: 0 });
    expect(all.suggestions).toHaveLength(3);
    expect(all.summary.byRule.none).toBe(1);
    expect(all.totalGroups).toBe(3);
    expect(all.shownSuggestions).toBe(3);
  });
});

describe("tokentrace repair auto-classify CLI", () => {
  it("prints help when --help is passed", () => {
    const result = spawnSync(
      process.execPath,
      ["bin/tokentrace.js", "repair", "auto-classify", "--help"],
      { cwd: process.cwd(), encoding: "utf8" }
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("tokentrace repair auto-classify");
  });

  it("emits a JSON suggestion report against an empty database", async () => {
    const home = await tempHome();
    const result = spawnSync(
      process.execPath,
      ["bin/tokentrace.js", "repair", "auto-classify", "--json"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          TOKENTRACE_HOME: home,
          TOKENTRACE_DB: path.join(home, "tokentrace.db")
        }
      }
    );

    expect(result.status, result.stderr).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty("generatedAt");
    expect(parsed.minConfidence).toBe(0);
    expect(parsed.totalGroups).toBe(0);
    expect(parsed.suggestions).toEqual([]);
    expect(parsed.summary.byRule).toEqual({
      "exact-model": 0,
      "family-fragment": 0,
      "parser-source": 0,
      none: 0
    });
  });

  it("rejects invalid --min-confidence values", async () => {
    const home = await tempHome();
    const result = spawnSync(
      process.execPath,
      ["bin/tokentrace.js", "repair", "auto-classify", "--min-confidence=2"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          TOKENTRACE_HOME: home,
          TOKENTRACE_DB: path.join(home, "tokentrace.db")
        }
      }
    );
    expect(result.status).not.toBe(0);
    expect((result.stderr + result.stdout)).toContain("Invalid --min-confidence");
  });
});
