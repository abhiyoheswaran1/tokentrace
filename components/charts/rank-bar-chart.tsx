"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCurrency, formatTokens } from "@/src/lib/format";

export function RankBarChart({
  data,
  nameKey,
  valueKey,
  mode = "tokens",
  color = "#ea580c"
}: {
  data: Array<Record<string, string | number | null>>;
  nameKey: string;
  valueKey: string;
  mode?: "tokens" | "cost" | "count";
  color?: string;
}) {
  const chartData = data
    .slice(0, 8)
    .map((item) => ({
      name: String(item[nameKey] ?? "Unknown"),
      value: Number(item[valueKey] ?? 0)
    }))
    .filter((item) => item.value > 0);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 12, top: 8, bottom: 0 }}>
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
      </ResponsiveContainer>
    </div>
  );
}
