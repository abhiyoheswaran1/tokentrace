import { getAnalyticsData } from "@/src/lib/analytics";
import { resolveDateRange } from "@/src/lib/date-range";
import {
  findSavedReportByName,
  markSavedReportRan,
  type StoredSavedReport,
  type StoredSavedReportFormat
} from "@/src/lib/saved-reports-store";

export type RunSavedReportOptions = {
  format: StoredSavedReportFormat;
  now?: Date;
};

export function runSavedReportByName(name: string, options: RunSavedReportOptions): string {
  const report = findSavedReportByName(name);
  if (!report) {
    throw new Error(`saved report not found: ${name}`);
  }
  return runSavedReport(report, options);
}

export function runSavedReport(report: StoredSavedReport, options: RunSavedReportOptions): string {
  if (!isFormat(options.format)) {
    throw new Error(`unsupported format: ${options.format}`);
  }

  const now = options.now ?? new Date();
  const range = resolveDateRange(report.params as Record<string, string>, now);
  const data = getAnalyticsData(range.filters);
  const generatedAt = now.toISOString();

  const dataset = {
    summary: data.summary,
    sessionCount: data.sessions.length,
    modelCount: data.models.length,
    toolCount: data.tools.length,
    projectCount: data.projects.length
  };

  markSavedReportRan(report.id);

  if (options.format === "json") {
    return JSON.stringify(
      {
        schemaVersion: "tokentrace.saved-report.v1",
        generatedAt,
        report: {
          id: report.id,
          name: report.name,
          viewType: report.viewType,
          params: report.params
        },
        data: dataset
      },
      null,
      2
    );
  }

  if (options.format === "markdown") {
    return [
      `# ${report.name}`,
      "",
      `Generated: ${generatedAt}`,
      `View: ${report.viewType}`,
      `Period: ${range.label}`,
      "",
      "Parameters:",
      ...Object.entries(report.params).map(([key, value]) => `- ${key}: ${value}`),
      "",
      "## Summary",
      `- Total tokens: ${dataset.summary.totalTokens.toLocaleString()}`,
      `- Total cost: $${dataset.summary.totalCost.toFixed(2)}`,
      `- Sessions imported: ${dataset.summary.sessions.toLocaleString()}`,
      `- Unknown-cost interactions: ${dataset.summary.unknownCostInteractions.toLocaleString()}`,
      "",
      "## Shape",
      `- Sessions: ${dataset.sessionCount.toLocaleString()}`,
      `- Models: ${dataset.modelCount.toLocaleString()}`,
      `- Tools: ${dataset.toolCount.toLocaleString()}`,
      `- Projects: ${dataset.projectCount.toLocaleString()}`
    ].join("\n");
  }

  return renderHtml({
    name: report.name,
    viewType: report.viewType,
    params: report.params,
    generatedAt,
    rangeLabel: range.label,
    summary: dataset.summary,
    sessionCount: dataset.sessionCount,
    modelCount: dataset.modelCount,
    toolCount: dataset.toolCount,
    projectCount: dataset.projectCount
  });
}

function isFormat(value: unknown): value is StoredSavedReportFormat {
  return value === "json" || value === "markdown" || value === "html";
}

function escapeHtml(value: string | number | boolean): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(input: {
  name: string;
  viewType: string;
  params: Record<string, string | number | boolean>;
  generatedAt: string;
  rangeLabel: string;
  summary: { totalTokens: number; totalCost: number; sessions: number; unknownCostInteractions: number };
  sessionCount: number;
  modelCount: number;
  toolCount: number;
  projectCount: number;
}): string {
  const safeName = escapeHtml(input.name);
  const paramRows = Object.entries(input.params)
    .map(
      ([key, value]) =>
        `<tr><th scope="row">${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    `<title>${safeName} – TokenTrace report</title>`,
    "<style>",
    "body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#1f2933;}",
    "h1{margin-bottom:.25rem;}",
    "table{border-collapse:collapse;width:100%;margin:.75rem 0 1.5rem;}",
    "th,td{padding:.4rem .75rem;border:1px solid #e0e6ed;text-align:left;font-size:14px;}",
    "th{background:#f4f6fa;}",
    ".meta{color:#52606d;font-size:14px;}",
    ".kv{margin:.25rem 0;}",
    "</style>",
    "</head>",
    "<body>",
    `<h1>${safeName}</h1>`,
    `<p class="meta">View: ${escapeHtml(input.viewType)} · Period: ${escapeHtml(
      input.rangeLabel
    )} · Generated: ${escapeHtml(input.generatedAt)}</p>`,
    "<h2>Parameters</h2>",
    `<table><tbody>${paramRows || '<tr><td colspan="2">No parameters</td></tr>'}</tbody></table>`,
    "<h2>Summary</h2>",
    `<p class="kv">Total tokens: ${escapeHtml(input.summary.totalTokens.toLocaleString())}</p>`,
    `<p class="kv">Total cost: $${escapeHtml(input.summary.totalCost.toFixed(2))}</p>`,
    `<p class="kv">Sessions imported: ${escapeHtml(input.summary.sessions.toLocaleString())}</p>`,
    `<p class="kv">Unknown-cost interactions: ${escapeHtml(
      input.summary.unknownCostInteractions.toLocaleString()
    )}</p>`,
    "<h2>Shape</h2>",
    `<p class="kv">Sessions: ${escapeHtml(input.sessionCount.toLocaleString())}</p>`,
    `<p class="kv">Models: ${escapeHtml(input.modelCount.toLocaleString())}</p>`,
    `<p class="kv">Tools: ${escapeHtml(input.toolCount.toLocaleString())}</p>`,
    `<p class="kv">Projects: ${escapeHtml(input.projectCount.toLocaleString())}</p>`,
    "</body>",
    "</html>"
  ].join("\n");
}
