import Link from "next/link";
import { SessionExplorer } from "@/components/session-explorer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/typography";
import { getAnalyticsData } from "@/src/lib/analytics";
import { formatCurrency, formatTokens } from "@/src/lib/format";
import { getSavedViews } from "@/src/lib/saved-views";

export const dynamic = "force-dynamic";

export default async function SessionsPage({
  searchParams
}: {
  searchParams?: Promise<{
    project?: string;
    tool?: string;
    model?: string;
    query?: string;
    source?: string;
    exact?: "all" | "exact" | "estimated";
    cost?: "all" | "priced" | "unknown";
    from?: string;
    to?: string;
    highCost?: string;
    cache?: string;
  }>;
}) {
  const params = await searchParams;
  const data = getAnalyticsData();
  const savedViews = getSavedViews();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Session Explorer"
        description="Search and filter imported sessions by tool, model, project, cost, and estimation status."
      />
      {data.sessionComparisons.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Session Comparison Flags</CardTitle>
            <CardDescription>
              Sessions that are unusual compared with the same project, tool, and primary model.
            </CardDescription>
          </CardHeader>
          <CardContent className="table-scroll overflow-x-auto">
            <Table className="min-w-[54rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Flag</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Peer median</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sessionComparisons.slice(0, 6).map((row) => (
                  <TableRow key={row.sessionId}>
                    <TableCell>
                      <Badge variant={row.severity === "high" ? "destructive" : "warning"}>{row.severity}</Badge>
                    </TableCell>
                    <TableCell>{row.flag}</TableCell>
                    <TableCell className="max-w-lg">
                      <div className="font-medium">{row.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{row.project} / {row.tool} / {row.models}</div>
                    </TableCell>
                    <TableCell>{formatTokens(row.totalTokens)}</TableCell>
                    <TableCell>{formatCurrency(row.cost)}</TableCell>
                    <TableCell>
                      <div>{formatTokens(row.peerMedianTokens)}</div>
                      <div className="text-xs text-muted-foreground">{row.peerSessions} peer sessions</div>
                    </TableCell>
                    <TableCell>
                      <Link href={row.href} className="font-medium text-primary underline-offset-4 hover:underline">
                        Compare evidence
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      <SessionExplorer
        sessions={data.sessions}
        initialProject={params?.project}
        initialTool={params?.tool}
        initialModel={params?.model}
        initialQuery={params?.query}
        initialSource={params?.source}
        initialExact={params?.exact}
        initialCost={params?.cost}
        initialFrom={params?.from}
        initialTo={params?.to}
        initialHighCost={params?.highCost === "1"}
        initialCache={params?.cache === "1"}
        savedViews={savedViews}
      />
    </div>
  );
}
