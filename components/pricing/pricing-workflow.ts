import type { PricingRow } from "@/src/lib/pricing";
import { repairDeltaSummary, type RepairDelta } from "@/src/lib/repair-delta";

export type EditablePricingRow = PricingRow & {
  providerName?: string;
};

export type PricingValidation = {
  valid: boolean;
  errors: string[];
};

export type PricingDuplicate = {
  key: string;
  label: string;
  rowIds: string[];
};

export type PricingSaveResult = {
  costsRecalculated: number;
  interactionsChecked: number;
  unknownCostInteractions: number;
  modelAliasesUpdated: number;
  resolvedRepairItems: number;
  repairDelta?: RepairDelta | null;
};

export type PricingRefreshResult = {
  source: string;
  imported: number;
  updated: number;
  skippedManual: number;
  costsRecalculated: number;
  modelAliasesUpdated: number;
  unknownCostInteractions: number;
  resolvedRepairItems?: number;
  repairDelta?: RepairDelta | null;
  error: string | null;
};

export type ParsedPricingRows = {
  rows: EditablePricingRow[];
  errors: string[];
};

const PRICE_FIELDS: Array<{
  key: keyof Pick<
    EditablePricingRow,
    "inputTokenPrice" | "outputTokenPrice" | "cachedInputTokenPrice" | "cacheWriteTokenPrice"
  >;
  label: string;
}> = [
  { key: "inputTokenPrice", label: "Input price" },
  { key: "outputTokenPrice", label: "Output price" },
  { key: "cachedInputTokenPrice", label: "Cache read price" },
  { key: "cacheWriteTokenPrice", label: "Cache write price" }
];

function cleanText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function normalizeIdentity(value: string | null | undefined) {
  return cleanText(value).toLowerCase();
}

function normalizedPrice(value: number | null | undefined) {
  if (value == null) return null;
  return Number.isFinite(value) ? value : Number.NaN;
}

export function pricingRowKey(row: Pick<EditablePricingRow, "providerId" | "model">) {
  const provider = normalizeIdentity(row.providerId);
  const model = normalizeIdentity(row.model);
  return provider && model ? `${provider}::${model}` : "";
}

export function validatePricingRow(row: EditablePricingRow): PricingValidation {
  const errors: string[] = [];
  if (!cleanText(row.providerId)) errors.push("Provider ID is required.");
  if (!cleanText(row.model)) errors.push("Model name is required.");

  for (const field of PRICE_FIELDS) {
    const price = normalizedPrice(row[field.key]);
    if (Number.isNaN(price) || (price != null && price < 0)) {
      errors.push(`${field.label} must be zero or greater.`);
    }
  }

  if (normalizedPrice(row.inputTokenPrice) == null && normalizedPrice(row.outputTokenPrice) == null) {
    errors.push("Enter at least one input or output price so usage can be priced.");
  }

  const currency = cleanText(row.currency).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) errors.push("Currency should be a 3-letter code such as USD.");

  return { valid: errors.length === 0, errors };
}

export function findDuplicatePricingRows(rows: EditablePricingRow[]): PricingDuplicate[] {
  const groups = new Map<string, PricingDuplicate>();
  for (const row of rows) {
    const key = pricingRowKey(row);
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.rowIds.push(row.id);
      continue;
    }
    groups.set(key, {
      key,
      label: `${cleanText(row.providerId)} / ${cleanText(row.model)}`,
      rowIds: [row.id]
    });
  }
  return [...groups.values()].filter((group) => group.rowIds.length > 1);
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function parseCsvNumber(value: string, lineNumber: number, label: string, errors: string[]) {
  const clean = value.trim();
  if (!clean) return null;
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed < 0) {
    errors.push(`Line ${lineNumber}: ${label} must be a non-negative number or empty.`);
    return null;
  }
  return parsed;
}

export function serializePricingRowsCsv(rows: EditablePricingRow[]) {
  const header = [
    "providerId",
    "providerName",
    "model",
    "inputTokenPrice",
    "outputTokenPrice",
    "cachedInputTokenPrice",
    "cacheWriteTokenPrice",
    "currency"
  ];
  const lines = rows.map((row) =>
    [
      row.providerId,
      row.providerName ?? row.provider,
      row.model,
      row.inputTokenPrice,
      row.outputTokenPrice,
      row.cachedInputTokenPrice,
      row.cacheWriteTokenPrice,
      row.currency
    ].map(csvCell).join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function parsePricingRowsCsv(csv: string): ParsedPricingRows {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const [headerLine] = lines;
  if (headerLine === undefined) return { rows: [], errors: ["Paste CSV rows before importing."] };

  const header = splitCsvLine(headerLine).map((cell) => cell.trim());
  const index = (name: string) => header.findIndex((cell) => cell.toLowerCase() === name.toLowerCase());
  const providerIdIndex = index("providerId");
  const providerNameIndex = index("providerName");
  const providerIndex = index("provider");
  const modelIndex = index("model");
  const currencyIndex = index("currency");
  const errors: string[] = [];

  if (providerIdIndex === -1) errors.push("CSV header must include providerId.");
  if (modelIndex === -1) errors.push("CSV header must include model.");
  if (errors.length) return { rows: [], errors };

  const rows: EditablePricingRow[] = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (line === undefined) continue;
    const lineNumber = lineIndex + 1;
    const cells = splitCsvLine(line);
    const providerId = cells[providerIdIndex]?.trim() ?? "";
    const providerName = (providerNameIndex >= 0 ? cells[providerNameIndex] : cells[providerIndex])?.trim() || providerId;
    const model = cells[modelIndex]?.trim() ?? "";
    const row: EditablePricingRow = {
      id: `csv-${lineIndex}`,
      providerId,
      provider: providerName,
      providerName,
      model,
      inputTokenPrice: parseCsvNumber(cells[index("inputTokenPrice")] ?? "", lineNumber, "inputTokenPrice", errors),
      outputTokenPrice: parseCsvNumber(cells[index("outputTokenPrice")] ?? "", lineNumber, "outputTokenPrice", errors),
      cachedInputTokenPrice: parseCsvNumber(cells[index("cachedInputTokenPrice")] ?? "", lineNumber, "cachedInputTokenPrice", errors),
      cacheWriteTokenPrice: parseCsvNumber(cells[index("cacheWriteTokenPrice")] ?? "", lineNumber, "cacheWriteTokenPrice", errors),
      currency: (currencyIndex >= 0 ? cells[currencyIndex]?.trim() : "") || "USD",
      effectiveFrom: null
    };
    const validation = validatePricingRow(row);
    if (!validation.valid) errors.push(...validation.errors.map((error) => `Line ${lineNumber}: ${error}`));
    rows.push(row);
  }

  return { rows, errors };
}

export function pricingSaveResultCopy(result: PricingSaveResult) {
  const delta = repairDeltaSummary(result.repairDelta);
  return `Price saved. ${result.costsRecalculated.toLocaleString()} interactions repriced, ${result.resolvedRepairItems.toLocaleString()} repair items resolved, ${result.unknownCostInteractions.toLocaleString()} unknown-cost interactions still need rate or parser review.${delta ? ` ${delta}` : ""}`;
}

export function pricingRefreshResultCopy(result: PricingRefreshResult) {
  if (result.error) return "Remote refresh failed; bundled prices were used.";
  const delta = repairDeltaSummary(result.repairDelta);
  const resolved = result.resolvedRepairItems == null ? "" : ` ${result.resolvedRepairItems.toLocaleString()} repair items resolved.`;
  return `Prices refreshed. ${result.imported.toLocaleString()} added, ${result.updated.toLocaleString()} updated, ${result.skippedManual.toLocaleString()} manual rows kept. ${result.costsRecalculated.toLocaleString()} imported interactions repriced.${resolved}${delta ? ` ${delta}` : ""}`;
}
