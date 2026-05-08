"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { TrendPoint } from "@/src/lib/analytics";
import { formatCurrency, formatShortDate, formatTokens } from "@/src/lib/format";
import { Button } from "@/components/ui/button";

type Period = "daily" | "weekly" | "monthly";

function bucketFor(date: string, period: Period) {
  const parsed = new Date(`${date}T00:00:00`);
  if (period === "monthly") return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
  if (period === "weekly") {
    const day = parsed.getDay() || 7;
    parsed.setDate(parsed.getDate() - day + 1);
    return parsed.toISOString().slice(0, 10);
  }
  return date;
}

export function TrendChart({
  data,
  metric,
  color = "#0f766e"
}: {
  data: TrendPoint[];
  metric: "totalTokens" | "cost";
  color?: string;
}) {
  const [period, setPeriod] = useState<Period>("daily");
  const chartData = useMemo(() => {
    const buckets = new Map<string, TrendPoint>();
    data.forEach((point) => {
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
  }, [data, period]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["daily", "weekly", "monthly"] as const).map((item) => (
          <Button
            key={item}
            size="sm"
            variant={period === item ? "default" : "outline"}
            onClick={() => setPeriod(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
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
              labelFormatter={formatShortDate}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={color}
              fill={`url(#trend-${metric})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
