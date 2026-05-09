import { RankBarChart } from "@/components/charts/rank-bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/typography";
import { getAnalyticsData } from "@/src/lib/analytics";
import { formatCurrency, formatTokens, percent } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function ToolComparisonPage() {
  const data = getAnalyticsData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Comparison"
        description="Compare Claude Code, Codex CLI, and generic imported tools."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tokens By Tool</CardTitle>
            <CardDescription>Total token volume by CLI source.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankBarChart
              data={data.tools as unknown as Array<Record<string, string | number | null>>}
              nameKey="tool"
              valueKey="totalTokens"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost By Tool</CardTitle>
            <CardDescription>Costs depend on configured model prices.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankBarChart
              data={data.tools as unknown as Array<Record<string, string | number | null>>}
              nameKey="tool"
              valueKey="cost"
              mode="cost"
              color="#0f766e"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparison Table</CardTitle>
          <CardDescription>Efficiency, averages, cache behavior, and expensive models.</CardDescription>
        </CardHeader>
        <CardContent className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Avg/session</TableHead>
                <TableHead>Avg/interaction</TableHead>
                <TableHead>Output/Input</TableHead>
                <TableHead>Cache</TableHead>
                <TableHead>Most expensive model</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.tools.map((tool) => (
                <TableRow key={`${tool.provider}-${tool.tool}`}>
                  <TableCell className="font-medium">{tool.tool}</TableCell>
                  <TableCell>{tool.provider}</TableCell>
                  <TableCell>{formatTokens(tool.totalTokens)}</TableCell>
                  <TableCell>{formatCurrency(tool.cost)}</TableCell>
                  <TableCell>{formatTokens(tool.averageTokensPerSession)}</TableCell>
                  <TableCell>{formatTokens(tool.averageTokensPerInteraction)}</TableCell>
                  <TableCell>{tool.outputInputRatio.toFixed(2)}x</TableCell>
                  <TableCell>{percent(tool.cacheEfficiency)}</TableCell>
                  <TableCell>{tool.mostExpensiveModel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
