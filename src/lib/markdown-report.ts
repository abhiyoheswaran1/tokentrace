import { formatCurrency, formatTokens } from "@/src/lib/format";

export type MarkdownReportInput = {
  title: string;
  generatedAt: string;
  scopeLabel: string;
  digest: {
    totalTokens: number;
    totalCost: number;
    unknownCostInteractions: number;
    topReviewTitle: string;
    topProjectName: string;
  };
  postSessionReview: {
    headline: string;
    parserWarnings: number;
    unknownCostInteractions: number;
    expensiveSessionTitles: string[];
  };
  accounting: {
    status: string;
    processedTokens: number;
    nonCacheTokens: number;
    cachedTokens: number;
    balanceDeltaTokens: number;
  };
};

function list(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function renderMarkdownReport(input: MarkdownReportInput) {
  const expensive =
    input.postSessionReview.expensiveSessionTitles.length > 0
      ? input.postSessionReview.expensiveSessionTitles.join(", ")
      : "None";

  return [
    `# ${input.title}`,
    "",
    `Generated: ${input.generatedAt}`,
    `Scope: ${input.scopeLabel}`,
    "",
    "## Usage Digest",
    list([
      `Tokens: ${formatTokens(input.digest.totalTokens)}`,
      `Cost: ${formatCurrency(input.digest.totalCost)}`,
      `Unknown cost interactions: ${input.digest.unknownCostInteractions.toLocaleString()}`,
      `Top review: ${input.digest.topReviewTitle}`,
      `Top project: ${input.digest.topProjectName}`
    ]),
    "",
    "## Post-Session Review",
    list([
      input.postSessionReview.headline,
      `Parser warnings: ${input.postSessionReview.parserWarnings.toLocaleString()}`,
      `Unknown cost interactions: ${input.postSessionReview.unknownCostInteractions.toLocaleString()}`,
      `Expensive sessions: ${expensive}`
    ]),
    "",
    "## Accounting",
    list([
      `Status: ${input.accounting.status}`,
      `Processed tokens: ${formatTokens(input.accounting.processedTokens)}`,
      `Non-cache tokens: ${formatTokens(input.accounting.nonCacheTokens)}`,
      `Cached tokens: ${formatTokens(input.accounting.cachedTokens)}`,
      `Bucket delta: ${formatTokens(Math.abs(input.accounting.balanceDeltaTokens))}`
    ])
  ].join("\n");
}
