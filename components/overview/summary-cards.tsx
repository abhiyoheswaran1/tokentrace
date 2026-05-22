import Link from "next/link";
import { ArrowRight, Coins, Database, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { DataValue, FieldLabel } from "@/components/ui/typography";
import { formatCurrency, formatTokens } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

function CostSessionsMetricPane({
  label,
  value,
  detailItems,
  href,
  actionLabel,
  secondaryHref,
  secondaryActionLabel,
  icon: Icon,
  className,
  valueClassName,
  trustLabel,
  trustDetail
}: {
  label: string;
  value: string;
  detailItems: string[];
  href: string;
  actionLabel: string;
  secondaryHref?: string;
  secondaryActionLabel?: string;
  icon: typeof Database;
  className?: string;
  valueClassName?: string;
  trustLabel: string;
  trustDetail: string;
}) {
  return (
    <section
      className={cn(
        "cost-sessions-section grid min-w-0 grid-rows-[auto_auto_auto_auto_1fr_auto] p-4 md:row-span-6 md:grid-rows-subgrid",
        className
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <FieldLabel className="text-foreground">{label}</FieldLabel>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3">
        <DataValue size="lg" className={cn("wrap-break-word leading-none", valueClassName)}>{value}</DataValue>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-x-2 gap-y-1 text-xs leading-snug text-muted-foreground">
        {detailItems.map((item, index) => (
          <span key={item} className="inline-flex min-w-0 items-center gap-2">
            <span className="min-w-0">{item}</span>
            {index < detailItems.length - 1 ? <span className="hidden text-border sm:inline">/</span> : null}
          </span>
        ))}
      </div>

      <p aria-label={trustLabel} className="mt-3 border-t pt-2 text-xs leading-5 text-muted-foreground">
        <span className="font-medium text-foreground">Why this number:</span>{" "}
        <span>{trustDetail}</span>
      </p>

      <div aria-hidden="true" />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-4">
        <Link href={href} className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        {secondaryHref ? (
          <Link href={secondaryHref} className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {secondaryActionLabel ?? "View details"}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

type CostSessionsSummary = {
  totalCost: number;
  exactCost: number;
  estimatedCost: number;
  unknownCostInteractions: number;
  sessions: number;
  interactions: number;
};

export function CostSessionsCard({
  summary,
  costHref,
  costActionLabel,
  unknownCostEvidenceHref,
  sessionsHref
}: {
  summary: CostSessionsSummary;
  costHref: string;
  costActionLabel: string;
  unknownCostEvidenceHref?: string;
  sessionsHref: string;
}) {
  return (
    <Card className="cost-sessions-card flex h-full flex-col overflow-hidden md:col-span-2 xl:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <CardTitle>Cost & Sessions</CardTitle>
          <HelpTooltip
            id="cost-sessions-help"
            label="Cost & Sessions"
            description="Cost is calculated from editable provider model rates. Unknown cost means a model rate or usable token count is missing. Sessions count imported local CLI sessions and interactions in the selected period."
          />
        </div>
        <CardDescription>Model-rate trust and imported activity in one place.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0">
        <div className="grid flex-1 border-t md:grid-cols-2 md:grid-rows-[auto_auto_auto_auto_1fr_auto]">
          <CostSessionsMetricPane
            label="Cost"
            value={formatCurrency(summary.totalCost)}
            valueClassName="wrap-break-word text-2xl"
            detailItems={[
              `${formatCurrency(summary.exactCost)} exact`,
              `${formatCurrency(summary.estimatedCost)} estimated`,
              `${summary.unknownCostInteractions.toLocaleString()} unknown`
            ]}
            href={costHref}
            actionLabel={costActionLabel}
            secondaryHref={unknownCostEvidenceHref}
            secondaryActionLabel="View evidence"
            trustLabel="Cost trust"
            trustDetail="Exact, estimated, and unknown costs stay split."
            icon={Coins}
          />
          <CostSessionsMetricPane
            className="border-t md:border-l md:border-t-0"
            label="Sessions"
            value={summary.sessions.toLocaleString()}
            detailItems={[`${summary.interactions.toLocaleString()} interactions`]}
            href={sessionsHref}
            actionLabel="View evidence"
            trustLabel="Session trust"
            trustDetail="Scan freshness is shown in Review Status."
            icon={MessageSquare}
          />
        </div>
      </CardContent>
    </Card>
  );
}

type TokenAccountingSummary = {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  nonCachedTokens: number;
  cachedTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

function TokenAccountingSlice({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 border-t p-3 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0">
      <FieldLabel>{label}</FieldLabel>
      <DataValue className="mt-1 wrap-break-word leading-none" size="md">{value}</DataValue>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function TokenAccountingCard({
  summary,
  processedHref,
  freshHref,
  cacheHref
}: {
  summary: TokenAccountingSummary;
  processedHref: string;
  freshHref: string;
  cacheHref: string;
}) {
  const evidenceActions = [
    { label: "Processed", href: processedHref },
    { label: "Fresh", href: freshHref },
    { label: "Cache", href: cacheHref }
  ];

  return (
    <Card className="flex h-full flex-col overflow-hidden md:col-span-2 xl:col-span-4">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <CardTitle className="leading-tight">Token Accounting</CardTitle>
            <HelpTooltip
              id="token-accounting-help"
              label="Token Accounting"
              description="Processed tokens combine fresh input, output, reasoning, and cache read/write tokens. Fresh and cache totals are shown separately so high cache use is not mistaken for live context size."
            />
          </div>
          <CardDescription className="mt-1">
            Processed, fresh, and cache tokens share one accounting view.
          </CardDescription>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Database className="h-4 w-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <DataValue size="lg" className="wrap-break-word text-3xl leading-none">{formatTokens(summary.totalTokens)}</DataValue>
        <div className="mt-1 text-sm font-medium text-foreground">processed tokens</div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-snug text-muted-foreground">
          {[
            `${formatTokens(summary.inputTokens)} input`,
            `${formatTokens(summary.outputTokens)} output`,
            `${formatTokens(summary.reasoningTokens)} reasoning`,
            `${formatTokens(summary.cachedTokens)} cached`
          ].map((item, index, items) => (
            <span key={item} className="inline-flex min-w-0 items-center gap-2">
              <span className="min-w-0">{item}</span>
              {index < items.length - 1 ? <span className="hidden text-border sm:inline">/</span> : null}
            </span>
          ))}
        </div>

        <div className="mt-4 grid overflow-hidden rounded-md border border-border md:grid-cols-3">
          <TokenAccountingSlice
            label="Processed"
            value={formatTokens(summary.totalTokens)}
            detail="Fresh work, cache read/write, and reasoning tokens counted together."
          />
          <TokenAccountingSlice
            label="Fresh / non-cache"
            value={formatTokens(summary.nonCachedTokens)}
            detail={`${formatTokens(summary.inputTokens)} input / ${formatTokens(summary.outputTokens)} output / ${formatTokens(summary.reasoningTokens)} reasoning`}
          />
          <TokenAccountingSlice
            label="Cache"
            value={formatTokens(summary.cachedTokens)}
            detail={`${formatTokens(summary.cacheReadTokens)} read / ${formatTokens(summary.cacheWriteTokens)} write`}
          />
        </div>

        <p className="mt-3 border-t pt-2 text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">Why this number:</span>{" "}
          <span>
            Includes cache read/write and reasoning tokens. Fresh excludes cache, and cache is split into read/write so large totals are not mistaken for live context size.
          </span>
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4">
          {evidenceActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              aria-label={`View ${action.label.toLowerCase()} token evidence`}
              className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              <span className="text-muted-foreground">{action.label}</span>
              <span>View evidence</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
