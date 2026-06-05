import type { SessionRow } from "@/src/lib/analytics";
import { formatCurrency, formatTokens } from "@/src/lib/format";

export type SessionComparisonRow = {
  sessionId: string;
  title: string;
  project: string;
  tool: string;
  models: string;
  totalTokens: number;
  cost: number | null;
  peerSessions: number;
  peerMedianTokens: number;
  peerMedianCost: number | null;
  tokenMultiple: number;
  costMultiple: number | null;
  severity: "high" | "medium" | "low";
  flag: "token outlier" | "cost outlier";
  evidence: string;
  action: string;
  href: string;
};

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) return 0;
  const lower = sorted[middle - 1];
  return sorted.length % 2 === 0 && lower !== undefined ? (lower + upper) / 2 : upper;
}

function groupKey(session: SessionRow) {
  const primaryModel = session.models.split(",")[0]?.trim() || "unknown";
  return [session.project, session.tool, primaryModel].join("\u0000");
}

function titleFor(session: SessionRow) {
  return session.title?.trim() || `${session.tool} session`;
}

export function buildSessionComparisons(sessions: SessionRow[]): SessionComparisonRow[] {
  const groups = new Map<string, SessionRow[]>();
  sessions.forEach((session) => {
    const key = groupKey(session);
    const group = groups.get(key) ?? [];
    group.push(session);
    groups.set(key, group);
  });

  const rows: SessionComparisonRow[] = [];
  groups.forEach((group) => {
    if (group.length < 3) return;
    const medianTokens = median(group.map((session) => session.totalTokens).filter((value) => value > 0));
    const medianCost = median(group.map((session) => session.cost ?? 0).filter((value) => value > 0));
    if (medianTokens <= 0) return;

    group.forEach((session) => {
      const tokenMultiple = session.totalTokens / medianTokens;
      const costMultiple = medianCost > 0 && session.cost != null ? session.cost / medianCost : null;
      const isTokenOutlier = session.totalTokens >= 5_000 && tokenMultiple >= 3;
      const isCostOutlier = session.cost != null && session.cost >= 1 && costMultiple != null && costMultiple >= 3;
      if (!isTokenOutlier && !isCostOutlier) return;

      const flag = isTokenOutlier ? "token outlier" : "cost outlier";
      const multiple = isTokenOutlier ? tokenMultiple : costMultiple ?? tokenMultiple;
      rows.push({
        sessionId: session.id,
        title: titleFor(session),
        project: session.project,
        tool: session.tool,
        models: session.models,
        totalTokens: session.totalTokens,
        cost: session.cost,
        peerSessions: group.length,
        peerMedianTokens: medianTokens,
        peerMedianCost: medianCost > 0 ? medianCost : null,
        tokenMultiple,
        costMultiple,
        severity: multiple >= 5 ? "high" : "medium",
        flag,
        evidence:
          flag === "token outlier"
            ? `${titleFor(session)} used ${formatTokens(session.totalTokens)}, ${tokenMultiple.toFixed(1)}x its peer median.`
            : `${titleFor(session)} cost ${formatCurrency(session.cost)}, ${(costMultiple ?? 0).toFixed(1)}x its peer median.`,
        action: "Compare this session against similar project, tool, and model sessions.",
        href: session.sourceHref
      });
    });
  });

  const severityRank = { high: 0, medium: 1, low: 2 };
  return rows
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.tokenMultiple - a.tokenMultiple)
    .slice(0, 12);
}
