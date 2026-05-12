import { describe, expect, it } from "vitest";
import { buildReviewQueue } from "@/src/lib/review-queue";

const guardrails = {
  monthLabel: "May 2026",
  cost: {
    configured: true,
    used: 125,
    limit: 100,
    percent: 1.25,
    remaining: 0,
    status: "exceeded" as const
  },
  tokens: {
    configured: true,
    used: 60_000,
    limit: 100_000,
    percent: 0.6,
    remaining: 40_000,
    status: "ok" as const
  }
};

describe("review queue", () => {
  it("turns guardrails, repair work, and large sessions into ranked review items", () => {
    const queue = buildReviewQueue({
      summary: {
        totalTokens: 100_000,
        totalCost: 200,
        inputTokens: 40_000,
        cachedTokens: 1_000,
        unknownCostInteractions: 10
      },
      guardrails,
      unknownCosts: [
        {
          cause: "missing pricing",
          model: "claude-new",
          provider: "Anthropic",
          tool: "Claude Code",
          sourceFile: "/tmp/claude.jsonl",
          interactions: 10,
          sessions: 2,
          totalTokens: 25_000,
          repairHref: "/pricing?model=claude-new",
          sourceHref: "/sessions?source=%2Ftmp%2Fclaude.jsonl",
          parserHref: "/parser-debug?source=%2Ftmp%2Fclaude.jsonl",
          pricingHref: "/pricing?model=claude-new"
        }
      ],
      sessions: [
        {
          id: "session-1",
          startedAt: 1,
          endedAt: 2,
          title: "Large refactor",
          sourceFile: "/tmp/large.jsonl",
          tool: "Claude Code",
          provider: "Anthropic",
          project: "TokenTrace",
          projectPath: "/repo/tokentrace",
          models: "claude-sonnet",
          totalTokens: 45_000,
          inputTokens: 20_000,
          outputTokens: 10_000,
          cachedTokens: 15_000,
          reasoningTokens: 0,
          cost: 90,
          costEstimated: false,
          estimatedTokens: false,
          tokenConfidence: "exact",
          parser: "claude-code",
          parserStatus: "imported",
          parserConfidence: 0.99,
          parserReason: "fixture",
          sourceHref: "/sessions?source=%2Ftmp%2Flarge.jsonl",
          parserHref: "/parser-debug?source=%2Ftmp%2Flarge.jsonl",
          pricingHref: "/pricing?model=claude-sonnet",
          interactionCount: 12,
          durationMs: 60_000
        }
      ],
      projects: [
        {
          id: "project-1",
          project: "TokenTrace",
          path: "/repo/tokentrace",
          totalTokens: 80_000,
          cost: 160,
          sessions: 4,
          interactions: 30,
          outputInputRatio: 1.2,
          lastUsedAt: 2
        }
      ],
      models: [],
      tools: []
    });

    expect(queue.map((item) => item.id)).toEqual([
      "guardrail-cost-exceeded",
      "repair-unknown-cost-missing-pricing-claude-new",
      "review-session-session-1",
      "review-project-project-1"
    ]);
    expect(queue[0]).toMatchObject({
      severity: "high",
      category: "guardrail",
      href: "/sessions"
    });
    expect(queue[1]).toMatchObject({
      severity: "high",
      category: "cost-repair",
      href: "/pricing?model=claude-new"
    });
  });

  it("returns a calm baseline item when no review action is needed", () => {
    const queue = buildReviewQueue({
      summary: {
        totalTokens: 0,
        totalCost: 0,
        inputTokens: 0,
        cachedTokens: 0,
        unknownCostInteractions: 0
      },
      guardrails: {
        monthLabel: "May 2026",
        cost: { configured: false, used: 0, limit: null, percent: 0, remaining: null, status: "not-configured" },
        tokens: { configured: false, used: 0, limit: null, percent: 0, remaining: null, status: "not-configured" }
      },
      unknownCosts: [],
      sessions: [],
      projects: [],
      models: [],
      tools: []
    });

    expect(queue).toEqual([
      expect.objectContaining({
        id: "baseline",
        severity: "low",
        category: "baseline"
      })
    ]);
  });
});
