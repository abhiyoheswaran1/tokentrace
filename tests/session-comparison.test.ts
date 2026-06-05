import { describe, expect, it } from "vitest";
import { buildSessionComparisons } from "@/src/lib/session-comparison";
import type { SessionRow } from "@/src/lib/analytics";

function session(overrides: Partial<SessionRow>): SessionRow {
  return {
    id: "session",
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

describe("session comparison", () => {
  it("flags sessions that are much larger than peer sessions in the same project tool and model group", () => {
    const comparisons = buildSessionComparisons([
      session({ id: "small-1", totalTokens: 1_000, cost: 1 }),
      session({ id: "small-2", totalTokens: 1_200, cost: 1.1 }),
      session({ id: "large", title: "Large migration", totalTokens: 8_000, cost: 8, sourceHref: "/sessions?source=large" })
    ]);

    expect(comparisons[0]).toMatchObject({
      sessionId: "large",
      severity: "high",
      flag: "token outlier",
      peerSessions: 3,
      href: "/sessions?source=large"
    });
    expect(comparisons[0]!.tokenMultiple).toBeGreaterThan(6);
  });

  it("does not invent peer comparisons for one-off groups", () => {
    const comparisons = buildSessionComparisons([
      session({ id: "only", project: "Solo", totalTokens: 20_000, cost: 20 })
    ]);

    expect(comparisons).toEqual([]);
  });
});
