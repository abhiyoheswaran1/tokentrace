"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Eye, FolderPlus, Gauge, Play, Plus, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import type { ScanHealth } from "@/src/lib/scan-health";
import type { ImportProfile } from "@/src/lib/import-profiles";
import type { ScanSchedule, ScanScheduleMode } from "@/src/lib/scan-schedule";
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
    scoped: ScopedGuardrail[];
  };
  importProfiles: ImportProfile[];
  scanSchedule: ScanSchedule;
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
  warningCount?: number;
  errorCount?: number;
};

export type SettingsScanHealth = Pick<
  ScanHealth,
  "latestRun" | "headline" | "tone" | "latestWarnings" | "latestErrors"
> & {
  costCoverage: Pick<ScanHealth["costCoverage"], "priced" | "unknown" | "total">;
};

type ScopedGuardrail = {
  id: string;
  scope: "project" | "model" | "tool";
  name: string;
  monthlyCostLimitUsd: number | null;
  monthlyTokenLimit: number | null;
  warningThreshold: number;
};

type ImportPreviewResult = {
  detected: boolean;
  adapterName: string | null;
  confidence: number;
  reason: string | null;
  recommendedMatchers: string[];
  fields: string[];
  warnings: string[];
  errors: string[];
  preview: {
    sessions: number;
    interactions: number;
  };
};

const SETTINGS_SECTION_IDS = [
  "scan-controls",
  "custom-folders",
  "import-profiles",
  "usage-guardrails",
  "package-trust",
  "scan-scheduling",
  "local-exports"
] as const;

const SETTINGS_SECTIONS: Array<{ id: (typeof SETTINGS_SECTION_IDS)[number]; label: string; detail: string }> = [
  { id: "scan-controls", label: "Scan Controls", detail: "Run Scan now and review the last result." },
  { id: "custom-folders", label: "Custom Folders", detail: "Add local folders outside the defaults." },
  { id: "import-profiles", label: "Import Profiles", detail: "Preview and enable local log conventions." },
  { id: "usage-guardrails", label: "Guardrails", detail: "Set local limits for cost and tokens." },
  { id: "package-trust", label: "Package Trust", detail: "Check package and supply-chain posture." },
  { id: "scan-scheduling", label: "Schedule", detail: "Control when local scans run." },
  { id: "local-exports", label: "Exports", detail: "Download local reports and evidence." }
];

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

function SettingsSectionNav() {
  return (
    <nav
      aria-label="Settings sections"
      className="sticky top-2 z-20 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <div className="sticky left-0 shrink-0 bg-background/95 pr-2 text-xs font-semibold text-foreground">
          Settings sections
        </div>
        {SETTINGS_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            title={section.detail}
            className="inline-flex h-8 shrink-0 items-center rounded-md border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
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

export function SettingsPanel({
  initialSettings,
  initialScanHealth
}: {
  initialSettings: SettingsPayload;
  initialScanHealth: SettingsScanHealth;
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
  const [importProfiles, setImportProfiles] = useState(initialSettings.importProfiles);
  const [newProfileLabel, setNewProfileLabel] = useState("");
  const [newProfileMatchers, setNewProfileMatchers] = useState("");
  const [scanScheduleMode, setScanScheduleMode] = useState<ScanScheduleMode>(initialSettings.scanSchedule.mode);
  const [scanRetentionRuns, setScanRetentionRuns] = useState(String(initialSettings.scanSchedule.retentionRuns));
  const [scopedGuardrails, setScopedGuardrails] = useState<ScopedGuardrail[]>(initialSettings.usageGuardrails.scoped ?? []);
  const [newGuardrailScope, setNewGuardrailScope] = useState<ScopedGuardrail["scope"]>("project");
  const [newGuardrailName, setNewGuardrailName] = useState("");
  const [newGuardrailCost, setNewGuardrailCost] = useState("");
  const [newGuardrailTokens, setNewGuardrailTokens] = useState("");
  const [newGuardrailThreshold, setNewGuardrailThreshold] = useState("0.8");
  const [previewPath, setPreviewPath] = useState("");
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [force, setForce] = useState(false);
  const [message, setMessage] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function scrollToHash() {
      const id = window.location.hash.slice(1) as (typeof SETTINGS_SECTION_IDS)[number];
      if (!SETTINGS_SECTION_IDS.includes(id)) return;
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      });
    }

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

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
        monthlyTokenLimit: parseLimitInput(monthlyTokenLimit),
        scoped: scopedGuardrails
      },
      importProfiles,
      scanSchedule: {
        mode: scanScheduleMode,
        retentionRuns: parseLimitInput(scanRetentionRuns) ?? 30,
        lastScheduledScanAt: initialSettings.scanSchedule.lastScheduledScanAt ?? null,
        lastScheduledScanStatus: initialSettings.scanSchedule.lastScheduledScanStatus ?? null,
        lastScheduledScanMessage: initialSettings.scanSchedule.lastScheduledScanMessage ?? null
      }
    };
  }

  function addScopedGuardrail() {
    const name = newGuardrailName.trim();
    if (!name) return;
    const id = `${newGuardrailScope}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guardrail"}`;
    const next: ScopedGuardrail = {
      id,
      scope: newGuardrailScope,
      name,
      monthlyCostLimitUsd: parseLimitInput(newGuardrailCost),
      monthlyTokenLimit: parseLimitInput(newGuardrailTokens),
      warningThreshold: parseLimitInput(newGuardrailThreshold) ?? 0.8
    };
    setScopedGuardrails((current) => [next, ...current.filter((item) => item.id !== id)]);
    setNewGuardrailName("");
    setNewGuardrailCost("");
    setNewGuardrailTokens("");
    setNewGuardrailThreshold("0.8");
  }

  function removeScopedGuardrail(id: string) {
    setScopedGuardrails((current) => current.filter((item) => item.id !== id));
  }

  function toggleImportProfile(id: string) {
    setImportProfiles((current) =>
      current.map((profile) =>
        profile.id === id ? { ...profile, enabled: !profile.enabled } : profile
      )
    );
  }

  function addImportProfile() {
    const label = newProfileLabel.trim();
    const matchers = newProfileMatchers
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!label || !matchers.length) return;
    const id = `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profile"}`;
    setImportProfiles((current) => [
      ...current.filter((profile) => profile.id !== id),
      {
        id,
        label,
        kind: "text-log",
        description: "Custom local log convention.",
        matchers,
        enabled: true,
        builtIn: false
      }
    ]);
    setNewProfileLabel("");
    setNewProfileMatchers("");
  }

  function removeImportProfile(id: string) {
    setImportProfiles((current) => current.filter((profile) => profile.id !== id || profile.builtIn));
  }

  function previewImportProfile() {
    const filePath = previewPath.trim();
    if (!filePath) return;
    startTransition(async () => {
      setMessage("Previewing local file...");
      setPreviewResult(null);
      const response = await fetch("/api/import-profile-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filePath, storeRawMessageContent: storeRaw })
      });
      const result = await response.json();
      if (response.ok) {
        setPreviewResult(result as ImportPreviewResult);
        setMessage("Preview complete.");
        if (Array.isArray(result.recommendedMatchers) && result.recommendedMatchers.length > 0) {
          setNewProfileMatchers(result.recommendedMatchers.join(", "));
        }
      } else {
        setMessage(typeof result.error === "string" ? result.error : "Preview failed.");
      }
    });
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
        body: JSON.stringify({ force, compact: true })
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
      <SettingsSectionNav />

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

      <Card id="package-trust" className="scroll-mt-28">
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
              detail: "No telemetry. Optional model-rate refresh downloads only public provider rates."
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

      <Card id="usage-guardrails" className="scroll-mt-28">
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
          <CardTitle>Scoped Guardrails</CardTitle>
          <CardDescription>
            Optional project, model, or tool limits with custom warning thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 lg:grid-cols-[9rem_minmax(0,1fr)_8rem_8rem_7rem_auto]">
            <select
              className="h-9 rounded-md border bg-card px-3 text-sm"
              value={newGuardrailScope}
              onChange={(event) => setNewGuardrailScope(event.target.value as ScopedGuardrail["scope"])}
              aria-label="Guardrail scope"
            >
              <option value="project">Project</option>
              <option value="model">Model</option>
              <option value="tool">Tool</option>
            </select>
            <Input value={newGuardrailName} onChange={(event) => setNewGuardrailName(event.target.value)} placeholder="TokenTrace or gpt-5.4" />
            <Input value={newGuardrailCost} onChange={(event) => setNewGuardrailCost(event.target.value)} inputMode="decimal" placeholder="$ limit" />
            <Input value={newGuardrailTokens} onChange={(event) => setNewGuardrailTokens(event.target.value)} inputMode="numeric" placeholder="tokens" />
            <Input value={newGuardrailThreshold} onChange={(event) => setNewGuardrailThreshold(event.target.value)} inputMode="decimal" placeholder="0.8" />
            <Button type="button" variant="outline" onClick={addScopedGuardrail}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {scopedGuardrails.length ? (
              scopedGuardrails.map((guardrail) => (
                <div key={guardrail.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{guardrail.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {guardrail.scope} / cost {guardrail.monthlyCostLimitUsd ?? "off"} / tokens {guardrail.monthlyTokenLimit ?? "off"} / warn {(guardrail.warningThreshold * 100).toFixed(0)}%
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeScopedGuardrail(guardrail.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No scoped guardrails configured.</p>
            )}
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
              {initialSettings.scanSchedule.lastScheduledScanAt
                ? formatDate(new Date(initialSettings.scanSchedule.lastScheduledScanAt).getTime())
                : "Not yet"}
            </DataValue>
            <p className="text-xs text-muted-foreground">
              {initialSettings.scanSchedule.lastScheduledScanMessage ?? "Scheduled scans run when the local app is opened or called."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card id="custom-folders" className="scroll-mt-28">
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

      <Card id="import-profiles" className="scroll-mt-28">
        <CardHeader>
          <CardTitle>Import Profiles</CardTitle>
          <CardDescription>
            Safe local log conventions for wrappers and team tools. Profiles add file matchers and evidence labels; prompts are still not sent anywhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            {importProfiles.map((profile) => (
              <div key={profile.id} className="rounded-md border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{profile.label}</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{profile.description}</div>
                  </div>
                  <Badge variant={profile.enabled ? "success" : "secondary"}>
                    {profile.enabled ? "enabled" : "off"}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {profile.matchers.map((matcher) => (
                    <code key={matcher} className="rounded bg-muted px-1.5 py-0.5 text-xs">{matcher}</code>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => toggleImportProfile(profile.id)}>
                    {profile.enabled ? "Disable" : "Enable"}
                  </Button>
                  {!profile.builtIn ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeImportProfile(profile.id)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-2 border-t pt-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
            <Input
              value={newProfileLabel}
              onChange={(event) => setNewProfileLabel(event.target.value)}
              placeholder="Team wrapper logs"
            />
            <Input
              value={newProfileMatchers}
              onChange={(event) => setNewProfileMatchers(event.target.value)}
              placeholder=".ndjson, usage-log, agent-run"
            />
            <Button type="button" variant="outline" onClick={addImportProfile}>
              <FolderPlus className="h-4 w-4" />
              Add profile
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Extension matchers like <code>.ndjson</code> are added to discovery. Text matchers label evidence when the matched file is imported by a compatible parser.
          </p>
          <div className="space-y-3 rounded-md border p-3">
            <div>
              <FieldLabel>Preview a local file</FieldLabel>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Sample a file before saving matchers. Preview output excludes raw prompt and message text.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={previewPath} onChange={(event) => setPreviewPath(event.target.value)} placeholder="~/Library/Logs/team-ai/usage.jsonl" />
              <Button type="button" variant="outline" onClick={previewImportProfile} disabled={isPending}>
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </div>
            {previewResult ? (
              <div className="grid gap-3 border-t pt-3 text-sm md:grid-cols-4">
                <div>
                  <FieldLabel>Detected</FieldLabel>
                  <DataValue size="sm">{previewResult.detected ? "Yes" : "No"}</DataValue>
                </div>
                <div>
                  <FieldLabel>Adapter</FieldLabel>
                  <DataValue size="sm">{previewResult.adapterName ?? "None"}</DataValue>
                </div>
                <div>
                  <FieldLabel>Preview records</FieldLabel>
                  <DataValue size="sm">{previewResult.preview.sessions} / {previewResult.preview.interactions}</DataValue>
                </div>
                <div>
                  <FieldLabel>Matchers</FieldLabel>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {previewResult.recommendedMatchers.map((matcher) => (
                      <code key={matcher} className="rounded bg-muted px-1.5 py-0.5 text-xs">{matcher}</code>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-4">
                  <FieldLabel>Fields</FieldLabel>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {previewResult.fields.slice(0, 14).join(", ") || "No structured fields detected."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

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
          <LastScanResultPanel scanResult={scanResult} health={initialScanHealth} />
        </CardContent>
      </Card>

      <Card id="local-exports" className="scroll-mt-28">
        <CardHeader>
          <CardTitle>Local Exports</CardTitle>
          <CardDescription>
            Privacy-safe operating artifacts for reports, evidence, and agent handoff. Raw prompt text is excluded by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 border-y p-4 md:grid-cols-3">
          {[
            { label: "Weekly report", href: "/api/reports?type=weekly-usage&format=markdown" },
            { label: "Source coverage", href: "/api/reports?type=source-coverage&format=markdown" },
            { label: "Operating metadata", href: "/api/operating-metadata" }
          ].map((item) => (
            <Button key={item.href} asChild variant="outline">
              <a href={item.href}>
                <Download className="h-4 w-4" />
                {item.label}
              </a>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
