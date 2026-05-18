"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import type { TrendPoint } from "@/src/lib/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart, TrendControls, type TrendBucket, type TrendWindow } from "@/components/charts/trend-chart";

export function TrendSection({
  data,
  defaultWindow
}: {
  data: TrendPoint[];
  defaultWindow: TrendWindow;
}) {
  const [period, setPeriod] = useState<TrendBucket>("daily");
  const [trendWindow, setTrendWindow] = useState<TrendWindow>(defaultWindow);

  useEffect(() => {
    setTrendWindow(defaultWindow);
  }, [defaultWindow]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-tight">Trends</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Token and cost history share display settings.
          </p>
        </div>
        <div className="flex min-w-0 justify-start lg:justify-end">
          <TrendControls
            period={period}
            trendWindow={trendWindow}
            onPeriodChange={setPeriod}
            onTrendWindowChange={setTrendWindow}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Token Trend</CardTitle>
            <CardDescription>Daily, weekly, and monthly token usage.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={data}
              metric="totalTokens"
              period={period}
              trendWindow={trendWindow}
              showControls={false}
            />
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Cost Trend</CardTitle>
            <CardDescription>Costs use editable model prices from Pricing.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={data}
              metric="cost"
              color="#ea580c"
              period={period}
              trendWindow={trendWindow}
              showControls={false}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
