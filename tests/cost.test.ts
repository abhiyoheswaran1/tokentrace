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
        currency: "USD"
      }
    );

    expect(result.status).toBe("exact");
    expect(result.amount).toBeCloseTo(6.35);
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
