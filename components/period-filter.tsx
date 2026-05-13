import * as React from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateRangeOptions, type ResolvedDateRange } from "@/src/lib/date-range";

function rangeHref(range: string) {
  return range === "all" ? "/" : `/?range=${range}`;
}

function PeriodDateField({
  label,
  name,
  defaultValue
}: {
  label: string;
  name: "from" | "to";
  defaultValue: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="period-date-field relative block h-8 w-32 shrink-0">
        <Input
          type="date"
          name={name}
          defaultValue={defaultValue}
          className="period-date-input h-8 w-32 appearance-none pr-9"
        />
        <CalendarDays className="period-date-icon pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}

export function PeriodFilter({ range }: { range: ResolvedDateRange }) {
  const statusLabel = range.key === "custom" ? "Custom range" : range.label;

  return (
    <div className="min-w-0 max-w-full rounded-lg bg-card p-3 outline outline-1 outline-border sm:p-4">
      <form className="max-w-full" action="/">
        <input type="hidden" name="range" value="custom" />
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex shrink-0 items-center gap-2 pr-1 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>Period</span>
              <span className="hidden whitespace-nowrap rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground 2xl:inline-flex">
                {statusLabel}
              </span>
            </div>
            <div className="h-6 w-px shrink-0 bg-border" />
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="flex w-max items-center gap-1.5 pr-1">
                {dateRangeOptions.map((option) => (
                  <Button
                    key={option.key}
                    asChild
                    size="sm"
                    variant={range.key === option.key ? "default" : "outline"}
                  >
                    <Link href={rangeHref(option.key)}>{option.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden h-6 w-px shrink-0 bg-border xl:block" />
          <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border pt-3 xl:shrink-0 xl:border-t-0 xl:pt-0">
            <PeriodDateField label="From" name="from" defaultValue={range.fromInput} />
            <PeriodDateField label="To" name="to" defaultValue={range.toInput} />
            <Button size="sm" type="submit" variant={range.key === "custom" ? "default" : "outline"}>
              Apply
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
