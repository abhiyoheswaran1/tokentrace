function escapeCsv(value: unknown) {
  if (value == null) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv<T extends object>(rows: T[]) {
  const [first] = rows;
  if (!first) return "";
  const headers = Object.keys(first) as Array<keyof T & string>;
  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))
  ].join("\n");
}
