export type TokenEstimate = {
  tokens: number;
  method: "tokenizer" | "simple";
  confidence: "tokenizer estimate" | "simple estimate";
  tokenizerFamily: "openai-bpe" | "anthropic-claude" | "generic";
};

export type TokenEstimateContext = {
  providerId?: string | null;
  modelName?: string | null;
};

function tokenizerFamily(context: TokenEstimateContext = {}): TokenEstimate["tokenizerFamily"] {
  const provider = (context.providerId ?? "").toLowerCase();
  const model = (context.modelName ?? "").toLowerCase();

  if (
    provider.includes("openai") ||
    provider.includes("codex") ||
    /^(gpt|o[0-9]|codex|chatgpt)(?:[-.]|$)/.test(model)
  ) {
    return "openai-bpe";
  }

  if (provider.includes("anthropic") || model.startsWith("claude")) {
    return "anthropic-claude";
  }

  return "generic";
}

function simpleEstimate(normalized: string) {
  return Math.max(1, Math.ceil(normalized.length / 4));
}

function splitLongToken(token: string, chunkSize: number) {
  return Math.max(1, Math.ceil(token.length / chunkSize));
}

function tokenizerEstimate(normalized: string, family: TokenEstimate["tokenizerFamily"]) {
  const pieces = normalized.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];
  if (!pieces.length) return 0;

  const chunkSize = family === "anthropic-claude" ? 7 : 6;
  const base = pieces.reduce((total, piece) => {
    if (/^[\p{L}\p{N}]+$/u.test(piece)) return total + splitLongToken(piece, chunkSize);
    return total + 1;
  }, 0);
  const whitespaceOverhead = Math.floor((normalized.match(/\s+/g)?.length ?? 0) / 12);
  return Math.max(1, base + whitespaceOverhead);
}

export function estimateTokensFromText(
  text: string | null | undefined,
  context: TokenEstimateContext = {}
): TokenEstimate {
  const normalized = (text ?? "").trim();
  if (!normalized) {
    return {
      tokens: 0,
      method: "simple",
      confidence: "simple estimate",
      tokenizerFamily: "generic"
    };
  }

  const family = tokenizerFamily(context);
  if (family !== "generic") {
    return {
      tokens: tokenizerEstimate(normalized, family),
      method: "tokenizer",
      confidence: "tokenizer estimate",
      tokenizerFamily: family
    };
  }

  return {
    tokens: simpleEstimate(normalized),
    method: "simple",
    confidence: "simple estimate",
    tokenizerFamily: "generic"
  };
}

export function previewText(text: string | null | undefined, maxLength = 240) {
  const normalized = (text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}
