"use client";

import dynamic from "next/dynamic";
import type { RankBarChart as RankBarChartComponent } from "@/components/charts/rank-bar-chart";
import { ChartSkeleton } from "@/components/charts/skeleton";

// next/dynamic cannot carry the generic signature through, so re-assert it here.
export const RankBarChart = dynamic(
  () => import("./rank-bar-chart").then((m) => m.RankBarChart),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-60" label="Loading chart…" /> }
) as typeof RankBarChartComponent;
