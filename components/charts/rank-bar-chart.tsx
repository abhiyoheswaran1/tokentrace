"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatTokens } from "@/src/lib/format";
import { useChartSize } from "@/components/charts/use-chart-size";

function ChartSkeleton() {
  return (
    <div className="grid h-full grid-cols-[7rem_minmax(0,1fr)]" aria-label="Chart loading">
      <div className="space-y-10 border-r border-border/70 pt-10">
        <div className="h-3 w-20 rounded-sm bg-muted" />
        <div className="h-3 w-16 rounded-sm bg-muted" />
      </div>
      <div className="relative overflow-hidden p-8">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e7ded3_1px,transparent_1px),linear-gradient(to_bottom,#e7ded3_1px,transparent_1px)] bg-size-[25%_33%] opacity-80" />
        <div className="relative mt-8 h-10 w-[82%] rounded-r bg-primary/20" />
        <div className="relative mt-10 h-10 w-[22%] rounded-r bg-primary/15" />
      </div>
    </div>
  );
}

export function RankBarChart<T extends object>({
  data,
  nameKey,
  valueKey,
  mode = "tokens",
  color = "#ea580c"
}: {
  data: T[];
  nameKey: keyof T & string;
  valueKey: keyof T & string;
  mode?: "tokens" | "cost" | "count";
  color?: string;
}) {
  const { ref: chartRef, size } = useChartSize<HTMLDivElement>();
  const chartData = data
    .slice(0, 8)
    .map((item) => ({
      name: String(item[nameKey] ?? "Unknown"),
      value: Number(item[valueKey] ?? 0)
    }))
    .filter((item) => item.value > 0);

  return (
    <div ref={chartRef} className="h-72 min-w-0">
      {size.width > 0 && size.height > 0 ? (
        <BarChart
          width={size.width}
          height={size.height}
          data={chartData}
          layout="vertical"
          margin={{ left: 16, right: 12, top: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e7ded3" />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            stroke="#786f65"
            tickFormatter={(value) =>
              mode === "cost" ? `$${Number(value).toFixed(0)}` : formatTokens(Number(value))
            }
          />
          <YAxis
            dataKey="name"
            type="category"
            width={120}
            tick={{ fontSize: 12 }}
            stroke="#786f65"
          />
          <Tooltip
            formatter={(value) =>
              mode === "cost"
                ? formatCurrency(Number(value))
                : mode === "tokens"
                  ? `${formatTokens(Number(value))} tokens`
                  : Number(value).toLocaleString()
            }
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      ) : (
        <ChartSkeleton />
      )}
    </div>
  );
}
