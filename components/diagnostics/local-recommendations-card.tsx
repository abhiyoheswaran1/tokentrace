import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocalRecommendation } from "@/src/lib/recommendations";

export function LocalRecommendationsCard({
  recommendations
}: {
  recommendations: LocalRecommendation[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Local recommendations</CardTitle>
        <CardDescription>Deterministic next actions from local scan, model rates, parser, project, and cache data.</CardDescription>
      </CardHeader>
      <CardContent className="grid divide-y overflow-hidden p-0 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {recommendations.slice(0, 3).map((item) => (
          <Link key={item.id} href={item.href} className="px-4 py-3 transition-colors hover:bg-muted/40">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold">{item.title}</div>
              <Badge variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "warning" : "secondary"}>
                {item.severity}
              </Badge>
            </div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.evidence}</div>
            <div className="mt-2 text-xs font-medium text-emerald-800">{item.action}</div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
