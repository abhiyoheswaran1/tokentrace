"use client";

import { useState, useTransition } from "react";
import type { UnknownCostRepairCause, UnknownCostRepairStatus } from "@/src/lib/unknown-cost-repair";
import { Badge } from "@/components/ui/badge";

type RepairStateControlProps = {
  repairKey: string;
  initialStatus: UnknownCostRepairStatus;
  initialNotes: string;
  sourceFile: string;
  model: string;
  provider: string;
  cause: UnknownCostRepairCause;
};

const states: Array<{ value: UnknownCostRepairStatus; label: string }> = [
  { value: "unresolved", label: "Unresolved" },
  { value: "needs-parser-review", label: "Parser review" },
  { value: "ignored", label: "Ignored" },
  { value: "resolved", label: "Resolved" }
];

function statusDescription(status: UnknownCostRepairStatus) {
  if (status === "resolved") return "Resolved means the local fix has been verified.";
  if (status === "ignored") return "Ignored stays in evidence but leaves active repair focus.";
  if (status === "needs-parser-review") return "Parser review means source metadata needs inspection.";
  return "Unresolved means this item still needs a repair decision.";
}

function statusVariant(status: UnknownCostRepairStatus) {
  if (status === "resolved") return "success";
  if (status === "ignored") return "secondary";
  if (status === "needs-parser-review") return "warning";
  return "destructive";
}

export function RepairStateControl({
  repairKey,
  initialStatus,
  initialNotes,
  sourceFile,
  model,
  provider,
  cause
}: RepairStateControlProps) {
  const [status, setStatus] = useState<UnknownCostRepairStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function save(nextStatus = status, nextNotes = notes) {
    startTransition(async () => {
      setMessage("");
      setError("");
      const response = await fetch("/api/repair-items", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: repairKey,
          status: nextStatus,
          notes: nextNotes,
          sourceFile,
          model,
          provider,
          cause
        })
      });

      if (!response.ok) {
        setError("Save failed");
        return;
      }

      setStatus(nextStatus);
      setNotes(nextNotes);
      setMessage("Saved");
    });
  }

  return (
    <div className="min-w-44 space-y-2">
      <Badge variant={statusVariant(status)}>{status}</Badge>
      <select
        aria-label="Repair state"
        className="h-8 w-full rounded-md border bg-card px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={status}
        disabled={isPending}
        onChange={(event) => {
          const nextStatus = event.target.value as UnknownCostRepairStatus;
          save(nextStatus, notes);
        }}
      >
        {states.map((state) => (
          <option key={state.value} value={state.value}>
            {state.label}
          </option>
        ))}
      </select>
      <input
        aria-label="Repair note"
        className="h-8 w-full rounded-md border bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={notes}
        maxLength={500}
        disabled={isPending}
        placeholder="Local note"
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => save(status, notes)}
      />
      <div className="h-3 text-[11px] leading-none text-muted-foreground" aria-live="polite">
        {isPending ? "Saving..." : error || message}
      </div>
      <div className="text-[11px] leading-4 text-muted-foreground">
        {statusDescription(status)}
      </div>
    </div>
  );
}
