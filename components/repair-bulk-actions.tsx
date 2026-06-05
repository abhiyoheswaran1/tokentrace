"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import type { UnknownCostRepairStatus } from "@/src/lib/unknown-cost-repair";
import { useJsonRequest } from "@/components/hooks/use-json-request";
import { Button } from "@/components/ui/button";

const statusOptions: Array<{ value: UnknownCostRepairStatus; label: string }> = [
  { value: "resolved", label: "Mark verified" },
  { value: "needs-parser-review", label: "Needs parser review" },
  { value: "ignored", label: "Ignore for now" },
  { value: "unresolved", label: "Reopen" }
];

export function RepairBulkActions({
  keys,
  modelRatesHref,
  scanHealthHref
}: {
  keys: string[];
  modelRatesHref: string;
  scanHealthHref: string;
}) {
  const [status, setStatus] = useState<UnknownCostRepairStatus>("resolved");
  const [message, setMessage] = useState("");
  const { isPending, error, send } = useJsonRequest("Bulk update failed.");
  const note = error ?? message;

  function applyBulkStatus() {
    setMessage("");
    send(
      "/api/repair-items",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keys,
          status,
          notes: status === "resolved" ? "Bulk verified from Repair Workbench." : "Bulk state update from Repair Workbench."
        })
      },
      () => {
        setMessage("Bulk update saved.");
        window.location.reload();
      }
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold">Bulk workbench</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Apply a review state to the visible repair groups, then recalculate by setting model rates or running Scan Health.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Bulk repair status"
          className="h-9 rounded-md border bg-card px-3 text-sm"
          value={status}
          disabled={isPending || !keys.length}
          onChange={(event) => setStatus(event.target.value as UnknownCostRepairStatus)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={applyBulkStatus} disabled={isPending || !keys.length}>
          <CheckCircle2 className="h-4 w-4" />
          Apply to {keys.length.toLocaleString()}
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={modelRatesHref}>Set model rate <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={scanHealthHref}>Recalculate <RotateCcw className="h-4 w-4" /></Link>
        </Button>
      </div>
      {note ? <div className="text-xs text-muted-foreground" aria-live="polite">{note}</div> : null}
    </div>
  );
}
