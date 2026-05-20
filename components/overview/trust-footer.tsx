import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataValue, FieldLabel } from "@/components/ui/typography";
import type { ScanTrustData } from "@/src/lib/analytics";
import { formatDate, percent } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

function supplyChainBadgeVariant(status: ScanTrustData["health"]["supplyChain"]["status"]) {
  if (status === "passed") return "success";
  if (status === "failed") return "destructive";
  return "secondary";
}

export function OverviewTrustFooter({
  health,
  pricedModelCount
}: {
  health: ScanTrustData["health"];
  pricedModelCount: number;
}) {
  const latestScanTime = health.latestRun?.completedAt ?? health.latestRun?.startedAt ?? null;
  const costCoverage = health.costCoverage.total > 0
    ? percent(health.costCoverage.priced / health.costCoverage.total)
    : "No usage yet";
  const evidencePackHref = "/api/evidence-pack?metric=processed-tokens&format=markdown";
  const items = [
    {
      label: "Latest scan",
      value: latestScanTime ? formatDate(latestScanTime) : "No scan yet",
      detail: health.latestRun
        ? `${health.latestRun.filesScanned.toLocaleString()} files checked, ${health.latestRun.recordsImported.toLocaleString()} records imported.`
        : "Run Scan now to verify local usage.",
      href: "/settings#scan-controls",
      actionLabel: "Scan now"
    },
    {
      label: "Package IOC",
      value: health.supplyChain.status === "passed" ? "Passed" : health.supplyChain.status === "failed" ? "Needs review" : "Not run",
      detail: health.supplyChain.summary,
      href: "/diagnostics#supply-chain",
      actionLabel: "Open Scan Health",
      badge: health.supplyChain.status
    },
    {
      label: "Model rates",
      value: `${pricedModelCount.toLocaleString()} configured`,
      detail: `${costCoverage} of selected interactions have priced or estimated cost.`,
      href: "/pricing",
      actionLabel: "Set model rate"
    },
    {
      label: "Evidence packs",
      value: "Available",
      detail: "Export privacy-safe totals, confidence drivers, parser notes, and model-rate state.",
      href: evidencePackHref,
      actionLabel: "Export pack"
    }
  ];

  return (
    <Card className="bg-muted/10">
      <CardContent className="p-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Last verified</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Trust checks for the totals above, kept close to the numbers they explain.
            </p>
          </div>
          <Badge variant={health.tone === "success" ? "success" : health.tone === "destructive" ? "destructive" : health.tone === "warning" ? "warning" : "secondary"}>
            {health.headline}
          </Badge>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4">
          {items.map((item, index) => (
            <div key={item.label} className={cn("min-w-0 p-3", index > 0 ? "border-t md:border-l md:border-t-0" : "")}>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <FieldLabel>{item.label}</FieldLabel>
                {item.badge ? <Badge variant={supplyChainBadgeVariant(item.badge)}>{item.badge}</Badge> : null}
              </div>
              <DataValue className="mt-1" size="sm">{item.value}</DataValue>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
              <Link href={item.href} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
                {item.actionLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
