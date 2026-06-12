import { NextResponse } from "next/server";
import { buildMetricEvidencePack, renderEvidencePackMarkdown } from "@/src/lib/evidence-pack";
import { parseEvidenceMetric } from "@/src/lib/evidence-trail";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "markdown" ? "markdown" : "json";
  const metric = parseEvidenceMetric(url.searchParams.get("metric"));
  const pack = buildMetricEvidencePack({ metric });

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
