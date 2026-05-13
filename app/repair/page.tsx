import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, Search, Settings2 } from "lucide-react";
import { PeriodFilter } from "@/components/period-filter";
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
  type UnknownCostRepairWorkbenchGroup
} from "@/src/lib/unknown-cost-repair";

export const dynamic = "force-dynamic";

function causeVariant(cause: UnknownCostRepairWorkbenchGroup["cause"]) {
  if (cause === "missing pricing") return "warning";
  if (cause === "missing model" || cause === "missing token count") return "destructive";
  return "secondary";
}

function suggestionLabel(group: UnknownCostRepairWorkbenchGroup) {
  if (group.suggestion.suggestedModel) return group.suggestion.suggestedModel;
  if (group.cause === "missing pricing") return "Add price row";
  return "Review parser";
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
              View all repair items <ArrowRight className="h-4 w-4" />
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
          <Badge variant={causeVariant(group.cause)}>{group.cause}</Badge>
          <Badge variant={group.state === "resolved" ? "success" : group.state === "needs-parser-review" ? "warning" : group.state === "ignored" ? "secondary" : "destructive"}>
            {group.state}
          </Badge>
        </div>
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
              {group.pricingHref ? "Configure price" : "Review parser"} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={mergeHrefParams(group.sourceHref, rangeLinkParams)}>Evidence</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={mergeHrefParams(group.parserHref, rangeLinkParams)}>Parser</Link>
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
  const workbench = buildUnknownCostRepairWorkbench(range.filters);
  const hasGroups = workbench.groups.length > 0;
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
                Pricing
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={mergeHrefParams("/parser-debug", rangeLinkParams)}>
                <Search className="h-4 w-4" />
                Parser debug
              </Link>
            </Button>
          </div>
        }
      />

      <PeriodFilter range={range} />

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
              Groups are split by cause, source file, provider, model, and tool so review state stays stable.
            </CardDescription>
          </div>
          {hasGroups ? (
            <Badge variant="secondary">{workbench.groups.length.toLocaleString()} groups</Badge>
          ) : (
            <Badge variant="success">priced</Badge>
          )}
        </CardHeader>
        <CardContent className="table-scroll">
          {hasGroups ? (
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
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={causeVariant(group.cause)}>{group.cause}</Badge>
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
                          Repair <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link href={mergeHrefParams(group.itemHref, rangeLinkParams)} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                          Focus
                        </Link>
                        <Link href={mergeHrefParams(group.parserHref, rangeLinkParams)} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                          Parser
                        </Link>
                        {group.pricingHref ? (
                          <Link href={mergeHrefParams(group.pricingHref, { returnTo: mergeHrefParams(group.itemHref, rangeLinkParams) })} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                            Pricing
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="border-y px-4 py-8 text-sm text-muted-foreground">
              No unknown-cost interactions are currently in the local database.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
