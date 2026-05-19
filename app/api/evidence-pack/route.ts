import { NextResponse } from "next/server";
import { getAnalyticsData } from "@/src/lib/analytics";
import { buildEvidencePack, renderEvidencePackMarkdown } from "@/src/lib/evidence-pack";
import { buildEvidenceTrail, parseEvidenceMetric } from "@/src/lib/evidence-trail";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "markdown" ? "markdown" : "json";
  const metric = parseEvidenceMetric(url.searchParams.get("metric"));
  const trail = buildEvidenceTrail({ metric });
  const analytics = getAnalyticsData();
  const pack = buildEvidencePack({
    scope: {
      type: "metric",
      id: metric,
      label: trail.title
    },
    totals: trail.totals,
    confidenceDrivers: [
      `${trail.confidence.exact.toLocaleString()} exact interactions`,
      `${trail.confidence.estimated.toLocaleString()} estimated interactions`,
      `${trail.confidence.unknown.toLocaleString()} unknown interactions`,
      `Data confidence ${analytics.dataConfidence.score}/100`
    ],
    sourceFiles: trail.sourceFiles.map((source) => source.sourceFile),
    parserNotes: trail.sessions
      .map((session) => `${session.parser ?? "unknown parser"}: ${session.parserStatus ?? "unknown status"}`)
      .slice(0, 20),
    modelRateState: trail.sessions
      .map((session) =>
        session.pricingHref ? `${session.model}: model-rate link available` : `${session.model}: no model-rate link`
      )
      .slice(0, 20),
    repairLinks: trail.sessions
      .filter((session) => session.unknownCostInteractions > 0)
      .map((session) => `/repair?source=${encodeURIComponent(session.sourceFile)}`),
    records: trail.sessions.map((session) => ({
      id: session.id,
      role: "session",
      model: session.model,
      sourceFile: session.sourceFile,
      totalTokens: session.totalTokens,
      cost: session.cost,
      interactions: session.interactions
    }))
  });

  if (format === "markdown") {
    return new NextResponse(renderEvidencePackMarkdown(pack), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="tokentrace-${metric}-evidence.md"`
      }
    });
  }

  return NextResponse.json(pack, {
    headers: {
      "content-disposition": `attachment; filename="tokentrace-${metric}-evidence.json"`
    }
  });
}
