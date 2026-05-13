import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, MonoText, PageHeader } from "@/components/ui/typography";
import { buildEvidenceTrail, parseEvidenceMetric } from "@/src/lib/evidence-trail";
import { formatCurrency, formatExactTokens, percent } from "@/src/lib/format";

export const dynamic = "force-dynamic";

type EvidencePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function confidenceVariant(value: string) {
  if (value === "exact") return "success";
  if (value === "unknown") return "warning";
  return "secondary";
}

function parserStatusVariant(value: string | null) {
  if (value === "imported") return "success";
  if (value === "imported_with_errors") return "warning";
  if (!value) return "secondary";
  return "outline";
}

export default async function EvidencePage({ searchParams }: EvidencePageProps) {
  const params = (await searchParams) ?? {};
  const trail = buildEvidenceTrail({ metric: parseEvidenceMetric(params?.metric) });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${trail.title} Evidence`}
        description={trail.description}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Overview
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Metric Totals</CardTitle>
          <CardDescription>
            Totals use the same filtered metric definition as the session evidence below.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
            <div className="p-3">
              <FieldLabel>Tokens</FieldLabel>
              <DataValue className="mt-1" size="md">{formatExactTokens(trail.totals.tokens)}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Cost</FieldLabel>
              <DataValue className="mt-1" size="md">{formatCurrency(trail.totals.cost)}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Sessions</FieldLabel>
              <DataValue className="mt-1" size="md">{trail.totals.sessions.toLocaleString()}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Interactions</FieldLabel>
              <DataValue className="mt-1" size="md">{trail.totals.interactions.toLocaleString()}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Unknown Cost</FieldLabel>
              <DataValue className="mt-1" size="md">{trail.totals.unknownCostInteractions.toLocaleString()}</DataValue>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session, Source, Parser, And Pricing Evidence</CardTitle>
          <CardDescription>
            The table is capped at the top 100 contributing sessions; totals above include the full metric set.
          </CardDescription>
        </CardHeader>
        <CardContent className="table-scroll p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Metric Total</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Parser</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trail.sessions.length ? (
                trail.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="min-w-64">
                      <Link href={session.sessionHref} className="font-medium text-primary underline-offset-4 hover:underline">
                        {session.title}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {session.tool} / {session.provider} / {session.project}
                      </div>
                    </TableCell>
                    <TableCell>{formatExactTokens(session.totalTokens)}</TableCell>
                    <TableCell>{formatCurrency(session.cost)}</TableCell>
                    <TableCell className="max-w-80">
                      <Link href={session.sourceHref} title={session.sourceFile}>
                        <MonoText className="block truncate text-muted-foreground underline-offset-4 hover:underline">
                          {session.sourceFile}
                        </MonoText>
                      </Link>
                    </TableCell>
                    <TableCell className="min-w-44">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={parserStatusVariant(session.parserStatus)}>
                          {session.parserStatus ?? "not scanned"}
                        </Badge>
                        <Link href={session.parserHref} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                          Parser <ArrowRight className="inline h-3.5 w-3.5" />
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {session.parser ?? "No parser"} / {session.parserConfidence == null ? "confidence unknown" : percent(session.parserConfidence)}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-44">
                      {session.pricingHref ? (
                        <Link href={session.pricingHref} className="font-medium text-primary underline-offset-4 hover:underline">
                          {session.model}
                        </Link>
                      ) : (
                        <span>{session.model}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={confidenceVariant(session.tokenConfidence)}>
                          {session.tokenConfidence}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {session.interactions.toLocaleString()} interactions
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No evidence is available for this metric yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
