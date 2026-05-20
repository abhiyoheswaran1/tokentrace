import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel, MonoText } from "@/components/ui/typography";
import { SummaryItem } from "@/components/repair/repair-summary";
import { mergeHrefParams } from "@/src/lib/date-range";
import { formatTokens } from "@/src/lib/format";
import type {
  UnknownCostRepairWorkbench,
  UnknownCostRepairWorkbenchGroup,
  UnknownCostRepairStatus
} from "@/src/lib/unknown-cost-repair";

export function causeVariant(cause: UnknownCostRepairWorkbenchGroup["cause"]) {
  if (cause === "missing pricing") return "warning";
  if (cause === "missing model" || cause === "missing token count") return "destructive";
  return "secondary";
}

export function suggestionLabel(group: UnknownCostRepairWorkbenchGroup) {
  if (group.suggestion.suggestedModel) return group.suggestion.suggestedModel;
  return group.primaryAction.label;
}

export function causeLabel(cause: UnknownCostRepairWorkbenchGroup["cause"]) {
  if (cause === "missing pricing") return "missing model rate";
  return cause;
}

export function stateCopy(status: UnknownCostRepairStatus) {
  if (status === "resolved") return "Resolved: verified locally. Recalculate to confirm this group leaves unknown cost.";
  if (status === "ignored") return "Ignored: preserved as evidence but removed from active repair focus.";
  if (status === "needs-parser-review") return "Parser review: source metadata needs inspection before pricing can be trusted.";
  return "Unresolved: still part of active unknown-cost repair.";
}

function repairImpactCopy(group: UnknownCostRepairWorkbenchGroup | null) {
  if (!group) return "No active repair group is selected. Cost coverage is clear or this period has no visible unknown-cost groups.";
  return group.impact;
}

export function repairActionHref(
  group: UnknownCostRepairWorkbenchGroup,
  action: UnknownCostRepairWorkbenchGroup["primaryAction"],
  rangeLinkParams: Record<string, string | undefined>
) {
  if (action.kind === "set-model-rate") {
    return mergeHrefParams(action.href, { returnTo: mergeHrefParams(group.itemHref, rangeLinkParams) });
  }
  return mergeHrefParams(action.href, rangeLinkParams);
}

function topCause(groups: UnknownCostRepairWorkbenchGroup[]) {
  const byCause = new Map<UnknownCostRepairWorkbenchGroup["cause"], number>();
  for (const group of groups) {
    byCause.set(group.cause, (byCause.get(group.cause) ?? 0) + group.interactions);
  }
  const [cause, interactions] = [...byCause.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return cause ? { cause, interactions } : null;
}

export function RepairFlowSteps() {
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
        <div className="grid divide-y border-t sm:min-w-[46rem] sm:grid-cols-5 sm:divide-x sm:divide-y-0">
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

export function RepairGuidancePanel({
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
  const nextRepairHref = nextRepair ? repairActionHref(nextRepair, nextRepair.primaryAction, rangeLinkParams) : "/pricing";

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
          <div className="mt-1 text-sm font-semibold">{nextRepair ? nextRepair.primaryAction.label : "No repair needed"}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {nextRepair ? `${nextRepair.interactions.toLocaleString()} interactions from ${nextRepair.tool} / ${nextRepair.model}.` : "Cost coverage is clear for the selected period."}
          </p>
          {nextRepair ? (
            <Link href={nextRepairHref} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
              {nextRepair.primaryAction.label}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        <div className="min-w-0 rounded-md border bg-muted/20 p-3">
          <FieldLabel>What changes after repair</FieldLabel>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{repairImpactCopy(nextRepair)}</p>
          {nextRepair ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{nextRepair.primaryAction.expectedChange}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function FocusedRepairPanel({
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
            <CardDescription>This focused repair link no longer matches an unresolved unknown-cost group.</CardDescription>
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

  const repairHref = repairActionHref(group, group.primaryAction, rangeLinkParams);

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
            <div className="text-2xl font-semibold tracking-tight">{formatTokens(group.totalTokens)}</div>
          </div>
        </div>
        <div className="border-t px-4 py-3">
          <FieldLabel>Suggested next step</FieldLabel>
          <div className="mt-1 text-sm font-medium">{group.primaryAction.label}</div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {group.primaryAction.description} {group.primaryAction.expectedChange}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{group.resolvedStateLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 border-t px-4 py-3">
          <Button asChild size="sm">
            <Link href={repairHref}>
              {group.primaryAction.label} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {group.secondaryActions.slice(0, 3).map((action) => (
            <Button key={`${action.kind}:${action.href}`} asChild variant="outline" size="sm">
              <Link href={repairActionHref(group, action, rangeLinkParams)}>{action.label}</Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
