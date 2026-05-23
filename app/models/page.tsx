import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ScanNowButton } from "@/components/scan-now-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankBarChart } from "@/components/charts/rank-bar-chart-lazy";
import { PageHeader } from "@/components/ui/typography";
import { getAnalyticsData } from "@/src/lib/analytics";
import { formatCurrency, formatTokens } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function ModelAnalyticsPage() {
  const data = getAnalyticsData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Analytics"
        description="Usage, cost, output length, efficiency, and configured cheaper alternatives."
      />

      {!data.models.length ? (
        <EmptyState
          title="No model usage imported yet"
          description="Scan local CLI usage first, then confirm model rates so cost and alternative suggestions are meaningful."
          actions={[
            { label: "Set model rate", href: "/pricing", variant: "outline" }
          ]}
        >
          <ScanNowButton size="sm" />
        </EmptyState>
      ) : (
        <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage By Model</CardTitle>
            <CardDescription>Total tokens by model.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankBarChart
              data={data.models as unknown as Array<Record<string, string | number | null>>}
              nameKey="model"
              valueKey="totalTokens"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost By Model</CardTitle>
            <CardDescription>Aggregated from per-interaction costs.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankBarChart
              data={data.models as unknown as Array<Record<string, string | number | null>>}
              nameKey="model"
              valueKey="cost"
              mode="cost"
              color="#0f766e"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Table</CardTitle>
          <CardDescription>Flags are deterministic and based on your configured price table.</CardDescription>
        </CardHeader>
        <CardContent className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Avg output</TableHead>
                <TableHead>Efficiency</TableHead>
                <TableHead>Alternative</TableHead>
                <TableHead>Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.models.map((model) => (
                <TableRow key={`${model.provider}-${model.model}`}>
                  <TableCell className="font-medium">{model.model}</TableCell>
                  <TableCell>{model.provider}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{formatTokens(model.totalTokens)}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{formatCurrency(model.cost)}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{formatTokens(model.averageOutputTokens)}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{model.tokenEfficiency.toFixed(2)}x</TableCell>
                  <TableCell>{model.suggestedAlternative ?? "None configured"}</TableCell>
                  <TableCell>
                    {model.overuseFlag ? (
                      <Badge variant="warning">{model.overuseFlag}</Badge>
                    ) : (
                      <Badge variant="secondary">No flag</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
