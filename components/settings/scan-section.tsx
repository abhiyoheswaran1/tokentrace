import { Play, RotateCcw, Trash2 } from "lucide-react";
import type { ScanScheduleMode } from "@/src/lib/scan-schedule";
import { formatDate, percent } from "@/src/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataValue, FieldLabel } from "@/components/ui/typography";
import type { ScanResult, SettingsScanHealth } from "@/components/settings/types";
import type { ScanControlsSectionController } from "@/components/settings/use-scan-controls-section";
import type { ScanScheduleSectionController } from "@/components/settings/use-scan-schedule-section";

function toneVariant(tone: SettingsScanHealth["tone"]) {
  if (tone === "success") return "success";
  if (tone === "destructive") return "destructive";
  if (tone === "warning") return "warning";
  return "secondary";
}

function scanResultVariant({
  errors,
  warnings,
  unknownCostInteractions
}: {
  errors: number;
  warnings: number;
  unknownCostInteractions: number;
}) {
  if (errors > 0) return "destructive";
  if (warnings > 0 || unknownCostInteractions > 0) return "warning";
  return "success";
}

function LastScanResultPanel({
  scanResult,
  health
}: {
  scanResult: ScanResult | null;
  health: SettingsScanHealth;
}) {
  const latestRun = health.latestRun;
  if (!scanResult && !latestRun) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 text-sm">
        <div className="font-semibold text-foreground">Last scan result</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          No scan has run yet. Use Scan now to import local AI CLI usage, then return here for files checked, imported records, warnings, unknown cost, and next action.
        </p>
      </div>
    );
  }

  const isFreshResult = scanResult != null;
  const warnings = scanResult?.warningCount ?? scanResult?.warnings.length ?? latestRun?.warnings.length ?? health.latestWarnings.length;
  const errors = scanResult?.errorCount ?? scanResult?.errors.length ?? latestRun?.errors.length ?? health.latestErrors.length;
  const unknownCostInteractions = scanResult?.unknownCostInteractions ?? health.costCoverage.unknown;
  const filesScanned = scanResult?.filesScanned ?? latestRun?.filesScanned ?? 0;
  const recordsImported = scanResult?.recordsImported ?? latestRun?.recordsImported ?? 0;
  const completedAt = latestRun?.completedAt ?? latestRun?.startedAt ?? null;
  const badge = errors > 0 ? "needs repair" : warnings > 0 || unknownCostInteractions > 0 ? "review" : "ready";
  const nextAction =
    errors > 0 || warnings > 0
      ? { label: "Open Scan Health", href: "/diagnostics" }
      : unknownCostInteractions > 0
        ? { label: "Open repair", href: "/repair" }
        : { label: "Open Discovery", href: "/discovery" };
  const metrics = [
    ["Files checked", filesScanned],
    ["Records imported", recordsImported],
    ["Warnings", warnings],
    ["Errors", errors],
    ["Costs recalculated", scanResult?.costsRecalculated ?? 0],
    ["Unknown cost", unknownCostInteractions],
    ["Stale support imports removed", scanResult?.staleNonUsageSessionsRemoved ?? 0],
    ["Model aliases updated", scanResult?.modelAliasesUpdated ?? 0]
  ];

  return (
    <div className="overflow-hidden rounded-md border bg-muted/20 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
        <div>
          <div className="font-semibold text-foreground">{isFreshResult ? "Scan result" : "Last scan result"}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {isFreshResult
              ? "Local import finished. Use the follow-up links when warnings, errors, or unknown cost remain."
              : completedAt
                ? `Persisted from ${formatDate(completedAt)}. Run Scan now again after new AI CLI sessions.`
                : "Persisted scan history is available locally."}
          </p>
        </div>
        <Badge variant={scanResultVariant({ errors, warnings, unknownCostInteractions })}>{badge}</Badge>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value], index) => (
          <div key={label} className={index > 0 ? "border-t p-3 sm:border-l sm:border-t-0" : "p-3"}>
            <FieldLabel>{label}</FieldLabel>
            <DataValue className="mt-1">{Number(value).toLocaleString()}</DataValue>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t p-3">
        {[
          nextAction,
          { label: "Open Scan Health", href: "/diagnostics" },
          { label: "Open repair", href: "/repair" },
          { label: "Open Discovery", href: "/discovery" },
          { label: "Set model rate", href: "/pricing" }
        ]
          .filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index)
          .map((item) => (
            <a key={item.href} className="font-medium text-primary underline-offset-4 hover:underline" href={item.href}>
              {item.label}
            </a>
          ))}
      </div>
    </div>
  );
}

export function ScanMemorySection({ health }: { health: SettingsScanHealth }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Scan Memory
          <Badge variant={toneVariant(health.tone)}>{health.headline}</Badge>
        </CardTitle>
        <CardDescription>
          TokenTrace keeps scan history locally so you can see freshness and review what changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid border-y sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
          <div className="p-3">
            <FieldLabel>Last scan</FieldLabel>
            <DataValue className="mt-1">
              {health.latestRun
                ? formatDate(health.latestRun.completedAt ?? health.latestRun.startedAt)
                : "Never"}
            </DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Files scanned</FieldLabel>
            <DataValue className="mt-1">
              {health.latestRun?.filesScanned.toLocaleString() ?? "0"}
            </DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Records imported</FieldLabel>
            <DataValue className="mt-1">
              {health.latestRun?.recordsImported.toLocaleString() ?? "0"}
            </DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Priced interactions</FieldLabel>
            <DataValue className="mt-1">
              {percent(
                health.costCoverage.total
                  ? health.costCoverage.priced / health.costCoverage.total
                  : 0
              )}
            </DataValue>
          </div>
        </div>
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          {health.latestRun
            ? "Data is current as of the latest scan. Run Scan now after new Claude, Codex, or other AI CLI sessions."
            : "No scan has run yet. Start with the default folders, then add custom folders if expected files are missing."}
        </p>
      </CardContent>
    </Card>
  );
}

export function ScanScheduleSection({ schedule }: { schedule: ScanScheduleSectionController }) {
  const {
    scanScheduleMode,
    setScanScheduleMode,
    scanRetentionRuns,
    setScanRetentionRuns,
    lastScheduledScanAt,
    lastScheduledScanMessage
  } = schedule;

  return (
    <Card id="scan-scheduling" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Scan Scheduling</CardTitle>
        <CardDescription>
          Local-only opportunistic scans. Nothing runs in the cloud or outside this machine.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 border-y p-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="scan-schedule-mode">Schedule</Label>
          <select
            id="scan-schedule-mode"
            className="h-9 w-full rounded-md border bg-card px-3 text-sm"
            value={scanScheduleMode}
            onChange={(event) => setScanScheduleMode(event.target.value as ScanScheduleMode)}
          >
            <option value="manual">Manual only</option>
            <option value="on-open">On dashboard open</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="scan-retention">Keep scan history</Label>
          <Input
            id="scan-retention"
            value={scanRetentionRuns}
            onChange={(event) => setScanRetentionRuns(event.target.value)}
            inputMode="numeric"
            placeholder="30"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Last scheduled scan</FieldLabel>
          <DataValue size="sm">
            {lastScheduledScanAt
              ? formatDate(new Date(lastScheduledScanAt).getTime())
              : "Not yet"}
          </DataValue>
          <p className="text-xs text-muted-foreground">
            {lastScheduledScanMessage ?? "Scheduled scans run when the local app is opened or called."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ScanSection({
  scanControls,
  isPending,
  message,
  health
}: {
  scanControls: ScanControlsSectionController;
  isPending: boolean;
  message: string;
  health: SettingsScanHealth;
}) {
  const { force, setForce, saveSettings, runScan, clearData, scanResult } = scanControls;

  return (
    <Card id="scan-controls" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Scan Controls</CardTitle>
        <CardDescription>Run discovery and import locally. Duplicate files are skipped by default.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={force} onChange={(event) => setForce(event.target.checked)} />
          Force rescan files with previously imported hashes
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveSettings} disabled={isPending}>
            <RotateCcw className="h-4 w-4" />
            Save settings
          </Button>
          <Button onClick={runScan} disabled={isPending} variant="secondary">
            <Play className="h-4 w-4" />
            Scan now
          </Button>
          <Button onClick={clearData} disabled={isPending} variant="destructive">
            <Trash2 className="h-4 w-4" />
            Clear imported data
          </Button>
        </div>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <LastScanResultPanel scanResult={scanResult} health={health} />
      </CardContent>
    </Card>
  );
}
