import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/typography";
import { mergeHrefParams } from "@/src/lib/date-range";
import { formatTokens } from "@/src/lib/format";
import type { UnknownCostRepairWorkbench } from "@/src/lib/unknown-cost-repair";
import { cn } from "@/src/lib/utils";

function repairCauseLabel(cause: string) {
  if (cause === "missing pricing") return "missing model rate";
  return cause;
}

export function TopRepairItemsStrip({
  groups,
  repairHref,
  rangeLinkParams
}: {
  groups: UnknownCostRepairWorkbench["groups"];
  repairHref: string;
  rangeLinkParams: Record<string, string | undefined>;
}) {
  const topGroups = groups.slice(0, 3);
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Top repair items</CardTitle>
          <CardDescription>Most important unknown-cost groups stay summarized here. The full queue lives in Repair.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={repairHref}>
            Open repair <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid border-t md:grid-cols-3">
          {topGroups.map((row, index) => {
            const primaryHref = row.pricingHref
              ? mergeHrefParams(row.pricingHref, { returnTo: mergeHrefParams(row.itemHref, rangeLinkParams) })
              : mergeHrefParams(row.repairHref, rangeLinkParams);
            return (
              <div
                key={row.key}
                className={cn("min-w-0 p-3", index > 0 ? "border-t border-border md:border-l md:border-t-0" : "")}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <FieldLabel>{repairCauseLabel(row.cause)}</FieldLabel>
                    <div className="mt-1 truncate text-sm font-semibold text-foreground">{row.model}</div>
                  </div>
                  <Badge variant={row.state === "resolved" ? "success" : row.state === "needs-parser-review" ? "warning" : row.state === "ignored" ? "secondary" : "destructive"}>
                    {row.state}
                  </Badge>
                </div>
                <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {row.interactions.toLocaleString()} interactions, {formatTokens(row.totalTokens)} tokens, {row.tool}.
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                  <Link href={primaryHref} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
                    {row.pricingHref ? "Set model rate" : "Review parser"}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <Link href={mergeHrefParams(row.itemHref, rangeLinkParams)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Open repair
                  </Link>
                  <Link href={mergeHrefParams(row.sourceHref, rangeLinkParams)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    View evidence
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
