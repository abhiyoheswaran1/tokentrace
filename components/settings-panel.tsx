"use client";

import { useState, useTransition } from "react";
import { FolderPlus, Gauge, Play, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import type { ScanHealth } from "@/src/lib/scan-health";
import { formatAppVersion } from "@/src/lib/app-version";
import { formatDate, percent } from "@/src/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataValue, FieldLabel, MonoText } from "@/components/ui/typography";

type SettingsPayload = {
  customFolders: string[];
  storeRawMessageContent: boolean;
  usageGuardrails: {
    monthlyCostLimitUsd: number | null;
    monthlyTokenLimit: number | null;
  };
  databasePath: string;
  appVersion: string;
};

type ScanResult = {
  scanRunId: string;
  filesScanned: number;
  recordsImported: number;
  costsRecalculated: number;
  modelAliasesUpdated: number;
  unknownCostInteractions: number;
  staleNonUsageSessionsRemoved: number;
  warnings: string[];
  errors: string[];
};

function toneVariant(tone: ScanHealth["tone"]) {
  if (tone === "success") return "success";
  if (tone === "destructive") return "destructive";
  if (tone === "warning") return "warning";
  return "secondary";
}

function parseLimitInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function SettingsPanel({
  initialSettings,
  initialScanHealth
}: {
  initialSettings: SettingsPayload;
  initialScanHealth: ScanHealth;
}) {
  const [customFolders, setCustomFolders] = useState(initialSettings.customFolders);
  const [storeRaw, setStoreRaw] = useState(initialSettings.storeRawMessageContent);
  const [monthlyCostLimitUsd, setMonthlyCostLimitUsd] = useState(
    initialSettings.usageGuardrails.monthlyCostLimitUsd?.toString() ?? ""
  );
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState(
    initialSettings.usageGuardrails.monthlyTokenLimit?.toString() ?? ""
  );
  const [newFolder, setNewFolder] = useState("");
  const [force, setForce] = useState(false);
  const [message, setMessage] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function addFolder() {
    const folder = newFolder.trim();
    if (!folder) return;
    if (!customFolders.includes(folder)) setCustomFolders((current) => [...current, folder]);
    setNewFolder("");
  }

  function removeFolder(folder: string) {
    setCustomFolders((current) => current.filter((item) => item !== folder));
  }

  function settingsPayload() {
    return {
      customFolders,
      storeRawMessageContent: storeRaw,
      usageGuardrails: {
        monthlyCostLimitUsd: parseLimitInput(monthlyCostLimitUsd),
        monthlyTokenLimit: parseLimitInput(monthlyTokenLimit)
      }
    };
  }

  function saveSettings() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settingsPayload())
      });
      setMessage(response.ok ? "Settings saved." : "Settings save failed.");
    });
  }

  function runScan() {
    startTransition(async () => {
      setMessage("Scanning local files...");
      setScanResult(null);
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settingsPayload())
      });
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force })
      });
      const result = (await response.json()) as ScanResult;
      setScanResult(result);
      setMessage(response.ok ? "Scan complete." : "Scan failed.");
    });
  }

  function clearData() {
    if (!window.confirm("Clear imported sessions, interactions, projects, and scan history?")) return;
    startTransition(async () => {
      const response = await fetch("/api/data", { method: "DELETE" });
      setMessage(response.ok ? "Imported data cleared." : "Clear failed.");
      setScanResult(null);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Local Storage</CardTitle>
          <CardDescription>SQLite database location and raw-content controls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Database path</Label>
            <pre className="overflow-x-auto rounded-md bg-muted/40 p-3">
              <MonoText>{initialSettings.databasePath}</MonoText>
            </pre>
          </div>
          <div className="grid border-y sm:grid-cols-2 sm:divide-x">
            <div className="p-3">
              <FieldLabel>TokenTrace version</FieldLabel>
              <DataValue className="mt-1">{formatAppVersion(initialSettings.appVersion)}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Release channel</FieldLabel>
              <DataValue className="mt-1">Local npm package</DataValue>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm">
            <input
              type="checkbox"
              checked={storeRaw}
              onChange={(event) => setStoreRaw(event.target.checked)}
            />
            Store raw message content
            <Badge variant={storeRaw ? "warning" : "success"}>
              {storeRaw ? "On" : "Default off"}
            </Badge>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Package Trust
          </CardTitle>
          <CardDescription>
            Runtime and release guarantees for the installed TokenTrace package.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid border-y md:grid-cols-3 md:divide-x">
          {[
            {
              label: "Install scripts",
              value: "None",
              detail: "The TokenTrace package has no preinstall, install, or postinstall lifecycle scripts."
            },
            {
              label: "Network behavior",
              value: "Local first",
              detail: "No telemetry. Optional pricing refresh downloads only public model prices."
            },
            {
              label: "Release proof",
              value: "Tag based",
              detail: "npm releases publish through GitHub Trusted Publishing."
            }
          ].map((item) => (
            <div key={item.label} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <FieldLabel>{item.label}</FieldLabel>
                <Badge variant="success">checked</Badge>
              </div>
              <DataValue className="mt-1" size="md">{item.value}</DataValue>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Local Usage Guardrails
          </CardTitle>
          <CardDescription>
            Optional month-to-date limits for local cost and token awareness.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 border-y p-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="monthly-cost-limit">Monthly cost limit</Label>
            <Input
              id="monthly-cost-limit"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={monthlyCostLimitUsd}
              onChange={(event) => setMonthlyCostLimitUsd(event.target.value)}
              placeholder="250"
            />
            <p className="text-xs text-muted-foreground">USD limit for imported CLI usage this calendar month.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly-token-limit">Monthly token limit</Label>
            <Input
              id="monthly-token-limit"
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              value={monthlyTokenLimit}
              onChange={(event) => setMonthlyTokenLimit(event.target.value)}
              placeholder="10000000"
            />
            <p className="text-xs text-muted-foreground">Leave either field blank to disable that guardrail.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Scan Memory
            <Badge variant={toneVariant(initialScanHealth.tone)}>{initialScanHealth.headline}</Badge>
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
                {initialScanHealth.latestRun
                  ? formatDate(initialScanHealth.latestRun.completedAt ?? initialScanHealth.latestRun.startedAt)
                  : "Never"}
              </DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Files scanned</FieldLabel>
              <DataValue className="mt-1">
                {initialScanHealth.latestRun?.filesScanned.toLocaleString() ?? "0"}
              </DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Records imported</FieldLabel>
              <DataValue className="mt-1">
                {initialScanHealth.latestRun?.recordsImported.toLocaleString() ?? "0"}
              </DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Priced interactions</FieldLabel>
              <DataValue className="mt-1">
                {percent(
                  initialScanHealth.costCoverage.total
                    ? initialScanHealth.costCoverage.priced / initialScanHealth.costCoverage.total
                    : 0
                )}
              </DataValue>
            </div>
          </div>
          <p className="max-w-[65ch] text-sm text-muted-foreground">
            {initialScanHealth.latestRun
              ? "Data is current as of the latest scan. Run Scan now after new Claude, Codex, or other AI CLI sessions."
              : "No scan has run yet. Start with the default folders, then add custom folders if expected files are missing."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Folders</CardTitle>
          <CardDescription>Add folders outside the default Claude, Codex, OpenAI, and project paths.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newFolder}
              onChange={(event) => setNewFolder(event.target.value)}
              placeholder="~/Library/Logs/my-ai-cli"
            />
            <Button type="button" variant="outline" onClick={addFolder}>
              <FolderPlus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {customFolders.length ? (
              customFolders.map((folder) => (
                <div key={folder} className="flex items-center justify-between gap-3 border-y py-2">
                  <MonoText className="min-w-0 truncate text-muted-foreground">{folder}</MonoText>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeFolder(folder)}>
                    Remove
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No custom folders configured.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
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
          {scanResult ? (
            <div className="grid border-y text-sm sm:grid-cols-4 sm:divide-x">
              <div className="p-3">
                <FieldLabel>Files scanned</FieldLabel>
                <DataValue>{scanResult.filesScanned.toLocaleString()}</DataValue>
              </div>
              <div className="p-3">
                <FieldLabel>Records imported</FieldLabel>
                <DataValue>{scanResult.recordsImported.toLocaleString()}</DataValue>
              </div>
              <div className="p-3">
                <FieldLabel>Warnings</FieldLabel>
                <DataValue>{scanResult.warnings.length.toLocaleString()}</DataValue>
              </div>
              <div className="p-3">
                <FieldLabel>Errors</FieldLabel>
                <DataValue>{scanResult.errors.length.toLocaleString()}</DataValue>
              </div>
              <div className="p-3">
                <FieldLabel>Costs recalculated</FieldLabel>
                <DataValue>{scanResult.costsRecalculated.toLocaleString()}</DataValue>
              </div>
              <div className="p-3">
                <FieldLabel>Unknown cost</FieldLabel>
                <DataValue>{scanResult.unknownCostInteractions.toLocaleString()}</DataValue>
              </div>
              <div className="p-3">
                <FieldLabel>Stale support imports removed</FieldLabel>
                <DataValue>{scanResult.staleNonUsageSessionsRemoved.toLocaleString()}</DataValue>
              </div>
              <div className="p-3 sm:col-span-2">
                <FieldLabel>Next step</FieldLabel>
                <a className="font-medium text-primary underline-offset-4 hover:underline" href="/diagnostics">
                  Review scan doctor
                </a>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
