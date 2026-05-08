export type TokenEstimate = {
  tokens: number;
  method: "chars-div-4";
};

export function estimateTokensFromText(text: string | null | undefined): TokenEstimate {
  const normalized = (text ?? "").trim();
  if (!normalized) {
    return { tokens: 0, method: "chars-div-4" };
  }

  return {
    tokens: Math.max(1, Math.ceil(normalized.length / 4)),
    method: "chars-div-4"
  };
}

export function previewText(text: string | null | undefined, maxLength = 240) {
  const normalized = (text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}
