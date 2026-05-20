import { dateRangeQueryParams, resolveDateRange } from "@/src/lib/date-range";
import {
  buildUnknownCostRepairWorkbench,
  type UnknownCostRepairWorkbenchGroup
} from "@/src/lib/unknown-cost-repair";

export const REPAIR_PAGE_GROUP_LIMIT = 25;

export type RepairPageSearchParams = Promise<Record<string, string | string[] | undefined>> | undefined;

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getRepairPageData(searchParams: RepairPageSearchParams) {
  const params = (await searchParams) ?? {};
  const range = resolveDateRange(params);
  const rangeLinkParams = dateRangeQueryParams(range);
  const focusKey = firstQueryValue(params.key);
  const workbench = buildUnknownCostRepairWorkbench(range.filters, {
    limit: REPAIR_PAGE_GROUP_LIMIT,
    requiredKey: focusKey
  });
  const focusedGroup: UnknownCostRepairWorkbenchGroup | null = focusKey
    ? workbench.groups.find((group) => group.key === focusKey) ?? null
    : null;

  return {
    range,
    rangeLinkParams,
    focusKey,
    workbench,
    visibleRepairKeys: workbench.groups.map((group) => group.key),
    hasGroups: workbench.totalGroups > 0,
    focusedGroup
  };
}
