import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { RepairBulkActions } from "@/components/repair-bulk-actions";
import { RepairStateControl } from "@/components/repair-state-control";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonoText } from "@/components/ui/typography";
import { REPAIR_PAGE_GROUP_LIMIT } from "@/app/repair/repair-page-data";
import { mergeHrefParams } from "@/src/lib/date-range";
import { formatTokens } from "@/src/lib/format";
import type { UnknownCostRepairWorkbench, UnknownCostRepairWorkbenchGroup } from "@/src/lib/unknown-cost-repair";
import { causeLabel, causeVariant, repairActionHref, stateCopy, suggestionLabel } from "./repair-guidance";

function classificationRuleLabel(rule: UnknownCostRepairWorkbenchGroup["classification"]["rule"]) {
  if (rule === "exact-model") return "exact model";
  if (rule === "family-fragment") return "family fragment";
  if (rule === "parser-source") return "parser/source";
  return "no match";
}

function classificationVariant(
  rule: UnknownCostRepairWorkbenchGroup["classification"]["rule"]
): "success" | "secondary" | "outline" {
  if (rule === "exact-model") return "success";
  if (rule === "family-fragment") return "secondary";
  if (rule === "parser-source") return "outline";
  return "outline";
}

function ClassificationCell({ classification }: { classification: UnknownCostRepairWorkbenchGroup["classification"] }) {
  if (classification.rule === "none") {
    return (
      <div className="text-xs text-muted-foreground">No deterministic match. Review parser evidence.</div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="truncate">{classification.suggestedModel}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Badge variant={classificationVariant(classification.rule)} className="text-[10px]">
          {classificationRuleLabel(classification.rule)}
        </Badge>
        <span>{Math.round(classification.confidence * 100)}% confidence</span>
        {classification.evidence.matchedRows > 0 ? (
          <span>· {classification.evidence.matchedRows.toLocaleString()} priced rows</span>
        ) : null}
      </div>
    </div>
  );
}

function RepairItemsMobileList({
  groups,
  focusKey,
  rangeLinkParams
}: {
  groups: UnknownCostRepairWorkbenchGroup[];
  focusKey: string | undefined;
  rangeLinkParams: Record<string, string | undefined>;
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {groups.map((group) => (
        <div
          key={group.key}
          className={`rounded-md border bg-background p-3 ${focusKey === group.key ? "border-primary/50 bg-primary/5" : ""}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={causeVariant(group.cause)}>{causeLabel(group.cause)}</Badge>
                <span className="text-xs text-muted-foreground">{group.interactions.toLocaleString()} interactions</span>
              </div>
              <div className="mt-2 wrap-break-word text-sm font-medium">{group.model}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {group.provider} / {group.tool}
              </div>
            </div>
            <RepairStateControl
              repairKey={group.key}
              initialStatus={group.review.status}
              initialNotes={group.review.notes}
              sourceFile={group.sourceFile}
              model={group.model}
              provider={group.provider}
              cause={group.cause}
            />
          </div>

          <div className="mt-3 grid gap-2 rounded-md bg-muted/30 p-3 text-xs leading-5">
            <div>
              <div className="font-medium text-foreground">Next best</div>
              <div className="mt-1 text-muted-foreground">{suggestionLabel(group)}</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Auto-classify</div>
              <div className="mt-1">
                <ClassificationCell classification={group.classification} />
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Expected change</div>
              <div className="mt-1 text-muted-foreground">{group.impact}</div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Tokens</span>{" "}
              {formatTokens(group.totalTokens)} total, {formatTokens(group.inputTokens)} in, {formatTokens(group.outputTokens)} out
            </div>
            <Link href={mergeHrefParams(group.sourceHref, rangeLinkParams)} title={group.sourceFile}>
              <MonoText className="block truncate text-xs underline-offset-4 hover:underline">{group.sourceFile}</MonoText>
            </Link>
            <p>{stateCopy(group.state)}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={repairActionHref(group, group.primaryAction, rangeLinkParams)}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {group.primaryAction.label} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {group.secondaryActions.slice(0, 2).map((action) => (
              <Link
                key={`${action.kind}:${action.href}`}
                href={repairActionHref(group, action, rangeLinkParams)}
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RepairItemsTable({
  workbench,
  hasGroups,
  focusKey,
  visibleRepairKeys,
  rangeLinkParams
}: {
  workbench: UnknownCostRepairWorkbench;
  hasGroups: boolean;
  focusKey: string | undefined;
  visibleRepairKeys: string[];
  rangeLinkParams: Record<string, string | undefined>;
}) {
  return (
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
      <CardContent className="space-y-3">
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
            <RepairItemsMobileList groups={workbench.groups} focusKey={focusKey} rangeLinkParams={rangeLinkParams} />
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-336">
                <TableHeader>
                  <TableRow>
                    <TableHead>State</TableHead>
                    <TableHead>Cause</TableHead>
                    <TableHead className="min-w-56">Model</TableHead>
                    <TableHead className="min-w-72">Suggestion</TableHead>
                    <TableHead className="min-w-56">Auto-classify</TableHead>
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
                        <div className="mt-1 text-xs text-muted-foreground">
                          {group.provider} / {group.tool}
                        </div>
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
                      <TableCell className="min-w-56 align-top">
                        <ClassificationCell classification={group.classification} />
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
                            href={repairActionHref(group, group.primaryAction, rangeLinkParams)}
                            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {group.primaryAction.label} <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                          {group.secondaryActions.slice(0, 2).map((action) => (
                            <Link
                              key={`${action.kind}:${action.href}`}
                              href={repairActionHref(group, action, rangeLinkParams)}
                              className="font-medium text-muted-foreground underline-offset-4 hover:underline"
                            >
                              {action.label}
                            </Link>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
  );
}
