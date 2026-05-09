"use client";

import { useState, useTransition } from "react";
import { FolderPlus, Play, RotateCcw, Trash2 } from "lucide-react";
import type { ScanHealth } from "@/src/lib/scan-health";
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
  databasePath: string;
};

type ScanResult = {
  scanRunId: string;
  filesScanned: number;
  recordsImported: number;
  costsRecalculated: number;
  modelAliasesUpdated: number;
  unknownCostInteractions: number;
  warnings: string[];
  errors: string[];
};

function toneVariant(tone: ScanHealth["tone"]) {
  if (tone === "success") return "success";
  if (tone === "destructive") return "destructive";
  if (tone === "warning") return "warning";
  return "secondary";
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

  function saveSettings() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customFolders,
          storeRawMessageContent: storeRaw
        })
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
        body: JSON.stringify({
          customFolders,
          storeRawMessageContent: storeRaw
        })
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
            <div className="rounded-md border bg-muted/40 p-3">
              <MonoText>{initialSettings.databasePath}</MonoText>
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
          <CardTitle className="flex flex-wrap items-center gap-2">
            Scan Memory
            <Badge variant={toneVariant(initialScanHealth.tone)}>{initialScanHealth.headline}</Badge>
          </CardTitle>
          <CardDescription>
            TokenTrace keeps scan history locally so you can see freshness and review what changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid overflow-hidden rounded-md border sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="text-sm text-muted-foreground">
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
                <div key={folder} className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-2">
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
            <div className="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm sm:grid-cols-4">
              <div>
                <FieldLabel>Files scanned</FieldLabel>
                <DataValue>{scanResult.filesScanned.toLocaleString()}</DataValue>
              </div>
              <div>
                <FieldLabel>Records imported</FieldLabel>
                <DataValue>{scanResult.recordsImported.toLocaleString()}</DataValue>
              </div>
              <div>
                <FieldLabel>Warnings</FieldLabel>
                <DataValue>{scanResult.warnings.length.toLocaleString()}</DataValue>
              </div>
              <div>
                <FieldLabel>Errors</FieldLabel>
                <DataValue>{scanResult.errors.length.toLocaleString()}</DataValue>
              </div>
              <div>
                <FieldLabel>Costs recalculated</FieldLabel>
                <DataValue>{scanResult.costsRecalculated.toLocaleString()}</DataValue>
              </div>
              <div>
                <FieldLabel>Unknown cost</FieldLabel>
                <DataValue>{scanResult.unknownCostInteractions.toLocaleString()}</DataValue>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Next step</FieldLabel>
                <a className="font-medium text-primary underline-offset-4 hover:underline" href="/diagnostics">
                  Review scan health and parser diagnostics
                </a>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
