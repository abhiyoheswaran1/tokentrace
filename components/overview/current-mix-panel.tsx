import Link from "next/link";
import { RankBarChart } from "@/components/charts/rank-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AnalyticsData } from "@/src/lib/analytics";
import { formatCurrency, formatTokens, percent } from "@/src/lib/format";

export function OverviewCurrentMixPanel({
  tools,
  mostUsedTool,
  mostUsedModel
}: {
  tools: AnalyticsData["tools"];
  mostUsedTool: string;
  mostUsedModel: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Usage By Tool</CardTitle>
          <CardDescription>Top tools by total tokens.</CardDescription>
        </CardHeader>
        <CardContent>
          <RankBarChart data={tools as unknown as Array<Record<string, string | number | null>>} nameKey="tool" valueKey="totalTokens" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Current Mix</CardTitle>
          <CardDescription>
            Most used tool: {mostUsedTool}. Most used model: {mostUsedModel}.
          </CardDescription>
        </CardHeader>
        <CardContent className="table-scroll overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Cache</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.slice(0, 5).map((tool) => (
                <TableRow key={tool.tool}>
                  <TableCell className="font-medium">
                    <Link href={`/sessions?tool=${encodeURIComponent(tool.tool)}`} className="text-primary underline-offset-4 hover:underline">
                      {tool.tool}
                    </Link>
                  </TableCell>
                  <TableCell>{tool.provider}</TableCell>
                  <TableCell>{formatTokens(tool.totalTokens)}</TableCell>
                  <TableCell>{formatCurrency(tool.cost)}</TableCell>
                  <TableCell>
                    <Badge variant={tool.cacheEfficiency > 0.1 ? "success" : "secondary"}>
                      {percent(tool.cacheEfficiency)}
                    </Badge>
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
