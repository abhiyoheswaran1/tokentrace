import * as React from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateRangeOptions, type ResolvedDateRange } from "@/src/lib/date-range";

function rangeHref(range: string) {
  return range === "all" ? "/" : `/?range=${range}`;
}

export function PeriodFilter({ range }: { range: ResolvedDateRange }) {
  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4">
      <form className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-3" action="/">
        <input type="hidden" name="range" value="custom" />
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0">Period</span>
          <Badge variant="secondary" className="max-w-[9rem] truncate sm:max-w-[16rem]">
            {range.label}
          </Badge>
        </div>
        <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1">
          <div className="ml-auto flex min-w-max items-center gap-2">
            <div className="flex items-center gap-1.5">
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
            <div className="h-6 w-px shrink-0 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Custom</span>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>From</span>
                <Input type="date" name="from" defaultValue={range.fromInput} className="h-8 w-[9.5rem]" />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>To</span>
                <Input type="date" name="to" defaultValue={range.toInput} className="h-8 w-[9.5rem]" />
              </label>
              <Button size="sm" type="submit" variant={range.key === "custom" ? "default" : "outline"}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
