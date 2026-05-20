import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, Search, Settings2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PeriodFilter } from "@/components/period-filter";
import { RepairBulkActions } from "@/components/repair-bulk-actions";
import { RepairStateControl } from "@/components/repair-state-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, MonoText, PageHeader } from "@/components/ui/typography";
import { dateRangeQueryParams, mergeHrefParams, resolveDateRange } from "@/src/lib/date-range";
import { formatTokens } from "@/src/lib/format";
import {
  buildUnknownCostRepairWorkbench,
  type UnknownCostRepairWorkbench,
  type UnknownCostRepairWorkbenchGroup,
  type UnknownCostRepairStatus
} from "@/src/lib/unknown-cost-repair";

export const dynamic = "force-dynamic";

const REPAIR_PAGE_GROUP_LIMIT = 25;

function causeVariant(cause: UnknownCostRepairWorkbenchGroup["cause"]) {
  if (cause === "missing pricing") return "warning";
  if (cause === "missing model" || cause === "missing token count") return "destructive";
  return "secondary";
}

function suggestionLabel(group: UnknownCostRepairWorkbenchGroup) {
  if (group.suggestion.suggestedModel) return group.suggestion.suggestedModel;
  if (group.cause === "missing pricing") return "Add model rate";
  return "Review parser";
}

function causeLabel(cause: UnknownCostRepairWorkbenchGroup["cause"]) {
  if (cause === "missing pricing") return "missing model rate";
  return cause;
}

function stateCopy(status: UnknownCostRepairStatus) {
  if (status === "resolved") return "Resolved: verified locally. Recalculate to confirm this group leaves unknown cost.";
  if (status === "ignored") return "Ignored: preserved as evidence but removed from active repair focus.";
  if (status === "needs-parser-review") return "Parser review: source metadata needs inspection before pricing can be trusted.";
  return "Unresolved: still part of active unknown-cost repair.";
}

function repairImpactCopy(group: UnknownCostRepairWorkbenchGroup | null) {
  if (!group) return "No active repair group is selected. Cost coverage is clear or this period has no visible unknown-cost groups.";
  if (group.cause === "missing pricing") {
    return "After setting the model rate and recalculating, these interactions can move from unknown cost into priced or estimated cost totals.";
  }
  if (group.cause === "missing model") {
    return "After parser review records a usable model name, TokenTrace can match the interaction to model rates and remove the model gap.";
  }
  if (group.cause === "missing token count") {
    return "After parser review recovers usable token counts, the interaction can be priced instead of staying unknown.";
  }
  if (group.cause === "parser review") {
    return "After parser review confirms the source shape, supported rows can be imported with clearer token and cost confidence.";
  }
  return "After the missing metadata is corrected and recalculated, this group should leave unresolved unknown-cost repair.";
}

function topCause(groups: UnknownCostRepairWorkbenchGroup[]) {
  const byCause = new Map<UnknownCostRepairWorkbenchGroup["cause"], number>();
  for (const group of groups) {
    byCause.set(group.cause, (byCause.get(group.cause) ?? 0) + group.interactions);
  }
  const [cause, interactions] = [...byCause.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return cause ? { cause, interactions } : null;
}

function SummaryItem({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone?: "primary" | "warning" | "success" | "muted";
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-800"
      : tone === "success"
        ? "text-emerald-800"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";

  return (
    <div className="min-w-32 border-t px-4 py-3 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <FieldLabel>{label}</FieldLabel>
      <DataValue className={toneClass} size="md">{value.toLocaleString()}</DataValue>
    </div>
  );
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function RepairFlowSteps() {
  const steps = [
    ["Problem", "Find the unknown-cost group and its cause."],
    ["Evidence", "Open source sessions, parser state, and model-rate context."],
    ["Fix", "Set model rate or review parser metadata."],
    ["Recalculate", "Run scan or refresh model rates after the fix."],
    ["Verified", "Confirm the item leaves unresolved repair."]
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guided repair flow</CardTitle>
        <CardDescription>Move left to right so every unknown-cost item ends with a checked local result.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div className="grid min-w-[46rem] grid-cols-5 divide-x border-t">
          {steps.map(([label, detail], index) => (
            <div key={label} className="p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border bg-muted/40 text-xs font-semibold tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RepairGuidancePanel({
  workbench,
  rangeLinkParams
}: {
  workbench: UnknownCostRepairWorkbench;
  rangeLinkParams: Record<string, string | undefined>;
}) {
  const cause = topCause(workbench.groups);
  const nextRepair =
    workbench.groups.find((group) => group.state === "unresolved") ??
    workbench.groups.find((group) => group.state === "needs-parser-review") ??
    workbench.groups[0] ??
    null;
  const nextRepairHref = nextRepair
    ? nextRepair.pricingHref
      ? mergeHrefParams(nextRepair.pricingHref, { returnTo: mergeHrefParams(nextRepair.itemHref, rangeLinkParams) })
      : mergeHrefParams(nextRepair.repairHref, rangeLinkParams)
    : "/pricing";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Repair decision</CardTitle>
        <CardDescription>Start with the highest-impact cause, then verify what will change after the repair.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div className="min-w-0 rounded-md border bg-muted/20 p-3">
          <FieldLabel>Top cause</FieldLabel>
          <div className="mt-1 text-sm font-semibold">{cause ? causeLabel(cause.cause) : "No active cause"}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {cause ? `${cause.interactions.toLocaleString()} visible interactions are blocked by this cause.` : "No unknown-cost groups are visible for this period."}
          </p>
        </div>
        <div className="min-w-0 rounded-md border bg-muted/20 p-3">
          <FieldLabel>Next best repair</FieldLabel>
          <div className="mt-1 text-sm font-semibold">{nextRepair ? suggestionLabel(nextRepair) : "No repair needed"}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {nextRepair ? `${nextRepair.interactions.toLocaleString()} interactions from ${nextRepair.tool} / ${nextRepair.model}.` : "Cost coverage is clear for the selected period."}
          </p>
          {nextRepair ? (
            <Link href={nextRepairHref} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
              {nextRepair.pricingHref ? "Set model rate" : "Review parser"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        <div className="min-w-0 rounded-md border bg-muted/20 p-3">
          <FieldLabel>What changes after repair</FieldLabel>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{repairImpactCopy(nextRepair)}</p>
          {nextRepair ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{stateCopy(nextRepair.state)}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function FocusedRepairPanel({
  group,
  focusKey,
  rangeLinkParams
}: {
  group: UnknownCostRepairWorkbenchGroup | null;
  focusKey: string;
  rangeLinkParams: Record<string, string | undefined>;
}) {
  if (!group) {
    return (
      <Card className="border-amber-300 bg-amber-50/50">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Repair item not found</CardTitle>
            <CardDescription>
              This focused repair link no longer matches an unresolved unknown-cost group.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={mergeHrefParams("/repair", rangeLinkParams)}>
              Open repair <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <MonoText className="block truncate text-muted-foreground">{focusKey}</MonoText>
        </CardContent>
      </Card>
    );
  }

  const itemHref = mergeHrefParams(group.itemHref, rangeLinkParams);
  const repairHref = group.pricingHref
    ? mergeHrefParams(group.pricingHref, { returnTo: itemHref })
    : mergeHrefParams(group.repairHref, rangeLinkParams);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Focused Repair Item</CardTitle>
          <CardDescription>
            {group.model} / {group.tool} / {group.provider}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={causeVariant(group.cause)}>{causeLabel(group.cause)}</Badge>
          <Badge variant={group.state === "resolved" ? "success" : group.state === "needs-parser-review" ? "warning" : group.state === "ignored" ? "secondary" : "destructive"}>
            {group.state}
          </Badge>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{stateCopy(group.state)}</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid border-t sm:grid-cols-3">
          <SummaryItem label="Interactions" value={group.interactions} />
          <SummaryItem label="Sessions" value={group.sessions} />
          <div className="min-w-0 border-t px-4 py-3 first:border-t-0 sm:border-l sm:border-t-0">
            <FieldLabel>Tokens</FieldLabel>
            <DataValue size="md">{formatTokens(group.totalTokens)}</DataValue>
          </div>
        </div>
        <div className="border-t px-4 py-3">
          <FieldLabel>Suggested next step</FieldLabel>
          <div className="mt-1 text-sm font-medium">{suggestionLabel(group)}</div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {group.suggestion.confidence} confidence. {group.suggestion.reason}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t px-4 py-3">
          <Button asChild size="sm">
            <Link href={repairHref}>
            {group.pricingHref ? "Set model rate" : "Review parser"} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={mergeHrefParams(group.sourceHref, rangeLinkParams)}>View evidence</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={mergeHrefParams(group.parserHref, rangeLinkParams)}>Review parser</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type RepairPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RepairPage({ searchParams }: RepairPageProps) {
  const params = (await searchParams) ?? {};
  const range = resolveDateRange(params);
  const rangeLinkParams = dateRangeQueryParams(range);
  const focusKey = firstQueryValue(params.key);
  const workbench = buildUnknownCostRepairWorkbench(range.filters, {
    limit: REPAIR_PAGE_GROUP_LIMIT,
    requiredKey: focusKey
  });
  const visibleRepairKeys = workbench.groups.map((group) => group.key);
  const hasGroups = workbench.totalGroups > 0;
  const focusedGroup = focusKey ? workbench.groups.find((group) => group.key === focusKey) ?? null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unknown Cost Repair"
        description="Grouped local evidence for interactions that could not be priced."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={mergeHrefParams("/pricing", focusKey ? { returnTo: mergeHrefParams(`/repair?key=${encodeURIComponent(focusKey)}`, rangeLinkParams) } : {})}>
                <Settings2 className="h-4 w-4" />
                Model Rates
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={mergeHrefParams("/parser-debug", rangeLinkParams)}>
                <Search className="h-4 w-4" />
                Parsers
              </Link>
            </Button>
          </div>
        }
      />

      <PeriodFilter range={range} basePath="/repair" />

      <RepairFlowSteps />

      <RepairGuidancePanel workbench={workbench} rangeLinkParams={rangeLinkParams} />

      {focusKey ? (
        <FocusedRepairPanel group={focusedGroup} focusKey={focusKey} rangeLinkParams={rangeLinkParams} />
      ) : null}

      <Card>
        <CardContent className="p-0">
          <div className="grid sm:grid-cols-2 xl:grid-cols-5">
            <SummaryItem label="Unresolved" value={workbench.summary.unresolved} />
            <SummaryItem label="Parser review" value={workbench.summary.needsParserReview} tone="warning" />
            <SummaryItem label="Ignored" value={workbench.summary.ignored} tone="muted" />
            <SummaryItem label="Resolved" value={workbench.summary.resolved} tone="success" />
            <SummaryItem label="Interactions" value={workbench.summary.totalInteractions} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Repair Items</CardTitle>
            <CardDescription>
              Showing the highest-impact visible repair groups first. Groups stay split by cause, source file, provider, model, and tool.
            </CardDescription>
          </div>
          {hasGroups ? (
            <Badge variant="secondary">
              {workbench.hasMoreGroups
                ? `${workbench.shownGroups.toLocaleString()} of ${workbench.totalGroups.toLocaleString()} groups`
                : `${workbench.totalGroups.toLocaleString()} groups`}
            </Badge>
          ) : (
            <Badge variant="success">priced</Badge>
          )}
        </CardHeader>
        <CardContent className="table-scroll overflow-x-auto">
          {hasGroups ? (
            <div className="space-y-3">
              {workbench.hasMoreGroups ? (
                <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  The table is capped at {REPAIR_PAGE_GROUP_LIMIT.toLocaleString()} visible repair groups so the page stays responsive on large local databases.
                  Narrow the period or open a focused repair link to inspect a specific group.
                </div>
              ) : null}
              <RepairBulkActions
                keys={visibleRepairKeys}
                modelRatesHref={mergeHrefParams("/pricing", rangeLinkParams)}
                scanHealthHref="/diagnostics"
              />
              <Table className="min-w-[84rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>State</TableHead>
                    <TableHead>Cause</TableHead>
                    <TableHead className="min-w-56">Model</TableHead>
                    <TableHead className="min-w-72">Suggestion</TableHead>
                    <TableHead className="min-w-80">Source</TableHead>
                    <TableHead>Interactions</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead className="min-w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workbench.groups.map((group) => (
                    <TableRow key={group.key} className={focusKey === group.key ? "bg-muted/40" : undefined}>
                      <TableCell className="align-top">
                        <RepairStateControl
                          repairKey={group.key}
                          initialStatus={group.review.status}
                          initialNotes={group.review.notes}
                          sourceFile={group.sourceFile}
                          model={group.model}
                          provider={group.provider}
                          cause={group.cause}
                        />
                        <p className="mt-2 max-w-48 text-[11px] leading-4 text-muted-foreground">{stateCopy(group.state)}</p>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={causeVariant(group.cause)}>{causeLabel(group.cause)}</Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium">{group.model}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{group.provider} / {group.tool}</div>
                      </TableCell>
                      <TableCell className="min-w-72 max-w-80 align-top">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {group.suggestion.suggestedModel ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <CircleDashed className="h-4 w-4 text-muted-foreground" />
                          )}
                          {suggestionLabel(group)}
                        </div>
                        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {group.suggestion.confidence} confidence. {group.suggestion.reason}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-96 align-top">
                        <Link href={mergeHrefParams(group.sourceHref, rangeLinkParams)} title={group.sourceFile}>
                          <MonoText className="block truncate text-xs text-muted-foreground underline-offset-4 hover:underline">
                            {group.sourceFile}
                          </MonoText>
                        </Link>
                      </TableCell>
                      <TableCell className="align-top">{group.interactions.toLocaleString()}</TableCell>
                      <TableCell className="min-w-28 align-top">
                        <div>{formatTokens(group.totalTokens)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatTokens(group.inputTokens)} in, {formatTokens(group.outputTokens)} out
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={
                              group.pricingHref
                                ? mergeHrefParams(group.pricingHref, { returnTo: mergeHrefParams(group.itemHref, rangeLinkParams) })
                                : mergeHrefParams(group.repairHref, rangeLinkParams)
                            }
                            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {group.pricingHref ? "Set model rate" : "Review parser"} <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                          <Link href={mergeHrefParams(group.itemHref, rangeLinkParams)} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                            Open repair
                          </Link>
                          <Link href={mergeHrefParams(group.sourceHref, rangeLinkParams)} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                            View evidence
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No unknown-cost repair items"
              description="Cost coverage is clear for the selected period. If cost is still missing, refresh model rates or inspect Scan Health."
              actions={[
                { label: "Set model rate", href: "/pricing" },
                { label: "Open Scan Health", href: "/diagnostics", variant: "outline" }
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
