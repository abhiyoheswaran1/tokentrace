import type { AnalyticsFilters } from "@/src/lib/analytics";
import {
  evidenceHref,
  parseEvidenceMetric,
  type EvidenceMetric
} from "@/src/lib/evidence/metrics";
import {
  mapEvidenceTrail,
  type EvidenceTrail,
  type EvidenceTrailSession
} from "@/src/lib/evidence/mapping";
import { fetchEvidenceTrailRows } from "@/src/lib/evidence/query";

export type { EvidenceMetric } from "@/src/lib/evidence/metrics";
export type {
  EvidenceTrail,
  EvidenceTrailSession
} from "@/src/lib/evidence/mapping";
export {
  evidenceHref,
  parseEvidenceMetric
} from "@/src/lib/evidence/metrics";

export function buildEvidenceTrail(input: {
  metric: EvidenceMetric;
  filters?: AnalyticsFilters;
}): EvidenceTrail {
  return mapEvidenceTrail({
    metric: input.metric,
    rows: fetchEvidenceTrailRows({
      metric: input.metric,
      filters: input.filters
    })
  });
}
