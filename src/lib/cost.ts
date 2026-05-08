export type PriceConfig = {
  inputTokenPrice: number | null;
  outputTokenPrice: number | null;
  cachedInputTokenPrice: number | null;
  cacheWriteTokenPrice?: number | null;
  currency: string;
};

export type TokenUsageForCost = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  estimatedTokens: boolean;
};

export type CostResult = {
  amount: number | null;
  currency: string;
  estimated: boolean;
  status: "exact" | "estimated" | "unknown";
  explanation: string;
};

function pricePart(tokens: number, pricePerMillion: number | null | undefined) {
  if (!tokens || pricePerMillion == null) return 0;
  return (tokens * pricePerMillion) / 1_000_000;
}

export function calculateInteractionCost(
  usage: TokenUsageForCost,
  price: PriceConfig | null | undefined
): CostResult {
  if (!price || price.inputTokenPrice == null || price.outputTokenPrice == null) {
    return {
      amount: null,
      currency: price?.currency ?? "USD",
      estimated: usage.estimatedTokens,
      status: "unknown",
      explanation: "No complete model pricing is configured."
    };
  }

  const input = pricePart(usage.inputTokens, price.inputTokenPrice);
  const output = pricePart(usage.outputTokens + usage.reasoningTokens, price.outputTokenPrice);
  const cacheRead = pricePart(
    usage.cacheReadTokens,
    price.cachedInputTokenPrice ?? price.inputTokenPrice
  );
  const cacheWrite = pricePart(
    usage.cacheWriteTokens,
    price.cacheWriteTokenPrice ?? price.inputTokenPrice
  );
  const amount = input + output + cacheRead + cacheWrite;

  return {
    amount,
    currency: price.currency,
    estimated: usage.estimatedTokens,
    status: usage.estimatedTokens ? "estimated" : "exact",
    explanation: usage.estimatedTokens
      ? "Token counts were estimated before applying configured prices."
      : "Exact token counts were multiplied by configured prices."
  };
}
