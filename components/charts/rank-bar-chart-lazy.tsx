"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/skeleton";

export const RankBarChart = dynamic(
  () => import("./rank-bar-chart").then((m) => m.RankBarChart),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-60" label="Loading chart…" /> }
);
