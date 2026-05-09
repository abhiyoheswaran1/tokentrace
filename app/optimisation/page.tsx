import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        title="Optimisation Insights"
        description="Deterministic recommendations based on imported usage patterns."
      />

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
