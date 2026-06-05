"use client";

import { useState } from "react";
import type { ScanSchedule, ScanScheduleMode } from "@/src/lib/scan-schedule";
import { parseLimitInput } from "@/components/settings/form-values";

/** Owns the Scan Scheduling section state: schedule mode and retention runs. */
export function useScanScheduleSection(initialSchedule: ScanSchedule) {
  const [scanScheduleMode, setScanScheduleMode] = useState<ScanScheduleMode>(initialSchedule.mode);
  const [scanRetentionRuns, setScanRetentionRuns] = useState(String(initialSchedule.retentionRuns));

  function payload(): ScanSchedule {
    return {
      mode: scanScheduleMode,
      retentionRuns: parseLimitInput(scanRetentionRuns) ?? 30,
      lastScheduledScanAt: initialSchedule.lastScheduledScanAt ?? null,
      lastScheduledScanStatus: initialSchedule.lastScheduledScanStatus ?? null,
      lastScheduledScanMessage: initialSchedule.lastScheduledScanMessage ?? null
    };
  }

  return {
    scanScheduleMode,
    setScanScheduleMode,
    scanRetentionRuns,
    setScanRetentionRuns,
    lastScheduledScanAt: initialSchedule.lastScheduledScanAt ?? null,
    lastScheduledScanMessage: initialSchedule.lastScheduledScanMessage ?? null,
    payload
  };
}

export type ScanScheduleSectionController = ReturnType<typeof useScanScheduleSection>;
