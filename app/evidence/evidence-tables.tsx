import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonoText } from "@/components/ui/typography";
import { mergeHrefParams } from "@/src/lib/date-range";
import type { EvidenceTrail, EvidenceTrailSession } from "@/src/lib/evidence-trail";
import { formatCurrency, formatExactTokens, percent } from "@/src/lib/format";

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

export function TopSourceFilesCard({
  sourceFiles,
  rangeLinkParams
}: {
  sourceFiles: EvidenceTrail["sourceFiles"];
  rangeLinkParams: Record<string, string | undefined>;
}) {
  return (
    <Card id="top-source-files">
      <CardHeader>
        <CardTitle>Top Source Files</CardTitle>
        <CardDescription>Largest contributing local files for the same metric definition.</CardDescription>
      </CardHeader>
      <CardContent className="table-scroll">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Interactions</TableHead>
              <TableHead>Unknown cost</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sourceFiles.length ? (
              sourceFiles.map((source) => (
                <TableRow key={source.sourceFile}>
                  <TableCell className="max-w-96">
                    <Link href={mergeHrefParams(source.sourceHref, rangeLinkParams)} title={source.sourceFile}>
                      <MonoText className="block truncate text-muted-foreground underline-offset-4 hover:underline">
                        {source.sourceFile}
                      </MonoText>
                    </Link>
                  </TableCell>
                  <TableCell>{formatExactTokens(source.tokens)}</TableCell>
                  <TableCell>{source.interactions.toLocaleString()}</TableCell>
                  <TableCell>{source.unknownCostInteractions.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link href={mergeHrefParams(source.sourceHref, rangeLinkParams)} className="font-medium text-primary underline-offset-4 hover:underline">
                        Open Sessions
                      </Link>
                      <Link href={mergeHrefParams(source.parserHref, rangeLinkParams)} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                        Review parser
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                  No source-file evidence is available for this metric yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SessionEvidenceCard({
  sessions,
  rangeLinkParams,
  pricingReturnParams
}: {
  sessions: EvidenceTrailSession[];
  rangeLinkParams: Record<string, string | undefined>;
  pricingReturnParams: Record<string, string | undefined>;
}) {
  return (
    <Card id="session-evidence">
      <CardHeader>
        <CardTitle>Session, Source, Parser, And Model Rate Evidence</CardTitle>
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
              <TableHead>Model rates</TableHead>
              <TableHead>Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length ? (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="min-w-64">
                    <Link href={mergeHrefParams(session.sessionHref, rangeLinkParams)} className="font-medium text-primary underline-offset-4 hover:underline">
                      {session.title}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {session.tool} / {session.provider} / {session.project}
                    </div>
                  </TableCell>
                  <TableCell>{formatExactTokens(session.totalTokens)}</TableCell>
                  <TableCell>{formatCurrency(session.cost)}</TableCell>
                  <TableCell className="max-w-80">
                    <Link href={mergeHrefParams(session.sourceHref, rangeLinkParams)} title={session.sourceFile}>
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
                      <Link href={mergeHrefParams(session.parserHref, rangeLinkParams)} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                        Parser <ArrowRight className="inline h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {session.parser ?? "No parser"} / {session.parserConfidence == null ? "confidence unknown" : percent(session.parserConfidence)}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-44">
                    {session.pricingHref ? (
                      <Link href={mergeHrefParams(session.pricingHref, pricingReturnParams)} className="font-medium text-primary underline-offset-4 hover:underline">
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
  );
}
