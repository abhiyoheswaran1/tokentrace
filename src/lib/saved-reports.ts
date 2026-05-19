import { toCsv } from "@/src/lib/csv";

export type SavedReportFormat = "markdown" | "json" | "csv";

export type SavedReportDefinition = {
  id: string;
  title: string;
  description: string;
  formats: SavedReportFormat[];
  rawContentIncluded: false;
};

export type SavedReportRow = {
  label: string;
  value: string;
  detail: string;
};

const definitions: SavedReportDefinition[] = [
  {
    id: "weekly-usage",
    title: "Weekly Usage Report",
    description: "Tokens, cost, sessions, confidence, and top review movement for the week.",
    formats: ["markdown", "json", "csv"],
    rawContentIncluded: false
  },
  {
    id: "high-cost-sessions",
    title: "High-Cost Sessions Report",
    description: "Largest local sessions by provider-estimated or source-provided cost.",
    formats: ["markdown", "json", "csv"],
    rawContentIncluded: false
  },
  {
    id: "unknown-cost-repair",
    title: "Unknown-Cost Repair Report",
    description: "Grouped model-rate, token, and parser gaps that block cost calculation.",
    formats: ["markdown", "json", "csv"],
    rawContentIncluded: false
  },
  {
    id: "confidence-trends",
    title: "Confidence Trends Report",
    description: "Exact, estimated, unknown, parser, and scan-freshness confidence movement.",
    formats: ["markdown", "json", "csv"],
    rawContentIncluded: false
  },
  {
    id: "guardrail-status",
    title: "Guardrail Status Report",
    description: "Global and scoped local usage guardrails with warning and exceeded states.",
    formats: ["markdown", "json", "csv"],
    rawContentIncluded: false
  },
  {
    id: "source-coverage",
    title: "Source Coverage Report",
    description: "Native, profile-assisted, fallback, and unsupported local source coverage.",
    formats: ["markdown", "json", "csv"],
    rawContentIncluded: false
  }
];

export function buildSavedReportDefinitions() {
  return definitions;
}

function definitionTitle(id: string) {
  return definitions.find((definition) => definition.id === id)?.title ?? "TokenTrace Report";
}

export function renderSavedReport(input: {
  definitionId: string;
  format: SavedReportFormat;
  generatedAt: string;
  rows: SavedReportRow[];
}) {
  if (input.format === "json") {
    return JSON.stringify(
      {
        schemaVersion: "tokentrace.saved-report.v1",
        definitionId: input.definitionId,
        generatedAt: input.generatedAt,
        rawContentIncluded: false,
        rows: input.rows
      },
      null,
      2
    );
  }
  if (input.format === "csv") {
    return toCsv(input.rows);
  }
  return [
    `# ${definitionTitle(input.definitionId)}`,
    "",
    `Generated: ${input.generatedAt}`,
    "Raw content included: no",
    "",
    ...input.rows.map((row) => `- ${row.label}: ${row.value}${row.detail ? ` (${row.detail})` : ""}`)
  ].join("\n");
}
