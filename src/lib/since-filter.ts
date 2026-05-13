import type { AnalyticsFilters } from "@/src/lib/analytics";

export type SinceFilter = {
  label: string;
  filters: AnalyticsFilters;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

export function resolveSinceFilter(
  value: string | null | undefined,
  options: {
    now?: Date;
    latestScanStartedAt?: number | null;
  } = {}
): SinceFilter {
  if (!value) return { label: "All time", filters: {} };
  const now = options.now ?? new Date();
  const normalized = value.trim().toLowerCase();

  if (normalized === "last-scan") {
    return options.latestScanStartedAt != null
      ? {
          label: "Since latest scan",
          filters: { from: options.latestScanStartedAt, to: undefined }
        }
      : { label: "All time", filters: {} };
  }

  if (normalized === "yesterday") {
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return {
      label: "Since yesterday",
      filters: { from: yesterday.getTime(), to: undefined }
    };
  }

  const date = parseIsoDate(value.trim());
  if (date) {
    return {
      label: `Since ${value.trim()}`,
      filters: { from: date.getTime(), to: undefined }
    };
  }

  throw new Error(`Unsupported --since value: ${value}`);
}
