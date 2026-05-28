import { prepareCached } from "@/src/db/prepared";
import { getAppSettings, saveAppSettings } from "@/src/db/settings";
import { runScan } from "@/src/ingestion/scan";
import { isScanDue, summarizeScheduledScanResult } from "@/src/lib/scan-schedule";

function latestScanDate() {
  const row = prepareCached(
    "SELECT COALESCE(completed_at, started_at) AS scanAt FROM scan_runs ORDER BY started_at DESC LIMIT 1"
  ).get() as { scanAt: number | null } | undefined;
  return row?.scanAt ? new Date(row.scanAt) : null;
}

type ScheduledScanOutcome = Awaited<ReturnType<typeof runScheduledScan>>;

// The dashboard fires runDueScheduledScan() on every overview page load. Two
// overlapping loads (a second tab, a quick refresh, prefetch) would otherwise
// both pass the due-check and both call runScan(), producing duplicate scan
// runs and wasted work. The Next.js server is a single process, so a
// module-scoped promise guard coalesces concurrent callers into one scan.
let inFlightScheduledScan: Promise<ScheduledScanOutcome> | null = null;

export function runDueScheduledScan(now = new Date()): Promise<ScheduledScanOutcome> {
  if (inFlightScheduledScan) return inFlightScheduledScan;
  inFlightScheduledScan = runScheduledScan(now).finally(() => {
    inFlightScheduledScan = null;
  });
  return inFlightScheduledScan;
}

async function runScheduledScan(now: Date) {
  const settings = getAppSettings();
  if (!isScanDue(settings.scanSchedule, latestScanDate(), now)) {
    return {
      ran: false,
      summary: null
    };
  }

  try {
    const result = await runScan();
    const summary = summarizeScheduledScanResult(result);
    saveAppSettings({
      ...settings,
      scanSchedule: {
        ...settings.scanSchedule,
        lastScheduledScanAt: now.toISOString(),
        lastScheduledScanStatus:
          summary.tone === "destructive" ? "failed" : summary.tone === "warning" ? "warning" : "success",
        lastScheduledScanMessage: summary.headline
      }
    });
    return {
      ran: true,
      summary
    };
  } catch (error) {
    saveAppSettings({
      ...settings,
      scanSchedule: {
        ...settings.scanSchedule,
        lastScheduledScanAt: now.toISOString(),
        lastScheduledScanStatus: "failed",
        lastScheduledScanMessage: error instanceof Error ? error.message : "Scheduled scan failed."
      }
    });
    return {
      ran: true,
      summary: {
        headline: "Scheduled scan failed",
        tone: "destructive" as const,
        nextAction: "Open Scan Health" as const
      }
    };
  }
}
