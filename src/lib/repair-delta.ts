import type { UnknownCostRepairWorkbench } from "@/src/lib/unknown-cost-repair";

export type RepairDeltaGroup = {
  key: string;
  cause: string;
  model: string;
  sourceFile: string;
  interactions: number;
};

export type RepairDeltaSnapshot = {
  unknownCostInteractions: number;
  groups: RepairDeltaGroup[];
};

export type RepairDelta = {
  beforeUnknownCostInteractions: number;
  afterUnknownCostInteractions: number;
  unknownCostChange: number;
  beforeGroups: number;
  afterGroups: number;
  resolvedGroups: RepairDeltaGroup[];
  stillBlockedGroups: RepairDeltaGroup[];
  remainingCauses: Array<{
    cause: string;
    groups: number;
    interactions: number;
  }>;
  topCause: string | null;
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function snapshotRepairWorkbench(workbench: UnknownCostRepairWorkbench): RepairDeltaSnapshot {
  return {
    unknownCostInteractions: number(workbench.summary.totalInteractions),
    groups: workbench.groups.map((group) => ({
      key: group.key,
      cause: group.cause,
      model: group.model,
      sourceFile: group.sourceFile,
      interactions: number(group.interactions)
    }))
  };
}

export function buildRepairDelta(before: RepairDeltaSnapshot, after: RepairDeltaSnapshot): RepairDelta {
  const afterKeys = new Set(after.groups.map((group) => group.key));
  const resolvedGroups = before.groups.filter((group) => !afterKeys.has(group.key));
  const causeTotals = new Map<string, { cause: string; groups: number; interactions: number }>();

  for (const group of after.groups) {
    const current = causeTotals.get(group.cause) ?? { cause: group.cause, groups: 0, interactions: 0 };
    current.groups += 1;
    current.interactions += number(group.interactions);
    causeTotals.set(group.cause, current);
  }

  const remainingCauses = [...causeTotals.values()].sort((a, b) => (
    b.interactions - a.interactions ||
    b.groups - a.groups ||
    a.cause.localeCompare(b.cause)
  ));

  return {
    beforeUnknownCostInteractions: number(before.unknownCostInteractions),
    afterUnknownCostInteractions: number(after.unknownCostInteractions),
    unknownCostChange: number(after.unknownCostInteractions) - number(before.unknownCostInteractions),
    beforeGroups: before.groups.length,
    afterGroups: after.groups.length,
    resolvedGroups,
    stillBlockedGroups: after.groups,
    remainingCauses,
    topCause: remainingCauses[0]?.cause ?? null
  };
}

export function repairDeltaSummary(delta: RepairDelta | null | undefined) {
  if (!delta) return "";
  const resolvedCount = delta.resolvedGroups.length;
  const groupWord = resolvedCount === 1 ? "group" : "groups";
  const causeCopy = delta.topCause ? ` Top remaining cause: ${delta.topCause}.` : " No remaining repair cause.";
  return `Unknown cost moved from ${delta.beforeUnknownCostInteractions.toLocaleString()} to ${delta.afterUnknownCostInteractions.toLocaleString()} interactions. ${resolvedCount.toLocaleString()} repair ${groupWord} resolved.${causeCopy}`;
}
