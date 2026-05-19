import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Database, Layers, MessageSquare, ShieldCheck, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, MonoText, PageHeader } from "@/components/ui/typography";
import { buildSessionTimeline, type SessionTimelineEventKind } from "@/src/lib/session-timeline";
import { formatCurrency, formatDate, formatDuration, formatTokens } from "@/src/lib/format";

export const dynamic = "force-dynamic";

function eventVariant(kind: SessionTimelineEventKind) {
  if (kind === "unknown-cost") return "destructive";
  if (kind === "token-spike" || kind === "model-change") return "warning";
  if (kind === "cache") return "success";
  return "secondary";
}

function eventLabel(kind: SessionTimelineEventKind) {
  return kind.replace(/-/g, " ");
}

function confidenceVariant(grade: string) {
  if (grade === "high") return "success";
  if (grade === "medium") return "warning";
  if (grade === "low") return "destructive";
  return "secondary";
}

function SummaryTile({
  label,
  value,
  detail,
  icon: Icon
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Database;
}) {
  return (
    <Card>
      <CardContent className="flex min-w-0 items-start gap-3 p-4">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <FieldLabel>{label}</FieldLabel>
          <DataValue className="mt-1 text-2xl">{value}</DataValue>
          <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function SessionTimelinePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const timeline = buildSessionTimeline(decodeURIComponent(id));
  if (!timeline) notFound();

  const sessionHref = `/sessions?source=${encodeURIComponent(timeline.session.sourceFile)}`;
  const durationMs =
    timeline.session.startedAt != null && timeline.session.endedAt != null
      ? timeline.session.endedAt - timeline.session.startedAt
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={timeline.session.title ?? "Session timeline"}
        description={`${timeline.session.tool} usage events for ${timeline.session.project}. Raw prompts and message bodies stay hidden in this view.`}
        actions={
          <Button asChild variant="outline">
            <Link href={sessionHref}>
              <ArrowLeft className="h-4 w-4" />
              Back to sessions
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Session Context</CardTitle>
          <CardDescription>
            Ordered local usage evidence from imported interaction records, parser metadata, pricing state, cache buckets, and tool calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <FieldLabel>Source file</FieldLabel>
            <MonoText className="mt-1 block truncate" title={timeline.session.sourceFile}>
              {timeline.session.sourceFile}
            </MonoText>
          </div>
          <div>
            <FieldLabel>Started</FieldLabel>
            <div className="mt-1 text-sm font-medium">{formatDate(timeline.session.startedAt)}</div>
          </div>
          <div>
            <FieldLabel>Duration</FieldLabel>
            <div className="mt-1 text-sm font-medium">{formatDuration(durationMs)}</div>
          </div>
          <div>
            <FieldLabel>Parser</FieldLabel>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium">
              {timeline.summary.parser ?? "unknown"}
              {timeline.summary.parserConfidence != null ? (
                <Badge variant="success">{Math.round(timeline.summary.parserConfidence * 100)}%</Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryTile
          label="Processed"
          value={formatTokens(timeline.summary.totalTokens)}
          detail={`${timeline.summary.interactions.toLocaleString()} interactions`}
          icon={Database}
        />
        <SummaryTile
          label="Cache"
          value={formatTokens(timeline.summary.cachedTokens)}
          detail="Read and write cache tokens"
          icon={Layers}
        />
        <SummaryTile
          label="Cost"
          value={formatCurrency(timeline.summary.cost)}
          detail={`${timeline.summary.unknownCostInteractions.toLocaleString()} unknown interactions`}
          icon={ShieldCheck}
        />
        <SummaryTile
          label="Models"
          value={timeline.summary.models.length.toLocaleString()}
          detail={timeline.summary.models.slice(0, 2).join(", ") || "No model rows"}
          icon={MessageSquare}
        />
        <SummaryTile
          label="Tool calls"
          value={timeline.summary.toolCalls.toLocaleString()}
          detail="Imported tool-call rows"
          icon={Terminal}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Session Evidence</CardTitle>
            <CardDescription>
              Why this session costs what it costs, which token counts are exact or estimated, and what can be repaired.
            </CardDescription>
          </div>
          <Badge variant={confidenceVariant(timeline.confidence.grade)}>
            {timeline.confidence.score}/100 {timeline.confidence.grade} confidence
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 border-t p-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel>Token source</FieldLabel>
              <div className="mt-1 text-sm font-medium">
                {timeline.confidence.exactTokenInteractions.toLocaleString()} exact /{" "}
                {timeline.confidence.tokenizerEstimateInteractions.toLocaleString()} tokenizer /{" "}
                {timeline.confidence.simpleEstimateInteractions.toLocaleString()} simple
              </div>
            </div>
            <div>
              <FieldLabel>Cost coverage</FieldLabel>
              <div className="mt-1 text-sm font-medium">
                {timeline.confidence.pricedCostInteractions.toLocaleString()} priced /{" "}
                {timeline.confidence.unknownCostInteractions.toLocaleString()} unknown
              </div>
            </div>
            <div>
              <FieldLabel>Spike clues</FieldLabel>
              <div className="mt-1 text-sm font-medium">
                {timeline.spikes.length ? `${timeline.spikes.length.toLocaleString()} token spikes` : "No token spikes"}
              </div>
            </div>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <FieldLabel>Next repair step</FieldLabel>
            <div className="mt-1 text-sm text-muted-foreground">
              {timeline.repair.repairHref
                ? `Unknown cost cause: ${timeline.repair.unknownCostCause}. Open the repair workbench for this source.`
                : "No session-specific cost repair is required."}
            </div>
            {timeline.repair.repairHref ? (
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={timeline.repair.repairHref}>Open repair</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Interaction rows are expanded with model changes, spikes, cache activity, unknown cost, and tool calls.</CardDescription>
        </CardHeader>
        <CardContent className="table-scroll">
          <Table className="min-w-[78rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Time</TableHead>
                <TableHead className="w-32">Event</TableHead>
                <TableHead className="w-44">Detail</TableHead>
                <TableHead className="w-36">Model</TableHead>
                <TableHead className="w-24">Role</TableHead>
                <TableHead className="w-24">Tokens</TableHead>
                <TableHead className="w-24">Cache</TableHead>
                <TableHead className="w-24">Cost</TableHead>
                <TableHead className="w-36">Confidence</TableHead>
                <TableHead className="w-28">Raw</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeline.events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{formatDate(event.timestamp)}</TableCell>
                  <TableCell>
                    <Badge variant={eventVariant(event.kind)}>{eventLabel(event.kind)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{event.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{event.detail}</div>
                  </TableCell>
                  <TableCell className="max-w-36 truncate" title={event.model ?? undefined}>{event.model ?? "unknown"}</TableCell>
                  <TableCell>{event.role ?? "unknown"}</TableCell>
                  <TableCell className="tabular-nums">{formatTokens(event.totalTokens)}</TableCell>
                  <TableCell className="tabular-nums">{formatTokens(event.cachedTokens)}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(event.cost)}</TableCell>
                  <TableCell>
                    <Badge variant={event.tokenConfidence === "exact" ? "success" : event.tokenConfidence === "unknown" ? "destructive" : "warning"}>
                      {event.tokenConfidence ?? "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {event.rawTextHidden ? "Hidden" : "Visible"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
