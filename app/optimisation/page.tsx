import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ScanNowButton } from "@/components/scan-now-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/typography";
import { getAnalyticsData } from "@/src/lib/analytics";

const severityIcon = {
  high: AlertTriangle,
  medium: Lightbulb,
  low: Info
};

const severityVariant = {
  high: "destructive",
  medium: "warning",
  low: "secondary"
} as const;

export const dynamic = "force-dynamic";

export default function OptimisationPage() {
  const data = getAnalyticsData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        description="Deterministic local review queue based on guardrails, repair work, and usage impact."
      />

      {data.reviewQueue.length ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Review Queue</CardTitle>
              <CardDescription>
                Evidence-backed next actions ordered by guardrails, repair work, and usage impact.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/sessions">Open sessions</Link>
            </Button>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Review item</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.reviewQueue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={severityVariant[item.severity]}>{item.severity}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">{item.category.replace("-", " ")}</TableCell>
                    <TableCell className="max-w-xl">
                      <div className="font-medium">{item.title}</div>
                      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.evidence}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{item.impactValue}</div>
                      <div className="text-xs text-muted-foreground">{item.impactLabel}</div>
                    </TableCell>
                    <TableCell>
                      <Link href={item.href} className="font-medium text-primary underline-offset-4 hover:underline">
                        {item.action}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No insights yet"
          description="Insights appear after local sessions are imported and enough cost, model, or project evidence exists."
          actions={[
            { label: "Open sessions", href: "/sessions", variant: "outline" }
          ]}
        >
          <ScanNowButton size="sm" />
        </EmptyState>
      )}

      <div className="grid gap-4">
        {data.insights.map((insight) => {
          const Icon = severityIcon[insight.severity] ?? CheckCircle2;
          return (
            <Card key={insight.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {insight.problem}
                  </CardTitle>
                  <CardDescription>{insight.evidence}</CardDescription>
                </div>
                <Badge variant={severityVariant[insight.severity]}>{insight.severity}</Badge>
              </CardHeader>
              <CardContent className="grid border-t p-0 md:grid-cols-2 md:divide-x">
                <div className="p-4">
                  <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
                    Saving opportunity
                  </p>
                  <p className="mt-1 text-sm">{insight.savingOpportunity}</p>
                </div>
                <div className="p-4">
                  <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
                    Recommendation
                  </p>
                  <p className="mt-1 text-sm">{insight.recommendation}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
