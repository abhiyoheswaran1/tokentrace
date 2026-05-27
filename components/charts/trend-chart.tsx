"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/src/lib/analytics";
import { formatCurrency, formatShortDate, formatTokens } from "@/src/lib/format";
import { Button } from "@/components/ui/button";
import { useChartSize } from "@/components/charts/use-chart-size";

export type TrendBucket = "daily" | "weekly" | "monthly";
export type TrendWindow = "30d" | "60d" | "90d" | "all";

const trendWindowOptions: Array<{ key: TrendWindow; label: string }> = [
  { key: "30d", label: "30 days" },
  { key: "60d", label: "60 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All" }
];

function parseTrendDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysForWindow(window: TrendWindow) {
  if (window === "30d") return 30;
  if (window === "60d") return 60;
  if (window === "90d") return 90;
  return null;
}

function ChartSkeleton() {
  return (
    <div className="grid h-full grid-cols-[2.5rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_1.5rem]" aria-label="Chart loading">
      <div className="row-span-1 border-r border-border/70" />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e7ded3_1px,transparent_1px),linear-gradient(to_bottom,#e7ded3_1px,transparent_1px)] bg-size-[25%_33%] opacity-80" />
        <div className="absolute bottom-[18%] left-[8%] h-[38%] w-[84%] rounded-t-full border-t-4 border-primary/25" />
        <div className="absolute bottom-[12%] left-[8%] h-2 w-[84%] rounded-full bg-muted" />
      </div>
      <div />
      <div className="border-t border-border/70" />
    </div>
  );
}

export function filterTrendWindow(data: TrendPoint[], window: TrendWindow) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const days = daysForWindow(window);
  if (!days || sorted.length === 0) return sorted;

  const latest = parseTrendDate(sorted[sorted.length - 1].date);
  const cutoff = addDays(latest, -(days - 1)).getTime();
  return sorted.filter((point) => parseTrendDate(point.date).getTime() >= cutoff);
}

export function TrendControls({
  period,
  trendWindow,
  onPeriodChange,
  onTrendWindowChange
}: {
  period: TrendBucket;
  trendWindow: TrendWindow;
  onPeriodChange: (period: TrendBucket) => void;
  onTrendWindowChange: (window: TrendWindow) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Bucket</span>
        {(["daily", "weekly", "monthly"] as const).map((item) => (
          <Button
            key={item}
            size="sm"
            type="button"
            variant={period === item ? "default" : "outline"}
            onClick={() => onPeriodChange(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>
      <div className="hidden h-6 w-px bg-border sm:block" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Display window</span>
        {trendWindowOptions.map((item) => (
          <Button
            key={item.key}
            size="sm"
            type="button"
            variant={trendWindow === item.key ? "default" : "outline"}
            onClick={() => onTrendWindowChange(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function bucketFor(date: string, period: TrendBucket) {
  const parsed = new Date(`${date}T00:00:00`);
  if (period === "monthly") return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
  if (period === "weekly") {
    const day = parsed.getDay() || 7;
    parsed.setDate(parsed.getDate() - day + 1);
    return parsed.toISOString().slice(0, 10);
  }
  return date;
}

export type TrendAnomalyMarker = {
  date: string;
  value: number;
  severity: "notable" | "high" | "severe";
};

function severityColor(severity: TrendAnomalyMarker["severity"]) {
  if (severity === "severe") return "#dc2626";
  if (severity === "high") return "#f59e0b";
  return "#a3a3a3";
}

export function TrendChart({
  data,
  metric,
  color = "#0f766e",
  defaultWindow = "60d",
  period: controlledPeriod,
  trendWindow: controlledTrendWindow,
  showControls = true,
  markers
}: {
  data: TrendPoint[];
  metric: "totalTokens" | "cost";
  color?: string;
  defaultWindow?: TrendWindow;
  period?: TrendBucket;
  trendWindow?: TrendWindow;
  showControls?: boolean;
  markers?: TrendAnomalyMarker[];
}) {
  const [internalPeriod, setInternalPeriod] = useState<TrendBucket>("daily");
  const [internalTrendWindow, setInternalTrendWindow] = useState<TrendWindow>(defaultWindow);
  const [prevDefaultWindow, setPrevDefaultWindow] = useState<TrendWindow>(defaultWindow);
  const { ref: chartRef, size } = useChartSize<HTMLDivElement>();

  if (defaultWindow !== prevDefaultWindow) {
    setPrevDefaultWindow(defaultWindow);
    if (!controlledTrendWindow) setInternalTrendWindow(defaultWindow);
  }

  const period = controlledPeriod ?? internalPeriod;
  const trendWindow = controlledTrendWindow ?? internalTrendWindow;

  const chartData = useMemo(() => {
    const buckets = new Map<string, TrendPoint>();
    const visibleData = filterTrendWindow(data, trendWindow);
    visibleData.forEach((point) => {
      const key = bucketFor(point.date, period);
      const existing =
        buckets.get(key) ??
        ({
          date: key,
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          reasoningTokens: 0,
          cost: 0
        } satisfies TrendPoint);
      existing.totalTokens += point.totalTokens;
      existing.inputTokens += point.inputTokens;
      existing.outputTokens += point.outputTokens;
      existing.cachedTokens += point.cachedTokens;
      existing.reasoningTokens += point.reasoningTokens;
      existing.cost += point.cost;
      buckets.set(key, existing);
    });
    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, period, trendWindow]);

  return (
    <div className="space-y-3">
      {showControls ? (
        <TrendControls
          period={period}
          trendWindow={trendWindow}
          onPeriodChange={setInternalPeriod}
          onTrendWindowChange={setInternalTrendWindow}
        />
      ) : null}
      <div ref={chartRef} className="h-72 min-w-0">
        {size.width > 0 && size.height > 0 ? (
          <AreaChart
            width={size.width}
            height={size.height}
            data={chartData}
            margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`trend-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7ded3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fontSize: 12 }}
              stroke="#786f65"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#786f65"
              tickFormatter={(value) =>
                metric === "cost" ? `$${Number(value).toFixed(0)}` : formatTokens(Number(value))
              }
            />
            <Tooltip
              formatter={(value) =>
                metric === "cost"
                  ? formatCurrency(Number(value))
                  : `${formatTokens(Number(value))} tokens`
              }
              labelFormatter={(label) => formatShortDate(label as string | number | null | undefined)}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={color}
              fill={`url(#trend-${metric})`}
              strokeWidth={2}
            />
            {period === "daily" && markers
              ? markers
                  .filter((marker) =>
                    chartData.some((point) => point.date === marker.date)
                  )
                  .map((marker) => (
                    <ReferenceDot
                      key={`${marker.date}:${metric}`}
                      x={marker.date}
                      y={marker.value}
                      r={5}
                      fill={severityColor(marker.severity)}
                      stroke="#ffffff"
                      strokeWidth={2}
                      ifOverflow="extendDomain"
                    />
                  ))
              : null}
          </AreaChart>
        ) : (
          <ChartSkeleton />
        )}
      </div>
    </div>
  );
}
