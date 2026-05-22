import Link from "next/link";
import { ArrowRight, Coins, Database, Gauge, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/typography";
import type { AccountingInvariantReport } from "@/src/lib/accounting-invariants";
import type { AnalyticsData } from "@/src/lib/analytics";
import type { DoctorReport } from "@/src/lib/doctor";
import { formatTokens, percent } from "@/src/lib/format";
import type { PostSessionReview } from "@/src/lib/post-session-review";
import { cn } from "@/src/lib/utils";

type ReviewStatus = "ready" | "review" | "blocked";

function reviewStatusVariant(state: ReviewStatus) {
  if (state === "ready") return "success";
  if (state === "blocked") return "destructive";
  return "warning";
}

function OverviewReviewStatusTile({
  label,
  value,
  detail,
  href,
  actionLabel,
  state,
  icon: Icon,
  className
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  actionLabel: "View evidence" | "Open repair" | "Set model rate" | "Review parser";
  state: ReviewStatus;
  icon: typeof Database;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-w-0 gap-3 p-3 transition-colors hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <FieldLabel className="text-foreground">{label}</FieldLabel>
          <Badge variant={reviewStatusVariant(state)}>{state}</Badge>
        </span>
        <span className="mt-1 block text-sm font-semibold text-foreground">{value}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{detail}</span>
        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 group-hover:underline">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

export function OverviewReviewStatusStrip({
  report,
  confidence,
  accountingReport,
  review,
  selectedInteractions,
  selectedCachedTokens,
  repairHref,
  processedTokensHref,
  cachedEvidenceHref
}: {
  report: DoctorReport;
  confidence: AnalyticsData["scanTrust"]["confidence"];
  accountingReport: AccountingInvariantReport;
  review: PostSessionReview;
  selectedInteractions: number;
  selectedCachedTokens: number;
  repairHref: string;
  processedTokensHref: string;
  cachedEvidenceHref: string;
}) {
  const parserReviewFiles = report.parserCoverage.parserReviewFiles + report.parserCoverage.failureFiles;
  const exactTokenShare = confidence.interactions > 0
    ? percent(confidence.exactTokenInteractions / confidence.interactions)
    : "0%";
  const costCoverage = confidence.interactions > 0
    ? percent((confidence.exactCostInteractions + confidence.estimatedCostInteractions) / confidence.interactions)
    : "0%";
  const items = [
    {
      label: "Imported usage",
      value: report.latestScan.id ? `${report.latestScan.recordsImported.toLocaleString()} imports` : "No scan",
      detail: report.latestScan.zeroImportExplanation ?? `${report.latestScan.filesScanned.toLocaleString()} files checked in the latest scan.`,
      state: report.latestScan.id ? "ready" as const : "blocked" as const,
      href: "/discovery",
      actionLabel: "View evidence" as const,
      icon: Database
    },
    {
      label: "Files to review",
      value: parserReviewFiles > 0 ? `${parserReviewFiles.toLocaleString()} files` : "No file blockers",
      detail: parserReviewFiles > 0 ? "Unsupported, failed, or low-confidence files need parser review." : "Imported files have usable parser status.",
      state: report.parserCoverage.failureFiles > 0 ? "blocked" as const : parserReviewFiles > 0 ? "review" as const : "ready" as const,
      href: parserReviewFiles > 0 ? "/parser-debug" : "/discovery",
      actionLabel: parserReviewFiles > 0 ? "Review parser" as const : "View evidence" as const,
      icon: Gauge
    },
    {
      label: "Cost coverage",
      value: report.pricing.unknown > 0 ? `${report.pricing.unknown.toLocaleString()} unknown` : costCoverage,
      detail: report.pricing.unknown > 0
        ? `${report.pricing.priced.toLocaleString()} priced interactions; unknown costs need model rates or parser repair.`
        : "All imported interactions in this view have priced or estimated cost.",
      state: report.pricing.unknown > 0 ? "blocked" as const : "ready" as const,
      href: report.pricing.unknown > 0 ? repairHref : "/pricing",
      actionLabel: report.pricing.unknown > 0 ? "Open repair" as const : "Set model rate" as const,
      icon: Coins
    },
    {
      label: "Token math",
      value: accountingReport.balanceDeltaTokens === 0 ? "Balanced" : `${formatTokens(Math.abs(accountingReport.balanceDeltaTokens))} delta`,
      detail: accountingReport.balanceDeltaTokens === 0
        ? `${exactTokenShare} of interactions have exact provider token counts.`
        : "Processed tokens do not fully match the visible input, output, reasoning, and cache buckets.",
      state: accountingReport.status === "ready" ? "ready" as const : "review" as const,
      href: processedTokensHref,
      actionLabel: "View evidence" as const,
      icon: Database
    },
    {
      label: "Session review",
      value: `${review.expensiveSessions.length.toLocaleString()} high-cost`,
      detail: `${review.newlyImportedRecords.toLocaleString()} newly imported records; ${review.parserWarnings.toLocaleString()} parser warnings in the latest review.`,
      state: review.parserWarnings > 0 || review.unknownCostInteractions > 0 ? "review" as const : "ready" as const,
      href: "/sessions",
      actionLabel: "View evidence" as const,
      icon: MessageSquare
    },
    {
      label: "Privacy boundary",
      value: `${report.supportMatrix.summary.stable} stable checks`,
      detail: selectedCachedTokens > 0
        ? `${formatTokens(selectedCachedTokens)} cache tokens counted without reading private prompts.`
        : selectedInteractions > 0 ? "TokenTrace uses local files and does not add telemetry." : "Scan usage before privacy and cache checks appear.",
      state: "ready" as const,
      href: cachedEvidenceHref,
      actionLabel: "View evidence" as const,
      icon: Gauge
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Review Status</CardTitle>
          <CardDescription>Compact checks for imported usage, files, cost coverage, token math, and local boundaries.</CardDescription>
        </div>
        <Badge variant={items.some((item) => item.state === "blocked") ? "destructive" : items.some((item) => item.state === "review") ? "warning" : "success"}>
          {items.some((item) => item.state === "blocked") ? "needs repair" : items.some((item) => item.state === "review") ? "review" : "ready"}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid border-t md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <OverviewReviewStatusTile
              key={item.label}
              {...item}
              className={cn(index > 0 ? "border-t border-border md:border-l md:border-t-0" : "", index % 3 === 0 ? "xl:border-l-0" : "xl:border-l")}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
