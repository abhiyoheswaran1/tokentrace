import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FirstRunStatus } from "@/src/lib/first-run-status";
import { cn } from "@/src/lib/utils";

export function FirstRunPanel({ status }: { status: FirstRunStatus }) {
  return (
    <Card className={status.tone === "warning" ? "border-amber-300 bg-amber-50/50" : undefined}>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>{status.title}</CardTitle>
          <CardDescription>{status.description}</CardDescription>
        </div>
        <Button asChild variant={status.tone === "warning" ? "outline" : "default"}>
          <Link href={status.primaryAction.href}>
            {status.primaryAction.label} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid divide-y border-y md:grid-cols-5 md:divide-x md:divide-y-0">
          {status.checks.map((check) => (
            <div key={check.id} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold">{check.label}</div>
                <Badge variant={check.state === "pass" ? "success" : check.state === "warn" ? "warning" : "secondary"}>
                  {check.state}
                </Badge>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.detail}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold leading-tight">Guided setup</h2>
            <span className="text-xs text-muted-foreground">Five local steps to first useful evidence.</span>
          </div>
          <ol className="mt-3 grid overflow-hidden rounded-md border bg-card md:grid-cols-5">
            {status.setupSteps.map((step, index) => (
              <li
                key={step.id}
                className={cn(
                  "min-w-0 p-3",
                  index > 0 ? "border-t border-border md:border-l md:border-t-0" : ""
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <Badge variant={step.state === "pass" ? "success" : step.state === "warn" ? "warning" : "secondary"}>
                    {step.state}
                  </Badge>
                </div>
                <div className="mt-2 text-sm font-semibold leading-tight">{step.label}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                <Link href={step.href} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
                  {step.action}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
