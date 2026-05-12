import { describe, expect, it } from "vitest";
import { buildUsageGuardrailProgress } from "@/src/lib/usage-guardrails";

describe("usage guardrails", () => {
  it("marks monthly limits as warning or exceeded from local month-to-date usage", () => {
    const progress = buildUsageGuardrailProgress({
      guardrails: {
        monthlyCostLimitUsd: 100,
        monthlyTokenLimit: 1_000
      },
      usage: {
        cost: 85,
        tokens: 1_250
      },
      now: new Date("2026-05-11T12:00:00.000Z")
    });

    expect(progress.monthLabel).toBe("May 2026");
    expect(progress.cost).toMatchObject({
      configured: true,
      used: 85,
      limit: 100,
      percent: 0.85,
      remaining: 15,
      status: "warning"
    });
    expect(progress.tokens).toMatchObject({
      configured: true,
      used: 1_250,
      limit: 1_000,
      percent: 1.25,
      remaining: 0,
      status: "exceeded"
    });
  });

  it("keeps unconfigured guardrails explicit instead of inventing limits", () => {
    const progress = buildUsageGuardrailProgress({
      guardrails: {
        monthlyCostLimitUsd: null,
        monthlyTokenLimit: null
      },
      usage: {
        cost: 12.5,
        tokens: 500
      },
      now: new Date("2026-05-11T12:00:00.000Z")
    });

    expect(progress.cost).toMatchObject({
      configured: false,
      limit: null,
      status: "not-configured"
    });
    expect(progress.tokens).toMatchObject({
      configured: false,
      limit: null,
      status: "not-configured"
    });
  });
});
