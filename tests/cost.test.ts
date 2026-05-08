import { describe, expect, it } from "vitest";
import { calculateInteractionCost } from "@/src/lib/cost";
import { estimateTokensFromText } from "@/src/lib/token-estimator";

describe("cost engine", () => {
  it("calculates exact interaction cost from configured prices", () => {
    const result = calculateInteractionCost(
      {
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        cacheReadTokens: 100_000,
        cacheWriteTokens: 50_000,
        reasoningTokens: 25_000,
        estimatedTokens: false
      },
      {
        inputTokenPrice: 2,
        outputTokenPrice: 8,
        cachedInputTokenPrice: 0.5,
        cacheWriteTokenPrice: null,
        currency: "USD"
      }
    );

    expect(result.status).toBe("exact");
    expect(result.amount).toBeCloseTo(6.35);
  });

  it("uses explicit cache-write pricing when configured", () => {
    const result = calculateInteractionCost(
      {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 100_000,
        cacheWriteTokens: 100_000,
        reasoningTokens: 0,
        estimatedTokens: false
      },
      {
        inputTokenPrice: 3,
        outputTokenPrice: 15,
        cachedInputTokenPrice: 0.3,
        cacheWriteTokenPrice: 3.75,
        currency: "USD"
      }
    );

    expect(result.amount).toBeCloseTo(0.405);
  });

  it("marks cost unknown when prices are missing", () => {
    const result = calculateInteractionCost(
      {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
        estimatedTokens: true
      },
      {
        inputTokenPrice: null,
        outputTokenPrice: 1,
        cachedInputTokenPrice: null,
        cacheWriteTokenPrice: null,
        currency: "USD"
      }
    );

    expect(result.status).toBe("unknown");
    expect(result.amount).toBeNull();
  });
});

describe("token estimator", () => {
  it("uses conservative chars divided by four approximation", () => {
    expect(estimateTokensFromText("abcdefghijkl").tokens).toBe(3);
  });
});
