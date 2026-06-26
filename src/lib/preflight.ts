import type { AnomalyReport, AnomalySeverity } from "@/src/lib/anomaly-detection";
import { detectAnomalies } from "@/src/lib/anomaly-detection";
import type { DataConfidenceScore } from "@/src/lib/data-confidence";
import { formatCurrency, formatTokens, percent } from "@/src/lib/format";
import type { LocalRecommendation } from "@/src/lib/recommendations";
import type { UsageGuardrailProgress } from "@/src/lib/usage-guardrails";

export type PreflightDecision = "proceed" | "caution" | "blocked";
export type PreflightFindingSeverity = "blocker" | "warning" | "info";

export type PreflightFinding = {
  id: string;
  severity: PreflightFindingSeverity;
  title: string;
  evidence: string;
  action: string;
  href: string;
};

export type PreflightNextAction = {
  label: string;
  command: string[];
  reason: string;
  href?: string;
};

export type PreflightReport = {
  schemaVersion: "tokentrace.preflight.v1";
  generatedAt: string;
  decision: PreflightDecision;
  headline: string;
  summary: string;
  metrics: {
    interactions: number;
    totalTokens: number;
    totalCost: number;
    unknownCostInteractions: number;
    confidenceScore: number;
    confidenceGrade: DataConfidenceScore["grade"];
    latestScanId: string | null;
    filesScanned: number;
    recordsImported: number;
    scanFreshness: string;
    guardrailStatus: {
      cost: UsageGuardrailProgress["cost"]["status"];
      tokens: UsageGuardrailProgress["tokens"]["status"];
    };
    anomalies: {
      total: number;
      maxSeverity: AnomalySeverity | null;
      latestDate: string | null;
    };
  };
  findings: PreflightFinding[];
  nextActions: PreflightNextAction[];
  privacy: string[];
};

type DoctorPreflightInput = {
  status: "success" | "warning" | "destructive" | "secondary";
  headline: string;
  latestScan: {
    id: string | null;
    filesScanned: number;
    recordsImported: number;
  };
  scanFreshness: {
    state: "no-scan" | "no-successful-scan" | "fresh" | "stale";
    description: string;
  };
  pricing: {
    unknown: number;
    interactions: number;
  };
  parserCoverage: {
    parserReviewFiles: number;
    failureFiles: number;
  };
  recommendations: Array<{
    id: string;
    severity: "high" | "medium" | "low";
    title: string;
    detail: string;
    action: string;
    href?: string;
  }>;
};

export type PreflightInput = {
  now?: Date;
  doctor: DoctorPreflightInput;
  summary: {
    interactions: number;
    totalTokens: number;
    totalCost: number;
    unknownCostInteractions: number;
  };
  dataConfidence: DataConfidenceScore;
  guardrails: UsageGuardrailProgress;
  anomalies: AnomalyReport;
  recommendations: LocalRecommendation[];
};

function maxAnomalySeverity(report: AnomalyReport): AnomalySeverity | null {
  if (report.summary.bySeverity.severe > 0) return "severe";
  if (report.summary.bySeverity.high > 0) return "high";
  if (report.summary.bySeverity.notable > 0) return "notable";
  return null;
}

function finding(
  id: string,
  severity: PreflightFindingSeverity,
  title: string,
  evidence: string,
  action: string,
  href: string
): PreflightFinding {
  return { id, severity, title, evidence, action, href };
}

function recommendationFinding(item: LocalRecommendation): PreflightFinding {
  return finding(
    `recommendation-${item.id}`,
    item.severity === "high" ? "warning" : "info",
    item.title,
    item.evidence,
    item.action,
    item.href
  );
}

function guardrailFinding(
  kind: "cost" | "tokens",
  metric: UsageGuardrailProgress["cost"],
  monthLabel: string
): PreflightFinding | null {
  if (metric.status !== "warning" && metric.status !== "exceeded") return null;
  const used = kind === "cost" ? formatCurrency(metric.used) : formatTokens(metric.used);
  const limit = kind === "cost" ? formatCurrency(metric.limit) : formatTokens(metric.limit);
  const title = metric.status === "exceeded"
    ? `${kind === "cost" ? "Cost" : "Token"} guardrail exceeded`
    : `${kind === "cost" ? "Cost" : "Token"} guardrail is close`;
  return finding(
    `guardrail-${kind}-${metric.status}`,
    metric.status === "exceeded" ? "blocker" : "warning",
    title,
    `${monthLabel} is at ${used} of ${limit} (${percent(metric.percent)}).`,
    "Review recent sessions before starting another long agent run.",
    "/sessions"
  );
}

function buildFindings(input: PreflightInput): PreflightFinding[] {
  const findings: PreflightFinding[] = [];
  const latestScan = input.doctor.latestScan;

  if (!latestScan.id) {
    findings.push(finding(
      "no-scan",
      "blocker",
      "No local scan has run",
      input.doctor.scanFreshness.description,
      "Run a local scan so preflight can reason from current local usage files.",
      "/settings#scan-controls"
    ));
  } else if (input.doctor.scanFreshness.state === "no-successful-scan") {
    findings.push(finding(
      "no-successful-scan",
      input.summary.interactions === 0 ? "blocker" : "warning",
      "No completed scan has imported usage",
      input.doctor.scanFreshness.description,
      "Inspect discovered files before relying on usage totals.",
      "/discovery"
    ));
  } else if (input.doctor.scanFreshness.state === "stale") {
    findings.push(finding(
      "stale-scan",
      "warning",
      "Scan data is stale",
      input.doctor.scanFreshness.description,
      "Run a fresh local scan before reporting current usage.",
      "/settings#scan-controls"
    ));
  }

  if (input.doctor.pricing.unknown > 0 || input.summary.unknownCostInteractions > 0) {
    findings.push(finding(
      "unknown-cost",
      "warning",
      "Cost confidence is incomplete",
      `${input.summary.unknownCostInteractions.toLocaleString()} interactions have unknown cost.`,
      "Repair missing model names, token counts, or model rates before making cost claims.",
      "/repair"
    ));
  }

  if (input.dataConfidence.grade === "low") {
    findings.push(finding(
      "low-confidence",
      "warning",
      "Data confidence is low",
      `Confidence score is ${input.dataConfidence.score}/100.`,
      input.dataConfidence.repairHref ? "Open the repair queue before starting another run." : "Inspect Scan Health before reporting totals.",
      input.dataConfidence.repairHref ?? "/diagnostics"
    ));
  }

  if (input.doctor.parserCoverage.failureFiles > 0 || input.doctor.parserCoverage.parserReviewFiles > 0) {
    findings.push(finding(
      "parser-review",
      "warning",
      "Some scanned files need parser review",
      `${input.doctor.parserCoverage.parserReviewFiles.toLocaleString()} unsupported files and ${input.doctor.parserCoverage.failureFiles.toLocaleString()} parser failures need review.`,
      "Inspect Discovery and Parsers to separate real usage files from support files.",
      "/discovery"
    ));
  }

  const costGuardrail = guardrailFinding("cost", input.guardrails.cost, input.guardrails.monthLabel);
  const tokenGuardrail = guardrailFinding("tokens", input.guardrails.tokens, input.guardrails.monthLabel);
  if (costGuardrail) findings.push(costGuardrail);
  if (tokenGuardrail) findings.push(tokenGuardrail);

  const anomalySeverity = maxAnomalySeverity(input.anomalies);
  if (anomalySeverity) {
    findings.push(finding(
      "recent-anomalies",
      anomalySeverity === "severe" ? "warning" : "info",
      "Recent usage anomaly detected",
      `${input.anomalies.summary.total.toLocaleString()} local usage anomalies were detected${input.anomalies.summary.latestAnomalyDate ? `, latest on ${input.anomalies.summary.latestAnomalyDate}` : ""}.`,
      "Open evidence or reports before assuming the latest trend is normal.",
      "/evidence"
    ));
  }

  for (const item of input.recommendations.slice(0, 3)) {
    if (findings.some((existing) => existing.title === item.title || existing.href === item.href && item.severity !== "high")) {
      continue;
    }
    findings.push(recommendationFinding(item));
  }

  if (!findings.length) {
    findings.push(finding(
      "ready",
      "info",
      "Local usage data is ready",
      "Scan freshness, cost coverage, guardrails, and anomaly checks do not show a blocking issue.",
      "Proceed with the next agent run, then review Today or run preflight again after new activity.",
      "/"
    ));
  }

  const rank = { blocker: 0, warning: 1, info: 2 };
  return findings.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 8);
}

function decisionFor(findings: PreflightFinding[]): PreflightDecision {
  if (findings.some((finding) => finding.severity === "blocker")) return "blocked";
  if (findings.some((finding) => finding.severity === "warning")) return "caution";
  return "proceed";
}

function headlineFor(decision: PreflightDecision, findings: PreflightFinding[]) {
  if (decision === "blocked") {
    if (findings.some((finding) => finding.id === "no-scan")) return "Run a local scan before the next agent session";
    return "Fix local usage visibility before the next agent session";
  }
  if (decision === "caution") return "Proceed with caution and repair the top evidence gap";
  return "Ready for the next agent session";
}

function summaryFor(input: PreflightInput, decision: PreflightDecision) {
  const cost = formatCurrency(input.summary.totalCost);
  const tokens = formatTokens(input.summary.totalTokens);
  const interactions = input.summary.interactions.toLocaleString();
  const prefix = decision === "proceed" ? "Current local evidence is usable" : "Current local evidence needs attention";
  return `${prefix}: ${interactions} interactions, ${tokens} processed tokens, ${cost} estimated local cost.`;
}

function actionForFinding(finding: PreflightFinding): PreflightNextAction {
  if (finding.id === "no-scan" || finding.id === "stale-scan") {
    return {
      label: "Run local scan",
      command: ["tokentrace", "scan", "--json"],
      reason: finding.action,
      href: finding.href
    };
  }
  if (finding.id === "unknown-cost" || finding.href === "/repair") {
    return {
      label: "Review repair queue",
      command: ["tokentrace", "repair", "--json"],
      reason: finding.action,
      href: "/repair"
    };
  }
  if (finding.href === "/sessions") {
    return {
      label: "Review sessions",
      command: ["tokentrace", "report", "--markdown", "--since", "last-scan"],
      reason: finding.action,
      href: "/sessions"
    };
  }
  if (finding.href === "/evidence") {
    return {
      label: "Open evidence",
      command: ["tokentrace", "evidence", "--json"],
      reason: finding.action,
      href: "/evidence"
    };
  }
  if (finding.href === "/discovery" || finding.href === "/diagnostics") {
    return {
      label: "Run doctor",
      command: ["tokentrace", "doctor", "--json"],
      reason: finding.action,
      href: finding.href
    };
  }
  return {
    label: "Check status",
    command: ["tokentrace", "status", "--json"],
    reason: finding.action,
    href: finding.href
  };
}

function uniqueActions(findings: PreflightFinding[]) {
  const actions: PreflightNextAction[] = [];
  const seen = new Set<string>();
  for (const finding of findings) {
    const action = actionForFinding(finding);
    const key = action.command.join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    actions.push(action);
  }
  return actions.slice(0, 4);
}

export function buildPreflightReport(input: PreflightInput): PreflightReport {
  const findings = buildFindings(input);
  const decision = decisionFor(findings);
  return {
    schemaVersion: "tokentrace.preflight.v1",
    generatedAt: (input.now ?? new Date()).toISOString(),
    decision,
    headline: headlineFor(decision, findings),
    summary: summaryFor(input, decision),
    metrics: {
      interactions: input.summary.interactions,
      totalTokens: input.summary.totalTokens,
      totalCost: input.summary.totalCost,
      unknownCostInteractions: input.summary.unknownCostInteractions,
      confidenceScore: input.dataConfidence.score,
      confidenceGrade: input.dataConfidence.grade,
      latestScanId: input.doctor.latestScan.id,
      filesScanned: input.doctor.latestScan.filesScanned,
      recordsImported: input.doctor.latestScan.recordsImported,
      scanFreshness: input.doctor.scanFreshness.state,
      guardrailStatus: {
        cost: input.guardrails.cost.status,
        tokens: input.guardrails.tokens.status
      },
      anomalies: {
        total: input.anomalies.summary.total,
        maxSeverity: maxAnomalySeverity(input.anomalies),
        latestDate: input.anomalies.summary.latestAnomalyDate
      }
    },
    findings,
    nextActions: uniqueActions(findings),
    privacy: [
      "Preflight reads TokenTrace's local database and does not scan files.",
      "Preflight does not inspect raw prompts, completions, or message bodies.",
      "Preflight does not send telemetry or usage history to a cloud service."
    ]
  };
}

export async function buildPreflightReportSnapshot(now = new Date()): Promise<PreflightReport> {
  const [{ getAnalyticsData }, { buildDoctorReport }, { getDefaultSearchRoots }] = await Promise.all([
    import("@/src/lib/analytics"),
    import("@/src/lib/doctor"),
    import("@/src/ingestion/discovery")
  ]);
  const [data, roots] = await Promise.all([
    Promise.resolve().then(() => getAnalyticsData({}, {
      scanFileScope: "recent",
      sessionDetail: "summary",
      analyticsProfile: "overview"
    })),
    getDefaultSearchRoots()
  ]);
  const doctor = buildDoctorReport({ ...data.scanTrust, roots });
  return buildPreflightReport({
    now,
    doctor,
    summary: data.summary,
    dataConfidence: data.dataConfidence,
    guardrails: data.usageGuardrails,
    anomalies: detectAnomalies(data.trends),
    recommendations: data.recommendations
  });
}

export function renderPreflightText(report: PreflightReport) {
  const lines = [
    `TokenTrace Preflight: ${report.decision.toUpperCase()}`,
    report.headline,
    report.summary,
    "",
    "Findings:"
  ];

  for (const finding of report.findings) {
    lines.push(`- ${finding.severity.toUpperCase()}: ${finding.title}`);
    lines.push(`  ${finding.evidence}`);
    lines.push(`  ${finding.action}`);
  }

  lines.push("", "Next actions:");
  for (const action of report.nextActions) {
    lines.push(`- ${action.label}: ${action.command.join(" ")}`);
  }

  return lines.join("\n");
}
