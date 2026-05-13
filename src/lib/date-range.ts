import type { AnalyticsFilters } from "@/src/lib/analytics";

export type DateRangeKey = "all" | "today" | "7d" | "30d" | "90d" | "month" | "custom";

export type DateRangeOption = {
  key: DateRangeKey;
  label: string;
};

export type ResolvedDateRange = {
  key: DateRangeKey;
  label: string;
  filters: AnalyticsFilters;
  fromInput: string;
  toInput: string;
};

export const dateRangeOptions: DateRangeOption[] = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "month", label: "This month" }
];

type SearchInput = URLSearchParams | Record<string, string | string[] | undefined>;

function valueFrom(input: SearchInput | undefined, key: string) {
  if (!input) return undefined;
  if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function inputValue(date: Date | null) {
  if (!date) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function parseDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function customLabel(from: Date | null, toInclusive: Date | null) {
  if (from && toInclusive) return `${inputValue(from)} to ${inputValue(toInclusive)}`;
  if (from) return `Since ${inputValue(from)}`;
  if (toInclusive) return `Through ${inputValue(toInclusive)}`;
  return "All time";
}

export function resolveDateRange(input?: SearchInput, now = new Date()): ResolvedDateRange {
  const requested = valueFrom(input, "range") as DateRangeKey | undefined;
  const key: DateRangeKey =
    requested && dateRangeOptions.some((option) => option.key === requested)
      ? requested
      : requested === "custom"
        ? "custom"
        : "all";
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  if (key === "today") {
    return {
      key,
      label: "Today",
      filters: { from: today.getTime(), to: tomorrow.getTime() },
      fromInput: inputValue(today),
      toInput: inputValue(today)
    };
  }

  if (key === "7d" || key === "30d" || key === "90d") {
    const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
    const from = addDays(today, -(days - 1));
    return {
      key,
      label: `Last ${days} days`,
      filters: { from: from.getTime(), to: tomorrow.getTime() },
      fromInput: inputValue(from),
      toInput: inputValue(today)
    };
  }

  if (key === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return {
      key,
      label: monthLabel(today),
      filters: { from: from.getTime(), to: to.getTime() },
      fromInput: inputValue(from),
      toInput: inputValue(addDays(to, -1))
    };
  }

  if (key === "custom") {
    const from = parseDateInput(valueFrom(input, "from"));
    const toInclusive = parseDateInput(valueFrom(input, "to"));
    const fromTime = from?.getTime() ?? null;
    const toTime = toInclusive ? addDays(toInclusive, 1).getTime() : null;
    const validFrom = fromTime != null && (toTime == null || fromTime < toTime);
    const validTo = toTime != null && (fromTime == null || fromTime < toTime);

    return {
      key,
      label: customLabel(validFrom ? from : null, validTo ? toInclusive : null),
      filters: {
        from: validFrom ? fromTime : null,
        to: validTo ? toTime : null
      },
      fromInput: validFrom ? inputValue(from) : "",
      toInput: validTo ? inputValue(toInclusive) : ""
    };
  }

  return {
    key: "all",
    label: "All time",
    filters: {},
    fromInput: "",
    toInput: ""
  };
}

export function dateRangeQueryParams(range: ResolvedDateRange): Record<string, string | undefined> {
  if (range.key === "all") return {};
  if (range.key === "custom") {
    return {
      range: "custom",
      from: range.fromInput || undefined,
      to: range.toInput || undefined
    };
  }
  return { range: range.key };
}

export function mergeHrefParams(href: string, params: Record<string, string | undefined>) {
  const [pathname, search = ""] = href.split("?");
  const query = new URLSearchParams(search);
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}
