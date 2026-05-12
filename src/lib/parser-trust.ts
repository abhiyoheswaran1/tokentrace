import { sqlite } from "@/src/db/client";
import type { ScanHealthFile } from "@/src/lib/scan-health";

export type ParserTrustStatusBucket = "imported" | "importedWithErrors" | "ignored" | "unsupported" | "failed" | "duplicate";

export type ParserTrustSourceFamily = "Claude" | "Codex" | "OpenAI" | "Generic" | "Unknown";

export type ParserTrustRow = {
  parser: string;
  version: string;
  sourceFamily: ParserTrustSourceFamily;
  imported: number;
  importedWithErrors: number;
  ignored: number;
  unsupported: number;
  failed: number;
  duplicate: number;
  recordsImported: number;
  latestReason: string;
};

export type ParserTrustReport = {
  summary: Record<ParserTrustStatusBucket, number>;
  parsers: ParserTrustRow[];
};

type ParserTrustInputFile = {
  path: string;
  parser: string | null;
  status: string;
  recordsImported: number;
  rawMetadata: Record<string, unknown> | string | null;
};

function emptySummary(): ParserTrustReport["summary"] {
  return {
    imported: 0,
    importedWithErrors: 0,
    ignored: 0,
    unsupported: 0,
    failed: 0,
    duplicate: 0
  };
}

function sourceFamily(filePath: string): ParserTrustSourceFamily {
  if (filePath.includes("/.claude/")) return "Claude";
  if (filePath.includes("/.codex/")) return "Codex";
  if (filePath.includes("/.openai/")) return "OpenAI";
  if (filePath.includes("/.ai/")) return "Generic";
  return "Unknown";
}

function statusBucket(status: string): ParserTrustStatusBucket {
  if (status === "imported") return "imported";
  if (status === "imported_with_errors") return "importedWithErrors";
  if (status === "ignored_non_usage") return "ignored";
  if (status === "skipped_unknown") return "unsupported";
  if (status === "skipped_duplicate") return "duplicate";
  if (status === "failed") return "failed";
  return "unsupported";
}

function parseMetadata(rawMetadata: ParserTrustInputFile["rawMetadata"]): Record<string, unknown> {
  if (rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata)) return rawMetadata;
  if (typeof rawMetadata !== "string") return {};
  try {
    const parsed = JSON.parse(rawMetadata);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function metadataText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parserVersion(metadata: Record<string, unknown>) {
  const parser = metadata.parser;
  const nestedVersion = parser && typeof parser === "object" && !Array.isArray(parser)
    ? (parser as Record<string, unknown>).version
    : undefined;
  return String(nestedVersion ?? metadata.parserVersion ?? metadata.version ?? "unknown");
}

export function buildParserTrustReportFromFiles(files: ParserTrustInputFile[]): ParserTrustReport {
  const summary = emptySummary();
  const rows = new Map<string, ParserTrustRow>();

  for (const file of files) {
    const metadata = parseMetadata(file.rawMetadata);
    const parser = file.parser ?? "none";
    const version = parserVersion(metadata);
    const family = sourceFamily(file.path);
    const bucket = statusBucket(file.status);
    const key = `${parser}:${version}:${family}`;
    const row = rows.get(key) ?? {
      parser,
      version,
      sourceFamily: family,
      imported: 0,
      importedWithErrors: 0,
      ignored: 0,
      unsupported: 0,
      failed: 0,
      duplicate: 0,
      recordsImported: 0,
      latestReason: ""
    };

    summary[bucket] += 1;
    row[bucket] += 1;
    row.recordsImported += Number(file.recordsImported) || 0;
    row.latestReason = metadataText(metadata.reason) || metadataText(metadata.ignoreReason) || row.latestReason;
    rows.set(key, row);
  }

  return {
    summary,
    parsers: Array.from(rows.values()).sort((a, b) => (
      b.recordsImported - a.recordsImported
      || b.imported - a.imported
      || a.parser.localeCompare(b.parser)
      || a.sourceFamily.localeCompare(b.sourceFamily)
      || a.version.localeCompare(b.version)
    ))
  };
}

export function buildParserTrustReportForScanFiles(scanFiles: ScanHealthFile[], latestScanId: string | null): ParserTrustReport {
  if (!latestScanId) return { summary: emptySummary(), parsers: [] };
  return buildParserTrustReportFromFiles(scanFiles.filter((file) => file.scanRunId === latestScanId));
}

export function buildParserTrustReport(): ParserTrustReport {
  const latest = sqlite.prepare(
    "SELECT id FROM scan_runs ORDER BY started_at DESC, completed_at DESC, id DESC LIMIT 1"
  ).get() as { id: string } | undefined;

  if (!latest) {
    return { summary: emptySummary(), parsers: [] };
  }

  const files = sqlite.prepare(
    `SELECT path, parser, status, records_imported AS recordsImported, raw_metadata AS rawMetadata
     FROM scan_files
     WHERE scan_run_id = ?`
  ).all(latest.id) as Array<{
    path: string;
    parser: string | null;
    status: string;
    recordsImported: number;
    rawMetadata: string | null;
  }>;

  return buildParserTrustReportFromFiles(files);
}
