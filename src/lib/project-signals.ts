import type { ProjectAnalyticsRow, SessionRow } from "@/src/lib/analytics";
import { formatTokens } from "@/src/lib/format";

export type ProjectSignalRow = {
  id: string;
  severity: "high" | "medium" | "low";
  project: string;
  path: string;
  signal: "dominant usage" | "unknown cost" | "estimated tokens" | "model concentration";
  evidence: string;
  action: string;
  href: string;
  metricLabel: string;
  metricValue: string;
};

type ProjectSignalInput = {
  totalTokens: number;
  projects: ProjectAnalyticsRow[];
  sessions: SessionRow[];
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function sessionsHref(project: string) {
  return `/sessions?project=${encodeURIComponent(project)}`;
}

function sessionsByProject(sessions: SessionRow[]) {
  return sessions.reduce<Record<string, SessionRow[]>>((groups, session) => {
    groups[session.project] ??= [];
    groups[session.project].push(session);
    return groups;
  }, {});
}

function dominantProjectSignal(project: ProjectAnalyticsRow, totalTokens: number): ProjectSignalRow | null {
  if (totalTokens <= 0) return null;
  const share = project.totalTokens / totalTokens;
  if (share < 0.5) return null;
  return {
    id: `project-dominance-${project.id}`,
    severity: share >= 0.75 ? "high" : "medium",
    project: project.project,
    path: project.path,
    signal: "dominant usage",
    evidence: `${project.project} accounts for ${Math.round(share * 100)}% of imported tokens.`,
    action: "Review this project's sessions before optimizing smaller projects.",
    href: sessionsHref(project.project),
    metricLabel: "project share",
    metricValue: `${Math.round(share * 100)}%`
  };
}

function unknownCostSignal(project: ProjectAnalyticsRow, sessions: SessionRow[]): ProjectSignalRow | null {
  const count = sessions.filter((session) => session.cost == null).length;
  if (count === 0) return null;
  return {
    id: `project-unknown-cost-${slug(project.project)}`,
    severity: "high",
    project: project.project,
    path: project.path,
    signal: "unknown cost",
    evidence: `${count.toLocaleString()} sessions in ${project.project} still have unknown cost.`,
    action: "Repair model-rate or parser evidence for this project's sessions.",
    href: `/sessions?project=${encodeURIComponent(project.project)}&cost=unknown`,
    metricLabel: "unknown sessions",
    metricValue: count.toLocaleString()
  };
}

function estimatedTokensSignal(project: ProjectAnalyticsRow, sessions: SessionRow[]): ProjectSignalRow | null {
  const count = sessions.filter((session) => session.estimatedTokens || session.tokenConfidence !== "exact").length;
  if (count === 0) return null;
  return {
    id: `project-estimated-tokens-${slug(project.project)}`,
    severity: "medium",
    project: project.project,
    path: project.path,
    signal: "estimated tokens",
    evidence: `${count.toLocaleString()} sessions in ${project.project} use estimated or unknown token confidence.`,
    action: "Review parser confidence before treating this project as exact.",
    href: sessionsHref(project.project),
    metricLabel: "estimated sessions",
    metricValue: count.toLocaleString()
  };
}

function modelConcentrationSignal(project: ProjectAnalyticsRow, sessions: SessionRow[]): ProjectSignalRow | null {
  if (sessions.length < 3) return null;
  const totals = sessions.reduce<Record<string, number>>((summary, session) => {
    const model = session.models.split(",")[0]?.trim() || "unknown";
    summary[model] = (summary[model] ?? 0) + session.totalTokens;
    return summary;
  }, {});
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  if (!top || project.totalTokens <= 0 || top[1] / project.totalTokens < 0.8) return null;
  return {
    id: `project-model-concentration-${slug(project.project)}-${slug(top[0])}`,
    severity: "low",
    project: project.project,
    path: project.path,
    signal: "model concentration",
    evidence: `${top[0]} accounts for ${Math.round((top[1] / project.totalTokens) * 100)}% of ${project.project} tokens.`,
    action: "Review whether this project needs one default model or more intentional model choices.",
    href: sessionsHref(project.project),
    metricLabel: "top model tokens",
    metricValue: formatTokens(top[1])
  };
}

export function buildProjectSignals(input: ProjectSignalInput): ProjectSignalRow[] {
  const groupedSessions = sessionsByProject(input.sessions);
  const signals: ProjectSignalRow[] = [];

  input.projects.forEach((project) => {
    const projectSessions = groupedSessions[project.project] ?? [];
    const projectSignals = [
      dominantProjectSignal(project, input.totalTokens),
      unknownCostSignal(project, projectSessions),
      estimatedTokensSignal(project, projectSessions),
      modelConcentrationSignal(project, projectSessions)
    ].filter((signal): signal is ProjectSignalRow => Boolean(signal));
    signals.push(...projectSignals);
  });

  const severityRank = { high: 0, medium: 1, low: 2 };
  const signalRank: Record<ProjectSignalRow["signal"], number> = {
    "dominant usage": 0,
    "unknown cost": 1,
    "estimated tokens": 2,
    "model concentration": 3
  };
  return signals
    .sort((a, b) => signalRank[a.signal] - signalRank[b.signal] || severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 12);
}
