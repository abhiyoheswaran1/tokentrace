import * as React from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateRangeOptions, type ResolvedDateRange } from "@/src/lib/date-range";

type PreservedParams = Record<string, string | null | undefined>;

function hrefWithParams(basePath: string, params: PreservedParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${basePath}?${serialized}` : basePath;
}

function rangeHref(range: string, basePath: string, preserveParams: PreservedParams) {
  const params = { ...preserveParams };
  delete params.from;
  delete params.to;
  if (range === "all") {
    delete params.range;
  } else {
    params.range = range;
  }
  return hrefWithParams(basePath, params);
}

function compactOptionLabel(key: string, label: string) {
  if (key === "all") return "All";
  if (key === "month") return "Month";
  return label;
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

export function PeriodFilter({
  range,
  basePath = "/",
  preserveParams = {}
}: {
  range: ResolvedDateRange;
  basePath?: string;
  preserveParams?: PreservedParams;
}) {
  const statusLabel = range.key === "custom" ? "Custom range" : range.label;

  return (
    <div className="min-w-0 max-w-full rounded-lg bg-card p-3 outline-solid outline-1 outline-border sm:p-4">
      <form className="max-w-full" action={basePath}>
        <input type="hidden" name="range" value="custom" />
        {Object.entries(preserveParams).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null
        )}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-3 lg:flex-nowrap">
          <div className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Period</span>
            <span className="hidden shrink-0 whitespace-nowrap rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground 2xl:inline-flex">
              {statusLabel}
            </span>
          </div>

          <div className="period-preset-scroll -mx-3 min-w-0 flex-1 overflow-x-auto px-3 sm:mx-0 sm:px-0 md:overflow-visible">
            <div className="flex w-max items-center gap-1.5 pr-1 md:w-auto md:flex-wrap">
              {dateRangeOptions.map((option) => (
                <Button
                  key={option.key}
                  asChild
                  size="sm"
                  variant={range.key === option.key ? "default" : "outline"}
                  className="px-2.5"
                >
                  <Link href={rangeHref(option.key, basePath, preserveParams)}>
                    {compactOptionLabel(option.key, option.label)}
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          <div className="period-custom-row ml-auto flex min-w-0 flex-wrap items-center gap-2 shrink-0 lg:flex-nowrap">
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
