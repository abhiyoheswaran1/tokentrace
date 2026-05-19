"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/src/lib/utils";

type ScanResult = {
  filesScanned: number;
  recordsImported: number;
  costsRecalculated: number;
  unknownCostInteractions: number;
  staleNonUsageSessionsRemoved: number;
  warnings: string[];
  errors: string[];
  warningCount?: number;
  errorCount?: number;
};

type ScanStatus = {
  tone: "muted" | "success" | "error";
  message: string;
  result?: ScanResult;
};

function scanStatusClassName(tone: ScanStatus["tone"]) {
  if (tone === "success") return "text-primary";
  if (tone === "error") return "text-red-700";
  return "text-muted-foreground";
}

export function ScanNowButton({
  className,
  statusClassName,
  variant = "default",
  size = "default",
  force = false,
  folders,
  label = "Scan now"
}: {
  className?: string;
  statusClassName?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  force?: boolean;
  folders?: string[];
  label?: string;
}) {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  function runScan() {
    startTransition(async () => {
      setStatus({ tone: "muted", message: "Scanning local files..." });
      try {
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ force, folders, compact: true })
        });
        const result = (await response.json()) as Partial<ScanResult> & { error?: string };
        if (!response.ok) {
          setStatus({ tone: "error", message: result.error ?? "Scan failed." });
          return;
        }
        const filesScanned = result.filesScanned ?? 0;
        const recordsImported = result.recordsImported ?? 0;
        const costsRecalculated = result.costsRecalculated ?? 0;
        const unknownCostInteractions = result.unknownCostInteractions ?? 0;
        const staleNonUsageSessionsRemoved = result.staleNonUsageSessionsRemoved ?? 0;
        const warnings = result.warnings ?? [];
        const errors = result.errors ?? [];
        const warningCount = result.warningCount ?? result.warnings?.length ?? 0;
        const errorCount = result.errorCount ?? result.errors?.length ?? 0;
        const issueCount = warningCount + errorCount;
        setStatus({
          tone: issueCount > 0 ? "muted" : "success",
          message: "Scan complete.",
          result: {
            filesScanned,
            recordsImported,
            costsRecalculated,
            unknownCostInteractions,
            staleNonUsageSessionsRemoved,
            warnings,
            errors,
            warningCount,
            errorCount
          }
        });
      } catch {
        setStatus({ tone: "error", message: "Scan failed. Check Scan Health for details, then try again." });
      }
    });
  }

  return (
    <div className={cn("flex flex-col items-start gap-2 sm:items-end", className)}>
      <Button
        type="button"
        onClick={runScan}
        disabled={isPending}
        variant={variant}
        size={size}
        aria-label="Run local scan now"
      >
        <Play className="h-4 w-4" />
        {isPending ? "Scanning..." : label}
      </Button>
      {status ? (
        <div role="status" aria-live="polite" className={cn("max-w-[26rem] text-xs leading-5", statusClassName)}>
          <p className={scanStatusClassName(status.tone)}>{status.message}</p>
          {status.result ? (
            <div className="mt-2 rounded-md border bg-card p-2 text-left text-muted-foreground shadow-sm">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span>{status.result.filesScanned.toLocaleString()} files checked</span>
                <span>{status.result.recordsImported.toLocaleString()} records imported</span>
                <span>{(status.result.warningCount ?? status.result.warnings.length).toLocaleString()} warnings</span>
                <span>{(status.result.errorCount ?? status.result.errors.length).toLocaleString()} errors</span>
                <span>{status.result.costsRecalculated.toLocaleString()} Costs recalculated</span>
                <span>{status.result.unknownCostInteractions.toLocaleString()} unknown cost</span>
                <span>{status.result.staleNonUsageSessionsRemoved.toLocaleString()} Stale support imports removed</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <Link href="/diagnostics" className="font-medium text-primary underline-offset-2 hover:underline">Open Scan Health</Link>
                <Link href="/repair" className="font-medium text-primary underline-offset-2 hover:underline">Open repair</Link>
                <Link href="/discovery" className="font-medium text-primary underline-offset-2 hover:underline">Open Discovery</Link>
                <Link href="/pricing" className="font-medium text-primary underline-offset-2 hover:underline">Set model rate</Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
