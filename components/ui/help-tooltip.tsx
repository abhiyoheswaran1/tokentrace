import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function HelpTooltip({
  id,
  label,
  description,
  className
}: {
  id: string;
  label: string;
  description: string;
  className?: string;
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        aria-label={`${label} details`}
        aria-describedby={id}
        className="inline-flex h-5 w-5 items-center justify-center rounded-xs text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        className="invisible pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-md border bg-card px-3 py-2 text-xs font-normal leading-relaxed text-card-foreground opacity-0 shadow-md ring-1 ring-border transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {description}
      </span>
    </span>
  );
}
