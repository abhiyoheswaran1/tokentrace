import { describe, expect, it } from "vitest";
import { estimateTokensFromText } from "@/src/lib/token-estimator";

describe("provider-aware token estimator", () => {
  it("uses tokenizer estimates for recognized OpenAI and Codex models", () => {
    const estimate = estimateTokensFromText("Build a small parser with tests.", {
      providerId: "openai",
      modelName: "gpt-5.4"
    });

    expect(estimate.method).toBe("tokenizer");
    expect(estimate.confidence).toBe("tokenizer estimate");
    expect(estimate.tokens).toBeGreaterThan(4);
  });

  it("uses tokenizer estimates for Claude family models", () => {
    const estimate = estimateTokensFromText("Summarize the local session evidence.", {
      providerId: "anthropic",
      modelName: "claude-sonnet-4-5-20250929"
    });

    expect(estimate.method).toBe("tokenizer");
    expect(estimate.confidence).toBe("tokenizer estimate");
  });

  it("falls back to simple estimates when no tokenizer family is recognized", () => {
    const estimate = estimateTokensFromText("unknown local tool output", {
      providerId: "local",
      modelName: "custom-model"
    });

    expect(estimate.method).toBe("simple");
    expect(estimate.confidence).toBe("simple estimate");
    expect(estimate.tokens).toBe(Math.ceil("unknown local tool output".length / 4));
  });
});
