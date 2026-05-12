import { describe, expect, it } from "vitest";
import { buildProjectSignals } from "@/src/lib/project-signals";
import type { ProjectAnalyticsRow, SessionRow } from "@/src/lib/analytics";

function project(overrides: Partial<ProjectAnalyticsRow>): ProjectAnalyticsRow {
  return {
    id: "project-1",
    project: "TokenTrace",
    path: "/repo/tokentrace",
    totalTokens: 10_000,
    cost: 10,
    sessions: 2,
    interactions: 10,
    outputInputRatio: 1,
    lastUsedAt: 1,
    ...overrides
  };
}

function session(overrides: Partial<SessionRow>): SessionRow {
  return {
    id: "session-1",
    startedAt: 1,
    endedAt: 2,
    title: null,
    sourceFile: "/tmp/session.jsonl",
    tool: "Claude Code",
    provider: "Anthropic",
    project: "TokenTrace",
    projectPath: "/repo/tokentrace",
    models: "claude-sonnet",
    totalTokens: 1_000,
    inputTokens: 400,
    outputTokens: 300,
    cachedTokens: 300,
    reasoningTokens: 0,
    cost: 1,
    costEstimated: false,
    estimatedTokens: false,
    tokenConfidence: "exact",
    parser: "claude-code",
    parserStatus: "imported",
    parserConfidence: 0.99,
    parserReason: null,
    sourceHref: "/sessions?source=%2Ftmp%2Fsession.jsonl",
    parserHref: "/parser-debug?source=%2Ftmp%2Fsession.jsonl",
    pricingHref: "/pricing?model=claude-sonnet",
    interactionCount: 1,
    durationMs: 1_000,
    ...overrides
  };
}

describe("project signals", () => {
  it("builds project-level attention signals from dominance and incomplete cost data", () => {
    const signals = buildProjectSignals({
      totalTokens: 100_000,
      projects: [
        project({ id: "project-1", totalTokens: 70_000, sessions: 4 }),
        project({ id: "project-2", project: "Small", path: "/repo/small", totalTokens: 30_000 })
      ],
      sessions: [
        session({ id: "s1", project: "TokenTrace", cost: null }),
        session({ id: "s2", project: "TokenTrace", estimatedTokens: true, tokenConfidence: "high-confidence estimate" }),
        session({ id: "s3", project: "TokenTrace", models: "claude-opus", totalTokens: 50_000 })
      ]
    });

    expect(signals.map((signal) => signal.id)).toEqual([
      "project-dominance-project-1",
      "project-unknown-cost-tokentrace",
      "project-estimated-tokens-tokentrace"
    ]);
    expect(signals[0]).toMatchObject({
      severity: "medium",
      href: "/sessions?project=TokenTrace"
    });
  });

  it("returns no signals when projects have no clear attention pattern", () => {
    expect(buildProjectSignals({
      totalTokens: 10_000,
      projects: [project({ totalTokens: 4_000 })],
      sessions: [session({ cost: 1, estimatedTokens: false, tokenConfidence: "exact" })]
    })).toEqual([]);
  });
});
