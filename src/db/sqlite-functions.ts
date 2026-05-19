import type { Database as SqliteDatabase } from "better-sqlite3";

export const localDateKeyFunctionName = "local_date_key";

const invalidDateKey = "1970-01-01";

function timestampNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

export function formatLocalDateKey(value: unknown) {
  const timestamp = timestampNumber(value);
  if (timestamp == null) return invalidDateKey;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return invalidDateKey;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function registerSqliteFunctions(sqlite: SqliteDatabase) {
  sqlite.function(localDateKeyFunctionName, { deterministic: true }, formatLocalDateKey);
}
