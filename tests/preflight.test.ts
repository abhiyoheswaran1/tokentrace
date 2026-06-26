import { describe, expect, it } from "vitest";
import { buildPreflightReport } from "@/src/lib/preflight";

const unsetGuardrails = {
  monthLabel: "June 2026",
  window: {
    from: Date.parse("2026-06-01T00:00:00.000Z"),
    to: Date.parse("2026-07-01T00:00:00.000Z")
  },
  cost: {
    configured: false,
    used: 0,
    limit: null,
    percent: 0,
    remaining: null,
    status: "not-configured" as const
  },
  tokens: {
    configured: false,
    used: 0,
    limit: null,
    percent: 0,
    remaining: null,
    status: "not-configured" as const
  },
  scoped: [],
  anomalies: []
};

const emptyAnomalyReport = {
  generatedAt: "2026-06-26T00:00:00.000Z",
  windowSize: 14,
  thresholds: { notable: 3, high: 4.5, severe: 6 },
  anomalies: [],
  summary: {
    total: 0,
    bySeverity: { notable: 0, high: 0, severe: 0 },
    byMetric: { tokens: 0, cost: 0 },
    latestAnomalyDate: null
  }
};

describe("preflight report", () => {
  it("blocks when no successful local scan exists", () => {
    const report = buildPreflightReport({
      now: new Date("2026-06-26T00:00:00.000Z"),
      doctor: {
        status: "warning",
        headline: "No local scan has run",
        latestScan: { id: null, filesScanned: 0, recordsImported: 0 },
        scanFreshness: { state: "no-scan", description: "No local scan has run yet." },
        pricing: { unknown: 0, interactions: 0 },
        parserCoverage: { parserReviewFiles: 0, failureFiles: 0 },
        recommendations: []
      },
      summary: {
        interactions: 0,
        totalTokens: 0,
        totalCost: 0,
        unknownCostInteractions: 0
      },
      dataConfidence: {
        score: 0,
        grade: "empty",
        drivers: [],
        repairHref: null
      },
      guardrails: unsetGuardrails,
      anomalies: emptyAnomalyReport,
      recommendations: []
    });

    expect(report.decision).toBe("blocked");
    expect(report.headline).toBe("Run a local scan before the next agent session");
    expect(report.nextActions[0]).toMatchObject({
      label: "Run local scan",
      command: ["tokentrace", "scan", "--json"]
    });
    expect(report.privacy).toEqual(
      expect.arrayContaining([
        expect.stringContaining("does not inspect raw prompts")
      ])
    );
  });

  it("warns when cost confidence is incomplete", () => {
    const report = buildPreflightReport({
      now: new Date("2026-06-26T00:00:00.000Z"),
      doctor: {
        status: "warning",
        headline: "Usage imported with cost repairs",
        latestScan: { id: "scan-1", filesScanned: 4, recordsImported: 10 },
        scanFreshness: { state: "fresh", description: "Recent scan history includes a successful import." },
        pricing: { unknown: 3, interactions: 10 },
        parserCoverage: { parserReviewFiles: 0, failureFiles: 0 },
        recommendations: []
      },
      summary: {
        interactions: 10,
        totalTokens: 120_000,
        totalCost: 4.2,
        unknownCostInteractions: 3
      },
      dataConfidence: {
        score: 72,
        grade: "medium",
        drivers: ["Cost coverage: 70% priced."],
        repairHref: "/repair"
      },
      guardrails: {
        ...unsetGuardrails,
        cost: { ...unsetGuardrails.cost, used: 4.2 },
        tokens: { ...unsetGuardrails.tokens, used: 120_000 }
      },
      anomalies: emptyAnomalyReport,
      recommendations: []
    });

    expect(report.decision).toBe("caution");
    expect(report.findings.map((finding) => finding.id)).toContain("unknown-cost");
    expect(report.nextActions.map((action) => action.command)).toContainEqual([
      "tokentrace",
      "repair",
      "--json"
    ]);
  });

  it("proceeds when scan freshness, confidence, guardrails, and anomaly checks are clear", () => {
    const report = buildPreflightReport({
      now: new Date("2026-06-26T00:00:00.000Z"),
      doctor: {
        status: "success",
        headline: "Usage imported and ready",
        latestScan: { id: "scan-1", filesScanned: 4, recordsImported: 10 },
        scanFreshness: { state: "fresh", description: "Recent scan history includes a successful import." },
        pricing: { unknown: 0, interactions: 10 },
        parserCoverage: { parserReviewFiles: 0, failureFiles: 0 },
        recommendations: []
      },
      summary: {
        interactions: 10,
        totalTokens: 90_000,
        totalCost: 3.2,
        unknownCostInteractions: 0
      },
      dataConfidence: {
        score: 94,
        grade: "high",
        drivers: ["Cost coverage: 100% priced."],
        repairHref: null
      },
      guardrails: {
        ...unsetGuardrails,
        cost: { ...unsetGuardrails.cost, used: 3.2 },
        tokens: { ...unsetGuardrails.tokens, used: 90_000 }
      },
      anomalies: emptyAnomalyReport,
      recommendations: []
    });

    expect(report.decision).toBe("proceed");
    expect(report.findings[0]).toMatchObject({
      id: "ready",
      severity: "info"
    });
  });
});
