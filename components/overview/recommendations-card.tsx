import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { AnalyticsData } from "@/src/lib/analytics";

export function OverviewRecommendationsCard({
  recommendations
}: {
  recommendations: AnalyticsData["recommendations"];
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold leading-tight">Recommended Next Actions</h2>
        <CardDescription>
          Local rules ranked from your scan, model rates, parser, project, and cache data.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ol className="grid divide-y overflow-hidden lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {recommendations.slice(0, 3).map((item, index) => (
            <li key={item.id} className="min-w-0">
              <Link
                href={item.href}
                className="group flex h-full min-w-0 gap-3 px-4 py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{item.title}</span>
                    <Badge variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "warning" : "secondary"}>
                      {item.severity}
                    </Badge>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.evidence}</span>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    {item.action}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
