import { sqlite } from "@/src/db/client";
import {
  buildScanHealth,
  type ScanConfidenceSummary
} from "@/src/lib/scan-health";
import { timeAnalyticsQuery } from "@/src/lib/analytics-timing";
import {
  number,
  parseJson,
  rows,
  timestampJoinCondition,
  timestampWhere
} from "@/src/lib/analytics-query-helpers";
import type {
  AnalyticsFilters,
  DebugScanFile,
  DebugScanRun,
  ScanTrustData,
  ScanTrustOptions
} from "@/src/lib/analytics-types";

export function getDebugData() {
  return {
    scanRuns: getScanRunRows(50),
    scanFiles: getScanFileRows(500)
  };
}

export function getScanRunRows(limit: number) {
  return rows<DebugScanRun>(
    `SELECT id, started_at AS startedAt, completed_at AS completedAt,
      files_scanned AS filesScanned, records_imported AS recordsImported, warnings, errors
     FROM scan_runs
     ORDER BY started_at DESC, completed_at DESC, id DESC
     LIMIT ?`,
    limit
  ).map((row) => ({
    ...row,
    warnings: parseJson<string[]>(row.warnings, []),
    errors: parseJson<string[]>(row.errors, [])
  }));
}

export function getScanFileRows(limit: number | null) {
  const limitSql = limit == null ? "" : "LIMIT ?";
  const params = limit == null ? [] : [limit];
  return rows<DebugScanFile>(
    `SELECT sf.id, sf.scan_run_id AS scanRunId, sf.path, sf.modified_time AS modifiedTime,
      sf.size_bytes AS sizeBytes, sf.file_hash AS fileHash, sf.parser, sf.status,
      sf.records_imported AS recordsImported, sf.warnings, sf.errors, sf.raw_metadata AS rawMetadata,
      sr.started_at AS scanStartedAt
     FROM scan_files sf
     JOIN scan_runs sr ON sr.id = sf.scan_run_id
     ORDER BY sr.started_at DESC, sr.completed_at DESC, sr.id DESC, sf.path ASC
     ${limitSql}`,
    ...params
  ).map((row) => ({
    ...row,
    warnings: parseJson<string[]>(row.warnings, []),
    errors: parseJson<string[]>(row.errors, []),
    rawMetadata: parseJson<Record<string, unknown>>(row.rawMetadata, {})
  }));
}

export function getScanFileRowsForRunIds(scanRunIds: string[]) {
  if (!scanRunIds.length) return [];
  const placeholders = scanRunIds.map(() => "?").join(", ");
  return rows<DebugScanFile>(
    `SELECT sf.id, sf.scan_run_id AS scanRunId, sf.path, sf.modified_time AS modifiedTime,
      sf.size_bytes AS sizeBytes, sf.file_hash AS fileHash, sf.parser, sf.status,
      sf.records_imported AS recordsImported, sf.warnings, sf.errors, sf.raw_metadata AS rawMetadata,
      sr.started_at AS scanStartedAt
     FROM scan_files sf
     JOIN scan_runs sr ON sr.id = sf.scan_run_id
     WHERE sf.scan_run_id IN (${placeholders})
     ORDER BY sr.started_at DESC, sr.completed_at DESC, sr.id DESC, sf.path ASC`,
    ...scanRunIds
  ).map((row) => ({
    ...row,
    warnings: parseJson<string[]>(row.warnings, []),
    errors: parseJson<string[]>(row.errors, []),
    rawMetadata: parseJson<Record<string, unknown>>(row.rawMetadata, {})
  }));
}

export function getScanConfidenceSummary(filters: AnalyticsFilters = {}): ScanConfidenceSummary {
  const filter = timestampWhere(filters, "i");
  const unknownFilter = timestampJoinCondition(filters, "i");
  const row = sqlite
    .prepare(
      `SELECT
        COUNT(*) AS interactions,
        COALESCE(SUM(CASE WHEN token_confidence = 'exact' THEN 1 ELSE 0 END), 0) AS exactTokenInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'tokenizer estimate' THEN 1 ELSE 0 END), 0) AS tokenizerEstimateInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'simple estimate' THEN 1 ELSE 0 END), 0) AS simpleEstimateInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'high-confidence estimate' THEN 1 ELSE 0 END), 0) AS highConfidenceTokenInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'low-confidence estimate' THEN 1 ELSE 0 END), 0) AS lowConfidenceTokenInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'unknown' THEN 1 ELSE 0 END), 0) AS unknownTokenInteractions,
        COALESCE(SUM(CASE WHEN estimated_tokens = 1 THEN 1 ELSE 0 END), 0) AS estimatedTokenInteractions,
        COALESCE(SUM(CASE WHEN cost IS NOT NULL AND cost_estimated = 0 THEN 1 ELSE 0 END), 0) AS exactCostInteractions,
        COALESCE(SUM(CASE WHEN cost IS NOT NULL AND cost_estimated = 1 THEN 1 ELSE 0 END), 0) AS estimatedCostInteractions,
        COALESCE(SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END), 0) AS unknownCostInteractions
       FROM interactions i INDEXED BY interactions_analytics_cover_idx
       ${filter.sql}`
    )
    .get(...filter.params) as ScanConfidenceSummary;
  const unknownCostCauses = sqlite
    .prepare(
      `WITH unknown_costs AS (
        SELECT
          CASE
            WHEN lower(COALESCE(m.name, 'unknown')) = 'unknown' THEN 'missingModelName'
            WHEN COALESCE(i.total_tokens, 0) <= 0 THEN 'missingTokenCount'
            WHEN lower(COALESCE(m.name, 'unknown')) <> 'unknown'
              AND COALESCE(i.total_tokens, 0) > 0
              AND (m.input_token_price IS NULL OR m.output_token_price IS NULL)
              THEN 'missingPricing'
            ELSE 'other'
          END AS cause
        FROM interactions i INDEXED BY interactions_analytics_cover_idx
        LEFT JOIN models m ON m.id = i.model_id
        WHERE i.cost IS NULL
        ${unknownFilter.sql}
      )
      SELECT
        COALESCE(SUM(CASE WHEN cause = 'missingModelName' THEN 1 ELSE 0 END), 0) AS missingModelName,
        COALESCE(SUM(CASE WHEN cause = 'missingTokenCount' THEN 1 ELSE 0 END), 0) AS missingTokenCount,
        COALESCE(SUM(CASE WHEN cause = 'missingPricing' THEN 1 ELSE 0 END), 0) AS missingPricing,
        COALESCE(SUM(CASE WHEN cause = 'other' THEN 1 ELSE 0 END), 0) AS other
       FROM unknown_costs`
    )
    .get(...unknownFilter.params) as ScanConfidenceSummary["unknownCostCauses"];

  return {
    interactions: number(row.interactions),
    exactTokenInteractions: number(row.exactTokenInteractions),
    tokenizerEstimateInteractions: number(row.tokenizerEstimateInteractions),
    simpleEstimateInteractions: number(row.simpleEstimateInteractions),
    highConfidenceTokenInteractions: number(row.highConfidenceTokenInteractions),
    lowConfidenceTokenInteractions: number(row.lowConfidenceTokenInteractions),
    unknownTokenInteractions: number(row.unknownTokenInteractions),
    estimatedTokenInteractions: number(row.estimatedTokenInteractions),
    exactCostInteractions: number(row.exactCostInteractions),
    estimatedCostInteractions: number(row.estimatedCostInteractions),
    unknownCostInteractions: number(row.unknownCostInteractions),
    unknownCostCauses: {
      missingModelName: number(unknownCostCauses.missingModelName),
      missingPricing: number(unknownCostCauses.missingPricing),
      missingTokenCount: number(unknownCostCauses.missingTokenCount),
      other: number(unknownCostCauses.other)
    }
  };
}

export function getPricedModelCount() {
  const row = sqlite
    .prepare(
      `SELECT COUNT(*) AS count
       FROM models
       WHERE input_token_price IS NOT NULL
         AND output_token_price IS NOT NULL`
    )
    .get() as { count: number };

  return number(row.count);
}

function getScanFileRowsForScope(
  scanRuns: DebugScanRun[],
  scope: NonNullable<ScanTrustOptions["scanFileScope"]>
) {
  if (scope === "all") return getScanFileRows(null);
  if (scope === "none") return [];
  const runIds = scanRuns.slice(0, scope === "latest" ? 1 : 2).map((scanRun) => scanRun.id);
  return getScanFileRowsForRunIds(runIds);
}

export function getScanTrustData(
  filters: AnalyticsFilters = {},
  options: ScanTrustOptions = {}
): ScanTrustData {
  return timeAnalyticsQuery("analytics.scanTrust", () => {
    const scanRuns = getScanRunRows(50);
    const scanFiles = getScanFileRowsForScope(scanRuns, options.scanFileScope ?? "all");
    const confidence = getScanConfidenceSummary(filters);
    return {
      scanRuns,
      scanFiles,
      confidence,
      pricedModelCount: getPricedModelCount(),
      health: buildScanHealth({
        scanRuns,
        scanFiles,
        confidence
      })
    };
  });
}
