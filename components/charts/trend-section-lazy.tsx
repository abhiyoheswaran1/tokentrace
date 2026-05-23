"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/skeleton";

export const TrendSection = dynamic(
  () => import("./trend-section").then((m) => m.TrendSection),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-72" label="Loading trend chart…" /> }
);
