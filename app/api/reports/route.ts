import { NextResponse } from "next/server";
import { getAnalyticsData, getScanTrustData } from "@/src/lib/analytics";
import { buildSourceCatalog, summarizeSourceCoverage } from "@/src/lib/source-catalog";
import { buildSavedReportDefinitions, renderSavedReport, type SavedReportFormat } from "@/src/lib/saved-reports";

export const dynamic = "force-dynamic";

function reportRows(definitionId: string) {
  const analytics = getAnalyticsData();
  const trust = getScanTrustData();
  const sourceCoverage = summarizeSourceCoverage(trust.scanFiles);
  if (definitionId === "source-coverage") {
    return [
      { label: "Native files", value: sourceCoverage.nativeFiles.toLocaleString(), detail: "First-class adapters" },
      { label: "Profile-assisted files", value: sourceCoverage.profileAssistedFiles.toLocaleString(), detail: "Import profile or generic parser" },
      { label: "Fallback files", value: sourceCoverage.fallbackFiles.toLocaleString(), detail: "Low-confidence text or generic fallback" },
      { label: "Imported records", value: sourceCoverage.importedRecords.toLocaleString(), detail: "Records imported from scan files" }
    ];
  }
  if (definitionId === "guardrail-status") {
    return [
      { label: "Cost guardrail", value: analytics.usageGuardrails.cost.status, detail: `${analytics.usageGuardrails.cost.used.toFixed(2)} used` },
      { label: "Token guardrail", value: analytics.usageGuardrails.tokens.status, detail: `${analytics.usageGuardrails.tokens.used.toLocaleString()} tokens used` },
      { label: "Scoped guardrails", value: analytics.usageGuardrails.scoped.length.toLocaleString(), detail: "Project/model/tool limits" },
      { label: "Anomalies", value: analytics.usageGuardrails.anomalies.length.toLocaleString(), detail: "Warning or exceeded scoped guardrails" }
    ];
  }
  return [
    { label: "Tokens", value: analytics.summary.totalTokens.toLocaleString(), detail: "Selected local data" },
    { label: "Cost", value: `$${analytics.summary.totalCost.toFixed(2)}`, detail: "Provider estimate or source cost" },
    { label: "Sessions", value: analytics.summary.sessions.toLocaleString(), detail: "Imported sessions" },
    { label: "Unknown cost", value: analytics.summary.unknownCostInteractions.toLocaleString(), detail: "Repair queue candidates" },
    { label: "Source catalog", value: buildSourceCatalog().entries.length.toLocaleString(), detail: "Known import paths" }
  ];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const definitions = buildSavedReportDefinitions();
  const definitionId = url.searchParams.get("type") ?? "weekly-usage";
  const definition = definitions.find((item) => item.id === definitionId);
  if (!definition) return NextResponse.json({ error: "Unknown report type." }, { status: 400 });
  const format = (url.searchParams.get("format") ?? "json") as SavedReportFormat;
  if (!definition.formats.includes(format)) {
    return NextResponse.json({ error: "Unsupported report format." }, { status: 400 });
  }
  const rendered = renderSavedReport({
    definitionId,
    format,
    generatedAt: new Date().toISOString(),
    rows: reportRows(definitionId)
  });
  if (format === "json") {
    return new NextResponse(rendered, {
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
  if (format === "csv") {
    return new NextResponse(rendered, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="tokentrace-${definitionId}.csv"`
      }
    });
  }
  return new NextResponse(rendered, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="tokentrace-${definitionId}.md"`
    }
  });
}
