import Link from "next/link";
import { RankBarChart } from "@/components/charts/rank-bar-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, MonoText, PageHeader } from "@/components/ui/typography";
import { getAnalyticsData } from "@/src/lib/analytics";
import { formatCurrency, formatDate, formatTokens } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function ProjectAnalyticsPage() {
  const data = getAnalyticsData();
  const mostExpensive = data.projects[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Analytics"
        description="Group usage by local repository or inferred project path."
      />

      {data.projectSignals.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Project Signals</CardTitle>
            <CardDescription>
              Local project-level patterns that deserve review before optimizing individual sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.projectSignals.slice(0, 8).map((signal) => (
                  <TableRow key={signal.id}>
                    <TableCell>
                      <Badge variant={signal.severity === "high" ? "destructive" : signal.severity === "medium" ? "warning" : "secondary"}>
                        {signal.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{signal.signal}</TableCell>
                    <TableCell className="max-w-lg">
                      <div className="font-medium">{signal.project}</div>
                      <MonoText className="mt-1 block truncate text-muted-foreground">{signal.path}</MonoText>
                      <div className="mt-1 text-xs text-muted-foreground">{signal.evidence}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{signal.metricValue}</div>
                      <div className="text-xs text-muted-foreground">{signal.metricLabel}</div>
                    </TableCell>
                    <TableCell>
                      <Link href={signal.href} className="font-medium text-primary underline-offset-4 hover:underline">
                        {signal.action}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Most Expensive Project</CardTitle>
            <CardDescription>Based on configured cost estimates.</CardDescription>
          </CardHeader>
          <CardContent>
            {mostExpensive ? (
              <div className="space-y-2">
                <DataValue size="lg">{mostExpensive.project}</DataValue>
                <MonoText className="block break-all text-muted-foreground">{mostExpensive.path}</MonoText>
                <div className="text-sm">
                  {formatTokens(mostExpensive.totalTokens)} tokens, {formatCurrency(mostExpensive.cost)}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No project data imported yet.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tokens By Project</CardTitle>
            <CardDescription>Top local projects by token usage.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankBarChart
              data={data.projects as unknown as Array<Record<string, string | number | null>>}
              nameKey="project"
              valueKey="totalTokens"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Usage Trend</CardTitle>
          <CardDescription>Overall local project activity over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart data={data.trends} metric="totalTokens" color="#0f766e" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Table</CardTitle>
          <CardDescription>Drill into sessions using the session explorer filters.</CardDescription>
        </CardHeader>
        <CardContent className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Interactions</TableHead>
                <TableHead>Output/Input</TableHead>
                <TableHead>Last used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <Link className="hover:underline" href={`/sessions?project=${encodeURIComponent(project.project)}`}>
                      {project.project}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-sm truncate">
                    <MonoText className="text-muted-foreground">{project.path}</MonoText>
                  </TableCell>
                  <TableCell>{formatTokens(project.totalTokens)}</TableCell>
                  <TableCell>{formatCurrency(project.cost)}</TableCell>
                  <TableCell>{project.sessions.toLocaleString()}</TableCell>
                  <TableCell>{project.interactions.toLocaleString()}</TableCell>
                  <TableCell>{project.outputInputRatio.toFixed(2)}x</TableCell>
                  <TableCell>{formatDate(project.lastUsedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
