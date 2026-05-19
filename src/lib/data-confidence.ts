export type DataConfidenceGrade = "high" | "medium" | "low" | "empty";

export type DataConfidenceInput = {
  totalInteractions: number;
  exactTokenInteractions: number;
  tokenizerEstimateInteractions: number;
  simpleEstimateInteractions: number;
  unknownTokenInteractions: number;
  pricedCostInteractions: number;
  unknownCostInteractions: number;
  parserConfidence: number | null;
  scanFreshness: "no-scan" | "no-successful-scan" | "fresh" | "stale";
};

export type DataConfidenceScore = {
  score: number;
  grade: DataConfidenceGrade;
  drivers: string[];
  repairHref: string | null;
};

function ratio(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, value / total));
}

function grade(score: number, totalInteractions: number): DataConfidenceGrade {
  if (totalInteractions <= 0) return "empty";
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  return "low";
}

export function buildDataConfidenceScore(input: DataConfidenceInput): DataConfidenceScore {
  const total = input.totalInteractions;
  const exactRatio = ratio(input.exactTokenInteractions, total);
  const tokenizerRatio = ratio(input.tokenizerEstimateInteractions, total);
  const simpleRatio = ratio(input.simpleEstimateInteractions, total);
  const unknownTokenRatio = ratio(input.unknownTokenInteractions, total);
  const pricedRatio = ratio(input.pricedCostInteractions, total);
  const unknownCostRatio = ratio(input.unknownCostInteractions, total);
  const parser = input.parserConfidence == null ? 0.7 : Math.max(0, Math.min(1, input.parserConfidence));
  const freshness =
    input.scanFreshness === "fresh"
      ? 1
      : input.scanFreshness === "stale"
        ? 0.65
        : input.scanFreshness === "no-successful-scan"
          ? 0.3
          : 0;

  const tokenScore = exactRatio * 100 + tokenizerRatio * 82 + simpleRatio * 55 - unknownTokenRatio * 35;
  const costScore = pricedRatio * 100 - unknownCostRatio * 45;
  const score = Math.max(
    0,
    Math.min(100, Math.round(tokenScore * 0.36 + costScore * 0.34 + parser * 100 * 0.18 + freshness * 100 * 0.12))
  );

  const drivers = [
    `Token coverage: ${Math.round((exactRatio + tokenizerRatio) * 100)}% exact or tokenizer-estimated.`,
    `Cost coverage: ${Math.round(pricedRatio * 100)}% priced.`
  ];

  if (input.unknownCostInteractions > 0) {
    drivers.push(`Repair unknown costs for ${input.unknownCostInteractions.toLocaleString()} interactions.`);
  }
  if (input.simpleEstimateInteractions > 0 || input.unknownTokenInteractions > 0) {
    drivers.push("Improve parser coverage to reduce simple or unknown token estimates.");
  }
  if (input.scanFreshness === "stale") {
    drivers.push("Run a fresh scan.");
  }
  if (input.parserConfidence != null && input.parserConfidence < 0.75) {
    drivers.push("Review parser confidence for this evidence path.");
  }

  return {
    score,
    grade: grade(score, total),
    drivers,
    repairHref: input.unknownCostInteractions > 0 ? "/repair" : null
  };
}
