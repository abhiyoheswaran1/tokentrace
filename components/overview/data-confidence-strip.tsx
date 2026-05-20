import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DataConfidenceScore } from "@/src/lib/data-confidence";

function confidenceVariant(grade: DataConfidenceScore["grade"]) {
  if (grade === "high") return "success";
  if (grade === "medium") return "warning";
  if (grade === "low") return "destructive";
  return "secondary";
}

export function DataConfidenceStrip({ confidence }: { confidence: DataConfidenceScore }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold">Data Confidence</div>
            <Badge variant={confidenceVariant(confidence.grade)}>{confidence.score}/100 {confidence.grade}</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {confidence.drivers.slice(0, 2).join(" ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {confidence.repairHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={confidence.repairHref}>Open repair <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href="/diagnostics">Open Scan Health <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
