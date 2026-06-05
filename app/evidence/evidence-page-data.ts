import { dateRangeQueryParams, mergeHrefParams, resolveDateRange } from "@/src/lib/date-range";
import { buildEvidenceTrail, parseEvidenceMetric } from "@/src/lib/evidence-trail";

export type EvidencePageSearchParams = Promise<Record<string, string | string[] | undefined>> | undefined;

export type EvidenceDrilldownAction = {
  label: string;
  detail: string;
  href: string;
};

function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function openedFromLabel(value: string | undefined) {
  if (value === "overview") return "Overview";
  if (value === "sessions") return "Sessions";
  if (value === "repair") return "Repair";
  if (value === "export") return "Evidence pack";
  if (value === "settings") return "Settings";
  return "Direct link";
}

function safeReturnTo(value: string | string[] | undefined, fallback: string) {
  const candidate = firstSearchValue(value);
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  if (candidate.includes("\n") || candidate.includes("\r")) return fallback;
  return candidate;
}

export async function getEvidencePageData(searchParams: EvidencePageSearchParams) {
  const params = (await searchParams) ?? {};
  const range = resolveDateRange(params);
  const metric = parseEvidenceMetric(params?.metric);
  const trail = buildEvidenceTrail({ metric, filters: range.filters });
  const rangeLinkParams = dateRangeQueryParams(range);
  const overviewHref = mergeHrefParams("/", rangeLinkParams);
  const openedFrom = openedFromLabel(firstSearchValue(params.openedFrom));
  const fallbackReturnHref =
    openedFrom === "Sessions"
      ? mergeHrefParams("/sessions", rangeLinkParams)
      : openedFrom === "Repair"
        ? mergeHrefParams("/repair", rangeLinkParams)
        : overviewHref;
  const returnHref = safeReturnTo(params.returnTo, fallbackReturnHref);
  const evidenceContextParams = {
    ...rangeLinkParams,
    openedFrom: firstSearchValue(params.openedFrom) ?? "direct",
    returnTo: returnHref
  };
  const currentEvidenceHref = mergeHrefParams(`/evidence?metric=${trail.metric}`, evidenceContextParams);
  const pricingReturnParams = { returnTo: currentEvidenceHref };
  const periodPreserveParams = {
    metric: trail.metric,
    openedFrom: firstSearchValue(params.openedFrom),
    returnTo: firstSearchValue(params.returnTo)
  };
  const sessionsHref = mergeHrefParams("/sessions", rangeLinkParams);
  const repairHref = mergeHrefParams("/repair", rangeLinkParams);
  const modelRatesHref = mergeHrefParams("/pricing", pricingReturnParams);
  const confidenceTotal = Math.max(1, trail.confidence.exact + trail.confidence.estimated + trail.confidence.unknown);
  const leadingSource = trail.sourceFiles[0];
  const leadingSession = trail.sessions[0];
  const drilldownActions: EvidenceDrilldownAction[] = [
    {
      label: "Top source files",
      detail: "Compare the local files contributing most to this metric.",
      href: "#top-source-files"
    },
    {
      label: "Largest sessions",
      detail: "Open the session evidence table and continue into filtered sessions.",
      href: "#session-evidence"
    },
    {
      label: "Parser confidence",
      detail: "Check whether parser status affects the imported records.",
      href: leadingSource ? mergeHrefParams(leadingSource.parserHref, rangeLinkParams) : "/parser-debug"
    },
    {
      label: "Set model rate",
      detail: "Follow provider model rates or unknown-cost repair when cost needs review.",
      href: leadingSession?.pricingHref
        ? mergeHrefParams(leadingSession.pricingHref, pricingReturnParams)
        : mergeHrefParams("/repair", rangeLinkParams)
    }
  ];

  return {
    range,
    trail,
    rangeLinkParams,
    openedFrom,
    returnHref,
    evidenceContextParams,
    pricingReturnParams,
    periodPreserveParams,
    sessionsHref,
    repairHref,
    modelRatesHref,
    confidenceTotal,
    drilldownActions
  };
}
