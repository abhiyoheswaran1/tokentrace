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
  unknownCostInteractions: number;
  warnings: string[];
  errors: string[];
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
          body: JSON.stringify({ force, folders })
        });
        const result = (await response.json()) as Partial<ScanResult> & { error?: string };
        if (!response.ok) {
          setStatus({ tone: "error", message: result.error ?? "Scan failed." });
          return;
        }
        const filesScanned = result.filesScanned ?? 0;
        const recordsImported = result.recordsImported ?? 0;
        const unknownCostInteractions = result.unknownCostInteractions ?? 0;
        const warnings = result.warnings ?? [];
        const errors = result.errors ?? [];
        const issueCount = (result.warnings?.length ?? 0) + (result.errors?.length ?? 0);
        setStatus({
          tone: issueCount > 0 ? "muted" : "success",
          message: "Scan complete.",
          result: {
            filesScanned,
            recordsImported,
            unknownCostInteractions,
            warnings,
            errors
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
                <span>{status.result.warnings.length.toLocaleString()} warnings</span>
                <span>{status.result.unknownCostInteractions.toLocaleString()} unknown cost</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <Link href="/diagnostics" className="font-medium text-primary underline-offset-2 hover:underline">Scan Health</Link>
                <Link href="/repair" className="font-medium text-primary underline-offset-2 hover:underline">Repair</Link>
                <Link href="/discovery" className="font-medium text-primary underline-offset-2 hover:underline">Discovery</Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
