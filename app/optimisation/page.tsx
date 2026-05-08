import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Optimisation Insights</h1>
        <p className="text-sm text-muted-foreground">
          Deterministic recommendations based on imported usage patterns.
        </p>
      </div>

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
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Saving opportunity
                  </div>
                  <p className="mt-1 text-sm">{insight.savingOpportunity}</p>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Recommendation
                  </div>
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
