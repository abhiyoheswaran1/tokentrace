"use client";

import { useState, useTransition } from "react";
import type { UnknownCostRepairStatus } from "@/src/lib/unknown-cost-repair";

type RepairStateControlProps = {
  repairKey: string;
  initialStatus: UnknownCostRepairStatus;
  initialNotes: string;
};

const states: Array<{ value: UnknownCostRepairStatus; label: string }> = [
  { value: "unresolved", label: "Unresolved" },
  { value: "needs-parser-review", label: "Parser review" },
  { value: "ignored", label: "Ignored" },
  { value: "resolved", label: "Resolved" }
];

export function RepairStateControl({
  repairKey,
  initialStatus,
  initialNotes
}: RepairStateControlProps) {
  const [status, setStatus] = useState<UnknownCostRepairStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function save(nextStatus = status, nextNotes = notes) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/repair-items", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: repairKey,
          status: nextStatus,
          notes: nextNotes
        })
      });

      if (!response.ok) {
        setMessage("Save failed");
        return;
      }

      setMessage("Saved");
    });
  }

  return (
    <div className="min-w-44 space-y-2">
      <select
        aria-label="Repair state"
        className="h-8 w-full rounded-md border bg-card px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={status}
        disabled={isPending}
        onChange={(event) => {
          const nextStatus = event.target.value as UnknownCostRepairStatus;
          setStatus(nextStatus);
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
        {isPending ? "Saving..." : message}
      </div>
    </div>
  );
}
