export type ScanScheduleMode = "manual" | "on-open" | "hourly" | "daily";

export type ScanSchedule = {
  mode: ScanScheduleMode;
  retentionRuns: number;
  lastScheduledScanAt?: string | null;
  lastScheduledScanStatus?: "success" | "warning" | "failed" | null;
  lastScheduledScanMessage?: string | null;
};

export type ScheduledScanSummary = {
  headline: string;
  tone: "success" | "warning" | "destructive" | "secondary";
  nextAction: "Open Scan Health" | "Open repair" | "Scan again";
};

const modes = new Set<ScanScheduleMode>(["manual", "on-open", "hourly", "daily"]);

export function normalizeScanSchedule(value: unknown): ScanSchedule {
  const object = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const mode = modes.has(object.mode as ScanScheduleMode) ? (object.mode as ScanScheduleMode) : "manual";
  const parsedRetention =
    typeof object.retentionRuns === "number"
      ? object.retentionRuns
      : typeof object.retentionRuns === "string"
        ? Number(object.retentionRuns)
        : 30;
  return {
    mode,
    retentionRuns:
      Number.isFinite(parsedRetention) && parsedRetention > 0
        ? Math.min(500, Math.round(parsedRetention))
        : 30,
    lastScheduledScanAt:
      typeof object.lastScheduledScanAt === "string" ? object.lastScheduledScanAt : null,
    lastScheduledScanStatus:
      object.lastScheduledScanStatus === "success" ||
      object.lastScheduledScanStatus === "warning" ||
      object.lastScheduledScanStatus === "failed"
        ? object.lastScheduledScanStatus
        : null,
    lastScheduledScanMessage:
      typeof object.lastScheduledScanMessage === "string" ? object.lastScheduledScanMessage : null
  };
}

export function isScanDue(schedule: ScanSchedule, lastScanAt: Date | null, now = new Date()) {
  if (schedule.mode === "manual") return false;
  if (!lastScanAt) return true;
  const elapsed = now.getTime() - lastScanAt.getTime();
  if (schedule.mode === "on-open") return elapsed > 5 * 60 * 1000;
  if (schedule.mode === "hourly") return elapsed >= 60 * 60 * 1000;
  if (schedule.mode === "daily") return elapsed >= 24 * 60 * 60 * 1000;
  return false;
}

export function summarizeScheduledScanResult(result: {
  filesScanned: number;
  recordsImported: number;
  warnings: string[];
  errors: string[];
}): ScheduledScanSummary {
  if (result.errors.length) {
    return {
      headline: `${result.errors.length.toLocaleString()} scan errors`,
      tone: "destructive",
      nextAction: "Open Scan Health"
    };
  }
  if (result.warnings.length) {
    return {
      headline: `${result.recordsImported.toLocaleString()} records imported`,
      tone: "warning",
      nextAction: "Open Scan Health"
    };
  }
  if (result.recordsImported > 0) {
    return {
      headline: `${result.recordsImported.toLocaleString()} records imported`,
      tone: "success",
      nextAction: "Open repair"
    };
  }
  return {
    headline: `${result.filesScanned.toLocaleString()} files checked`,
    tone: "secondary",
    nextAction: "Scan again"
  };
}
